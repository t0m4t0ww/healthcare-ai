from flask import Blueprint, jsonify
from app.extensions import mongo_db
from app.extensions import mongo_db
surgery_bp = Blueprint("surgery", __name__)

@surgery_bp.route("/surgeries", methods=["GET"])
def get_surgeries():
    surgeries = mongo_db.surgeries.find()
    result = []
    for s in surgeries:
        result.append({
            "_id": str(s.get("_id")),
            "patient_name": s.get("patient_name"),
            "date": s.get("date"),
            "type": s.get("type"),
            "note": s.get("note", "")
        })
    return jsonify(result)
