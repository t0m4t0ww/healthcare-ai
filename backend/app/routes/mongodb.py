from app.extensions import mongo_db

users_collection = mongo_db["users"]
xray_collection = mongo_db["xray_results"]
notes_collection = mongo_db["doctor_notes"]
