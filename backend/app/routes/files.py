# backend/app/routes/files.py
from flask import Blueprint, request, jsonify, send_file, current_app, g
from werkzeug.utils import secure_filename
import os
import jwt
from datetime import datetime
from bson import ObjectId
from app.middlewares.auth import auth_required, get_current_user
from app.extensions import mongo_db
from app.utils.responses import success, fail
from app.config import JWT_SECRET_KEY
from app.services.image_optimizer import convert_to_webp, should_optimize_image
from app.services.redis_cache import cache

files_bp = Blueprint("files", __name__)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'doc', 'docx', 'txt'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Image extensions that can be optimized
IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@files_bp.route("/upload", methods=["POST", "OPTIONS"])
def upload_file():
    """
    Upload file (image, PDF, document)
    Required: multipart/form-data với field 'file'
    Optional: metadata (JSON string)
    """
    # Handle OPTIONS preflight (before auth)
    if request.method == "OPTIONS":
        return "", 204
    
    # Manual auth check for POST (to avoid blocking OPTIONS)
    token = None
    auth_header = request.headers.get('Authorization')
    
    if auth_header:
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            return fail("Token format không hợp lệ", 401)
    
    if not token:
        return fail("Thiếu token xác thực", 401)
    
    try:
        # Decode JWT token
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id') or payload.get('sub')
        role = payload.get('role')
        
        if not user_id or not role:
            return fail("Token không hợp lệ", 401)
        
        # Store user in g
        g.current_user = {
            'user_id': str(user_id),
            'email': payload.get('email'),
            'role': role,
            'payload': payload
        }
        
        user = g.current_user
        
    except jwt.ExpiredSignatureError:
        return fail("Token đã hết hạn", 401)
    except jwt.InvalidTokenError:
        return fail("Token không hợp lệ", 401)
    except Exception as e:
        print(f"❌ Auth error: {e}")
        return fail("Lỗi xác thực", 500)
    
    try:
        # Check if file is in request
        if 'file' not in request.files:
            return fail("Không có file được gửi lên", 400)
        
        file = request.files['file']
        
        # Check if file is empty
        if file.filename == '':
            return fail("Tên file trống", 400)
        
        # Check file extension
        if not allowed_file(file.filename):
            return fail(f"File không được hỗ trợ. Chỉ chấp nhận: {', '.join(ALLOWED_EXTENSIONS)}", 400)
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)  # Reset file pointer
        
        if file_size > MAX_FILE_SIZE:
            return fail(f"File quá lớn. Kích thước tối đa: {MAX_FILE_SIZE / (1024*1024)}MB", 400)
        
        # Create upload directory if not exists
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'app/uploads')
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)
        
        # Generate unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        original_filename = secure_filename(file.filename)
        file_ext = original_filename.rsplit('.', 1)[-1].lower() if '.' in original_filename else ''
        
        # Check if image should be optimized
        is_image = file_ext in IMAGE_EXTENSIONS
        optimized = False
        webp_path = None
        optimized_size = file_size
        
        # Save original file first
        filename = f"{timestamp}_{user['user_id']}_{original_filename}"
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        
        # Optimize image to WebP if applicable
        if is_image and should_optimize_image(filepath):
            try:
                # Convert to WebP (max 1920px width/height)
                webp_filename = f"{timestamp}_{user['user_id']}_{original_filename.rsplit('.', 1)[0]}.webp"
                webp_path = os.path.join(upload_folder, webp_filename)
                
                webp_path, original_size, optimized_size = convert_to_webp(
                    filepath,
                    quality=85,
                    max_width=1920,
                    max_height=1920,
                    output_path=webp_path
                )
                
                optimized = True
                # Store optimized version, keep original as backup
                # Use WebP as primary file
                primary_filepath = webp_path
                primary_filename = webp_filename
                primary_file_type = "image/webp"
                
                print(f"✅ Image optimized: {original_filename} → {webp_filename}")
                
            except Exception as e:
                print(f"⚠️  Image optimization failed: {e}. Using original file.")
                optimized = False
                primary_filepath = filepath
                primary_filename = filename
                primary_file_type = file.content_type
        else:
            primary_filepath = filepath
            primary_filename = filename
            primary_file_type = file.content_type
        
        # Get metadata from form (optional)
        metadata = {}
        if 'metadata' in request.form:
            import json
            try:
                metadata = json.loads(request.form['metadata'])
            except:
                pass
        
        # Create file record in database
        file_doc = {
            "filename": original_filename,
            "stored_filename": primary_filename,
            "file_path": primary_filepath,
            "original_filepath": filepath if optimized else None,  # Keep original if optimized
            "file_type": primary_file_type,
            "original_file_type": file.content_type if optimized else None,
            "file_size": optimized_size,
            "original_file_size": file_size if optimized else None,
            "optimized": optimized,
            "uploaded_by": ObjectId(user["user_id"]),
            "uploaded_at": datetime.utcnow(),
            "metadata": metadata,
            "status": "active"
        }
        
        result = mongo_db.files.insert_one(file_doc)
        file_id = str(result.inserted_id)
        
        # Generate file URL (with /api prefix for absolute path)
        file_url = f"/api/files/{file_id}"
        
        print(f"✅ File uploaded: {original_filename} by user {user['user_id']}")
        
        return success({
            "file_id": file_id,
            "filename": original_filename,
            "file_url": file_url,
            "file_type": file.content_type,
            "file_size": file_size,
            "uploaded_at": datetime.utcnow().isoformat()
        }, message="Upload file thành công", status_code=201)
        
    except Exception as e:
        import traceback
        print(f"❌ Upload error: {e}")
        traceback.print_exc()
        return fail(str(e), 500)


