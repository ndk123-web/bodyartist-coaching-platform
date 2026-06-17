from dotenv import load_dotenv

from backend.app.config.database import engine, Base
from backend.app.models.users_model import User
from backend.app.models.meal_log_model import MealLog
from backend.app.models.vision_api_call import VisionApiCalls

load_dotenv()

def test_database_connection():
    print("[INFO] Connecting to local Postgres and creating tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("[SUCCESS] Tables successfully created/verified in your database!")

    except Exception as e:
        print("[ERROR] Error connecting to database or inserting data:")
        print(str(e))

if __name__ == "__main__":
    test_database_connection()