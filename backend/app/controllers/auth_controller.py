from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.repositories.user_repository import UserRepository
from backend.app.utils.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token
)

class AuthController:
    @staticmethod
    def coach_signup(db: Session, name: str, email: str, password: str, invite_code: str):
        if invite_code != "ARTIST2026":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Coach Invite Code. Registration restricted."
            )
        
        # Check if email exists
        existing_user = UserRepository.get_by_email(db, email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address already registered."
            )
        
        # Create user
        hashed_password = get_password_hash(password)
        user = UserRepository.create_user(
            db=db,
            name=name,
            email=email,
            role="coach",
            password_hash=hashed_password
        )
        
        # Generate tokens
        user_data = {"sub": str(user.id), "email": user.email, "role": user.role}
        access_token = create_access_token(user_data)
        refresh_token = create_refresh_token(user_data)
        
        return {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "accessToken": access_token,
            "refreshToken": refresh_token
        }

    @staticmethod
    def signin(db: Session, email: str, password: str, expected_role: str):
        user = UserRepository.get_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )
        
        if user.role != expected_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. User role mismatch."
            )
        
        if not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )
        
        # Generate tokens
        user_data = {"sub": str(user.id), "email": user.email, "role": user.role}
        access_token = create_access_token(user_data)
        refresh_token = create_refresh_token(user_data)
        
        return {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "accessToken": access_token,
            "refreshToken": refresh_token
        }

    @staticmethod
    def refresh_token(db: Session, refresh_token: str):
        payload = verify_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token."
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload."
            )
            
        user = UserRepository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )
            
        # Issue new access token
        user_data = {"sub": str(user.id), "email": user.email, "role": user.role}
        access_token = create_access_token(user_data)
        
        return {
            "accessToken": access_token
        }

    @staticmethod
    def athlete_provision(db: Session, name: str, email: str, password: str, coach_id: str):
        # Check if email exists
        existing_user = UserRepository.get_by_email(db, email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address already registered."
            )
        
        from uuid import UUID
        try:
            coach_uuid = UUID(coach_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid coach ID format."
            )
            
        hashed_password = get_password_hash(password)
        user = UserRepository.create_user(
            db=db,
            name=name,
            email=email,
            role="athlete",
            password_hash=hashed_password,
            coach_id=coach_uuid
        )
        
        return {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "coachId": str(user.coach_id)
        }

    @staticmethod
    def get_coach_athletes(db: Session, coach_id: str):
        from uuid import UUID
        try:
            coach_uuid = UUID(coach_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid coach ID format."
            )
        
        athletes = UserRepository.get_athletes_by_coach(db, coach_uuid)
        
        # Format output to match frontend expectations using real dashboard service data
        from backend.app.services.dashboard_service import DashboardService
        dashboard_service = DashboardService(db)
        
        result = []
        for athlete in athletes:
            # Use dashboard service to get accurate real-time data
            detail = dashboard_service.get_coach_athlete_detail(athlete.id)
            result.append({
                "id": str(detail.id),
                "name": detail.name,
                "email": detail.email,
                "score": detail.score,
                "streak": detail.streak,
                "weight": detail.weight,
                "waterLog": detail.waterLog,
                "waterTarget": detail.waterTarget,
                "mealsLogged": detail.mealsLogged,
                "mealsTarget": detail.mealsTarget,
                "status": detail.status,
                "supplements": [s.model_dump() for s in detail.supplements],
                "mealHistory": [m.model_dump() for m in detail.mealHistory]
            })
        return result

    @staticmethod
    def reset_password(db: Session, athlete_id: str, new_password: str):
        from uuid import UUID
        try:
            athlete_uuid = UUID(athlete_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid athlete ID format."
            )
            
        athlete = UserRepository.get_by_id(db, athlete_uuid)
        if not athlete or athlete.role != "athlete":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Athlete not found."
            )
            
        hashed_password = get_password_hash(new_password)
        UserRepository.update_password(db, athlete, hashed_password)
        
        return {
            "message": "Password successfully reset.",
            "athleteId": str(athlete.id)
        }
