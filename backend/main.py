from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.routes.auth_routes import router as auth_router
from backend.app.routes.meal_routes import router as meal_router
from backend.app.routes import diet_plan_routes
from backend.app.routes import water_log_routes
from backend.app.routes import supplement_log_routes
from backend.app.routes import workout_log_routes
from backend.app.routes import step_log_routes
from backend.app.routes import weight_log_routes

from backend.app.routes import athlete_target_routes
from backend.app.routes import meal_history_routes
from backend.app.routes import dashboard_routes
from backend.app.routes import history_timeline_routes

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://localhost:5173"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"Hello": "World"}

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(meal_router, prefix="/api/meals", tags=["meals"])

app.include_router(diet_plan_routes.router)
app.include_router(water_log_routes.router)
app.include_router(supplement_log_routes.router)
app.include_router(workout_log_routes.router)
app.include_router(step_log_routes.router)
app.include_router(weight_log_routes.router)

app.include_router(athlete_target_routes.router)
app.include_router(meal_history_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(history_timeline_routes.router)

# Run the app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)