@files_bp.route("/<file_id>", methods=["GET", "OPTIONS"])
def get_file(file_id):
    """
    Download/View file by ID
    """
    # Handle OPTIONS
    if request.method == "OPTIONS":
        return "", 204
    
    # Get token from header OR query string
    token = None
    auth_header = request.headers.get('Authorization')
    
    if auth_header:
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            pass
    
    # Fallback to query string (for <a> tag links)
    if not token:
        token = request.args.get('token')
    
    if not token:
        print(f"❌ GET file {file_id}: No token found")
        return fail("Thiếu token xác thực", 401)
    
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id') or payload.get('sub')
        role = payload.get('role')
        
        if not user_id or not role:
            print(f"❌ GET file {file_id}: Invalid token payload - user_id={user_id}, role={role}")
            return fail("Token không hợp lệ", 401)
        
        g.current_user = {
            'user_id': str(user_id),
            'email': payload.get('email'),
            'role': role
        }
        
        print(f"✅ GET file {file_id}: Auth success - user_id={user_id}, role={role}")
        
    except jwt.ExpiredSignatureError:
        print(f"❌ GET file {file_id}: Token expired")
        return fail("Token đã hết hạn", 401)
    except jwt.InvalidTokenError as e:
        print(f"❌ GET file {file_id}: Invalid token - {e}")
        return fail("Token không hợp lệ", 401)
    except Exception as e:
        print(f"❌ GET file {file_id}: Auth error - {e}")
        import traceback
        traceback.print_exc()
        return fail("Lỗi xác thực", 500)
    
    try:
        # Try cache first
        cache_key = f"file:{file_id}"
        cached_file = cache.get(cache_key)
        if cached_file:
            file_doc = cached_file
        else:
            # Get file record from database
            file_doc = mongo_db.files.find_one({"_id": ObjectId(file_id)})
            
            if not file_doc:
                return fail("File không tồn tại", 404)
            
            # Cache file metadata for 1 hour
            cache.set(cache_key, file_doc, ttl=3600)
        
        # Check if file exists on disk
        if not os.path.exists(file_doc["file_path"]):
            return fail("File đã bị xóa hoặc không tìm thấy", 404)
        
        # Send file
        return send_file(
            file_doc["file_path"],
            mimetype=file_doc.get("file_type", "application/octet-stream"),
            as_attachment=False,  # Display in browser if possible
            download_name=file_doc["filename"]
        )
        
    except Exception as e:
        print(f"❌ Get file error: {e}")
        return fail(str(e), 500)


