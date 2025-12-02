#
from flask import Blueprint
from app.utils.responses import ok
from app.extensions import mongo_db
health_bp = Blueprint("health_bp", __name__)

@health_bp.route("/health", methods=["GET"])
def health():
    return ok({"status": "ok"})
