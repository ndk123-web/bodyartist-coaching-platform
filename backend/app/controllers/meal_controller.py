import os
import uuid
import tempfile
import traceback
import io
from PIL import Image
import cloudinary.uploader
from sqlalchemy.orm import Session
from uuid import UUID
from backend.app.config.cloudinary import cloudinary
from backend.app.utils.logmeal import LogMeal
from backend.app.repositories.meal_repository import MealRepository
from backend.app.models.meal_logs import MealLog
from backend.app.models.vision_api_call import VisionApiCalls

class MealController:
    @staticmethod
    def upload_and_detect(db: Session, file_content: bytes, athlete_id: str):
        print(f"\n[MEAL UPLOAD] Started processing upload for athlete: {athlete_id}")
        print(f"[MEAL UPLOAD] Received file size: {len(file_content)} bytes")
        logmeal = LogMeal()
        athlete_uuid = UUID(athlete_id)

        # 1. Save file locally as a temporary file to send to LogMeal
        temp_dir = os.path.join(os.getcwd(), "temp_uploads")
        os.makedirs(temp_dir, exist_ok=True)
        temp_file_path = os.path.join(temp_dir, f"{uuid.uuid4()}.jpg")
        print(f"[MEAL UPLOAD] Saving temp image to: {temp_file_path}")
        
        try:
            try:
                # Open with PIL and convert to JPEG format to normalize formats (PNG/WebP -> JPEG)
                img = Image.open(io.BytesIO(file_content))
                img.convert("RGB").save(temp_file_path, "JPEG")
                print(f"[MEAL UPLOAD] Successfully converted image to JPEG using PIL")
            except Exception as img_err:
                print(f"[MEAL UPLOAD] PIL conversion failed, writing raw bytes directly: {img_err}")
                with open(temp_file_path, "wb") as f:
                    f.write(file_content)

            # 2. Upload to Cloudinary
            print(f"[MEAL UPLOAD] Uploading to Cloudinary...")
            try:
                cloudinary_result = cloudinary.uploader.upload(temp_file_path, folder="meals")
                photo_url = cloudinary_result.get("secure_url")
                print(f"[LIFECYCLE LOG] 3. Cloudinary upload successful. URL: {photo_url}")
            except Exception as ce:
                print(f"[MEAL UPLOAD] Cloudinary upload failed. Error: {ce}")
                # Mock cloudinary url if using placeholder
                if "your_api_key" in os.getenv("CLOUDINARY_URL", "") or not os.getenv("CLOUDINARY_URL"):
                    photo_url = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                    print(f"[MEAL UPLOAD] Using mock photo URL: {photo_url}")
                else:
                    raise ce

            # 3. Call LogMeal to detect dishes
            print(f"[MEAL UPLOAD] Calling LogMeal image recognition...")
            
            # Remove try-except mock fallback so real API errors propagate
            detection_result = logmeal.detectMeal(temp_file_path)
            print(f"[LIFECYCLE LOG] 4. LogMeal response received: {detection_result.get('imageId')}")

            image_id = detection_result.get("imageId")
            recognition_results = detection_result.get("recognition_results")
            
            # If recognition_results is not at root, check inside segmentation_results
            if not recognition_results and "segmentation_results" in detection_result:
                seg_results = detection_result["segmentation_results"]
                if seg_results and isinstance(seg_results, list):
                    for seg in seg_results:
                        if "recognition_results" in seg and seg["recognition_results"]:
                            recognition_results = seg["recognition_results"]
                            print(f"[MEAL UPLOAD] Found recognition_results nested inside segmentation_results")
                            break
            
            if not recognition_results:
                recognition_results = []
                
            print(f"[MEAL UPLOAD] LogMeal Image ID: {image_id}")
            print(f"[MEAL UPLOAD] Number of recognition results: {len(recognition_results)}")
            
            if not recognition_results:
                raise Exception("No dishes recognized in the image.")
                
            top_dish = recognition_results[0]
            dish_id = top_dish.get("id", 0)
            food_name = top_dish.get("name")
            if not food_name:
                raise Exception("Dish name not found in recognition results.")
            confidence_score = top_dish.get("prob", 0.0)
            print(f"[MEAL UPLOAD] Top detected dish: {food_name} (ID: {dish_id}, Prob: {confidence_score})")

            # 4. Fetch nutritional info for the detected meal image
            nutrition_result = {}
            if image_id:
                try:
                    # Optional: confirm the top dish first if required by the API
                    try:
                        print(f"[MEAL UPLOAD] Confirming dish ID {dish_id} for image ID {image_id}...")
                        logmeal.confirmDish(image_id, dish_id)
                        print(f"[MEAL UPLOAD] Dish confirmation successful")
                    except Exception as confirm_err:
                        print(f"[MEAL UPLOAD] Warning: Dish confirmation failed: {confirm_err}")
                        traceback.print_exc()
                    
                    print(f"[MEAL UPLOAD] Fetching nutritional info for image ID {image_id}...")
                    nutrition_result = logmeal.getNutritionalInfo(image_id)
                    print(f"[MEAL UPLOAD] Nutritional info response received")
                except Exception as e:
                    print(f"[MEAL UPLOAD] Warning: Failed to fetch nutritional info: {e}")
                    traceback.print_exc()

            # 5. Extract macronutrients and micronutrients from LogMeal response
            nutrients = {}
            nutri_info = {}
            
            # Navigate to nutritional_info
            if "nutrition" in nutrition_result:
                nutri_info = nutrition_result["nutrition"].get("nutritional_info", {})
            elif "nutritional_info" in nutrition_result:
                nutri_info = nutrition_result.get("nutritional_info", {})
            else:
                nutri_info = nutrition_result

            # Navigate to nutrients dictionary
            if "totalNutrients" in nutri_info:
                nutrients = nutri_info.get("totalNutrients", {})
            elif "nutrients" in nutri_info:
                nutrients = nutri_info.get("nutrients", {})
            elif "totalNutrients" in nutrition_result:
                nutrients = nutrition_result.get("totalNutrients", {})
            elif "nutrients" in nutrition_result:
                nutrients = nutrition_result.get("nutrients", {})

            def get_val(code):
                n = nutrients.get(code, {})
                if isinstance(n, dict):
                    # Check "quantity" first (from totalNutrients), then fallback to "value"
                    if "quantity" in n:
                        return float(n["quantity"])
                    return float(n.get("value", 0.0))
                return 0.0

            calories = get_val("ENERC_KCAL")
            # Fallback to direct calories key in nutritional_info if ENERC_KCAL is missing/0
            if calories == 0.0 and nutri_info and "calories" in nutri_info:
                try:
                    calories = float(nutri_info["calories"])
                except Exception:
                    pass

            protein = get_val("PROCNT")
            carbs = get_val("CHOCDF")
            fat = get_val("FAT")

            micronutrients = {
                "fiber": get_val("FIBTG"),
                "iron": get_val("FE"),
                "calcium": get_val("CA"),
                "potassium": get_val("K"),
                "magnesium": get_val("MG"),
                "vitaminB12": get_val("VITB12")
            }

            # 6. Log successful call in vision_api_calls
            print(f"[MEAL UPLOAD] Recording successful API call to vision_api_calls table...")
            MealRepository.create_vision_api_call(
                db=db,
                athlete_id=athlete_uuid,
                api_provider="LogMeal",
                status="success",
                retry_count=0,
                cost=0.03 # Standard cost per successful analysis
            )
            print(f"[MEAL UPLOAD] Finished processing. Returning response.")

            return {
                "photo_url": photo_url,
                "imageId": image_id,
                "dish_id": dish_id,
                "food_name": food_name,
                "confidence_score": confidence_score,
                "estimated_calories": calories,
                "estimated_protein": protein,
                "estimated_carbs": carbs,
                "estimated_fat": fat,
                "estimated_micronutrients": micronutrients,
                "raw_vision_response": {
                    "detection": detection_result,
                    "nutrition": nutrition_result
                }
            }

        finally:
            # Cleanup temporary file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)

    @staticmethod
    def confirm_and_save(
        db: Session,
        athlete_id: str,
        food_name: str,
        photo_url: str,
        raw_vision_response: dict,
        confidence_score: float,
        estimated_calories: float,
        estimated_protein: float,
        estimated_carbs: float,
        estimated_fat: float,
        estimated_micronutrients: dict,
        serving_size: float = None,
        is_edited: bool = False
    ) -> MealLog:
        athlete_uuid = UUID(athlete_id)
        
        print(f"[LIFECYCLE LOG] 5. Saving meal confirmation to DB. Athlete: {athlete_id}, Food: {food_name}")
        # Save to DB
        saved_meal = MealRepository.create_meal_log(
            db=db,
            athlete_id=athlete_uuid,
            food_name=food_name,
            photo_url=photo_url,
            raw_vision_response=raw_vision_response,
            confidence_score=confidence_score,
            estimated_calories=estimated_calories,
            estimated_protein=estimated_protein,
            estimated_carbs=estimated_carbs,
            estimated_fat=estimated_fat,
            estimated_micronutrients=estimated_micronutrients,
            serving_size=serving_size,
            is_edited=is_edited
        )
        print(f"[LIFECYCLE LOG] 6. DB save response: MealLog ID {saved_meal.id} created successfully.")
        return saved_meal