@files_bp.route("/<file_id>/download", methods=["GET", "OPTIONS"])
def download_file(file_id):
    """
    Force download file
    """
    # Handle OPTIONS
    if request.method == "OPTIONS":
        return "", 204
    
    # Get token from header OR query string
    token = None
    auth_header = request.headers.get('Authorization')
    
    if auth_header:
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            pass
    
    # Fallback to query string
    if not token:
        token = request.args.get('token')
    
    if not token:
        return fail("Thiếu token xác thực", 401)
    
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id') or payload.get('sub')
        
        if not user_id:
            return fail("Token không hợp lệ", 401)
        
        g.current_user = {'user_id': str(user_id)}
        
    except jwt.ExpiredSignatureError:
        return fail("Token đã hết hạn", 401)
    except jwt.InvalidTokenError:
        return fail("Token không hợp lệ", 401)
    
    try:
        # Get file record
        file_doc = mongo_db.files.find_one({"_id": ObjectId(file_id)})
        
        if not file_doc:
            return fail("File không tồn tại", 404)
        
        # Check if file exists on disk
        if not os.path.exists(file_doc["file_path"]):
            return fail("File đã bị xóa hoặc không tìm thấy", 404)
        
        # Force download
        return send_file(
            file_doc["file_path"],
            mimetype=file_doc["file_type"],
            as_attachment=True,
            download_name=file_doc["filename"]
        )
        
    except Exception as e:
        print(f"❌ Download file error: {e}")
        return fail(str(e), 500)


@files_bp.route("/<file_id>", methods=["DELETE", "OPTIONS"])
def delete_file(file_id):
    """
    Delete file (soft delete - mark as deleted)
    """
    # Handle OPTIONS
    if request.method == "OPTIONS":
        return "", 204
    
    # Manual auth check
    token = None
    auth_header = request.headers.get('Authorization')
    
    if auth_header:
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            return fail("Token format không hợp lệ", 401)
    
    if not token:
        return fail("Thiếu token xác thực", 401)
    
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id') or payload.get('sub')
        role = payload.get('role')
        
        if not user_id:
            return fail("Token không hợp lệ", 401)
        
        g.current_user = {
            'user_id': str(user_id),
            'role': role
        }
        user = g.current_user
        
    except jwt.ExpiredSignatureError:
        return fail("Token đã hết hạn", 401)
    except jwt.InvalidTokenError:
        return fail("Token không hợp lệ", 401)
    
    try:
        # Get file record
        file_doc = mongo_db.files.find_one({"_id": ObjectId(file_id)})
        
        if not file_doc:
            return fail("File không tồn tại", 404)
        
        # Check permission (only owner or admin can delete)
        if str(file_doc["uploaded_by"]) != user["user_id"] and user["role"] != "admin":
            return fail("Bạn không có quyền xóa file này", 403)
        
        # Soft delete (mark as deleted)
        mongo_db.files.update_one(
            {"_id": ObjectId(file_id)},
            {
                "$set": {
                    "status": "deleted",
                    "deleted_at": datetime.utcnow(),
                    "deleted_by": ObjectId(user["user_id"])
                }
            }
        )
        
        print(f"✅ File deleted: {file_id} by user {user['user_id']}")
        
        return success({"message": "Đã xóa file"})
        
    except Exception as e:
        print(f"❌ Delete file error: {e}")
        return fail(str(e), 500)


@files_bp.route("/list", methods=["GET", "OPTIONS"])
def list_user_files():
    """
    List all files uploaded by current user
    """
    # Handle OPTIONS
    if request.method == "OPTIONS":
        return "", 204
    
    # Manual auth check
    token = None
    auth_header = request.headers.get('Authorization')
    
    if auth_header:
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            return fail("Token format không hợp lệ", 401)
    
    if not token:
        return fail("Thiếu token xác thực", 401)
    
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id') or payload.get('sub')
        
        if not user_id:
            return fail("Token không hợp lệ", 401)
        
        g.current_user = {'user_id': str(user_id)}
        user = g.current_user
        
    except jwt.ExpiredSignatureError:
        return fail("Token đã hết hạn", 401)
    except jwt.InvalidTokenError:
        return fail("Token không hợp lệ", 401)
    
    try:
        # Query files
        query = {
            "uploaded_by": ObjectId(user["user_id"]),
            "status": "active"
        }
        
        files = list(
            mongo_db.files.find(query)
            .sort("uploaded_at", -1)
            .limit(100)
        )
        
        # Convert ObjectIds
        for file in files:
            file["_id"] = str(file["_id"])
            file["uploaded_by"] = str(file["uploaded_by"])
            file["file_url"] = f"/api/files/{file['_id']}"
            # Don't expose file_path to client
            del file["file_path"]
            del file["stored_filename"]
        
        return success(files)
        
    except Exception as e:
        print(f"❌ List files error: {e}")
        return fail(str(e), 500)
