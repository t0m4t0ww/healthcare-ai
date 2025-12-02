# 
from flask import jsonify

class APIError(Exception):
    status_code = 400
    message = "Bad Request"

    def __init__(self, message=None, status_code=None):
        super().__init__(message)
        if message:
            self.message = message
        if status_code:
            self.status_code = status_code

def register_error_handlers(app):
    @app.errorhandler(APIError)
    def handle_api_error(err: APIError):
        return jsonify({"status": "error", "code": err.status_code, "message": err.message}), err.status_code

    @app.errorhandler(404)
    def handle_404(_):
        return jsonify({"status":"error","code":404,"message":"Endpoint không tồn tại."}), 404

    @app.errorhandler(405)
    def handle_405(_):
        return jsonify({"status":"error","code":405,"message":"Method không được hỗ trợ."}), 405

    @app.errorhandler(500)
    def handle_500(e):
        return jsonify({"status":"error","code":500,"message":"Lỗi hệ thống."}), 500
