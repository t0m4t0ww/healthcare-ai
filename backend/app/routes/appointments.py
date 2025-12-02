from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from datetime import datetime
import traceback
import jwt
import threading
from app.middlewares.auth import auth_required, get_current_user
from app.extensions import mongo_db, socketio
from app.utils.responses import success, fail
from app.utils.validators import validate_object_id, validate_date, ValidationError  # ✅ Add validators
from app.utils.rate_limiter import limiter, RATE_LIMITS  # ✅ Add rate limiter
from app.config import get_settings
from app.utils.doctor_helpers import get_doctor_oid_from_user
from app.services.email_service import (
    send_appointment_confirmation_email, 
    send_post_consultation_email, 
    send_appointment_cancellation_email, 
    send_appointment_reschedule_email,
    send_appointment_booked_email  # ✅ Email khi patient đặt lịch
)
from app.services.notification_service import NotificationService  # ✅ Import notification service
from .appointment_helpers import (
    detect_patient_oid, check_slot_expired, convert_objectids_to_str,
    populate_doctor_info, populate_patient_info, populate_slot_info
)
from .appointment_queries import (
    get_slots_by_doctor_date, check_date_availability,
    hold_slot, release_slot, create_appointment, mark_slot_booked, mark_slot_available,
    get_appointments_by_patient, get_appointments_by_doctor, get_all_appointments,
    cancel_appointment, confirm_appointment, delete_appointment
)

appointments_bp = Blueprint("appointments", __name__)

# =============== ADMIN DATA INTEGRITY VALIDATION ===============

@appointments_bp.route("/admin/validate-integrity", methods=["POST"])
@auth_required(roles=["admin"])
def validate_appointment_integrity():
    """Validate and optionally fix appointment data integrity issues"""
    data = request.get_json() or {}
    auto_fix = data.get("auto_fix", False)
    
    settings = get_settings()
    default_doctor_id = ObjectId(settings.DEFAULT_DOCTOR_ID)
    
    issues = []
    fixed = []
    
    # Check for orphaned appointments (doctor doesn't exist)
    doctor_ids = mongo_db.appointments.distinct("doctor_id")
    for doc_id in doctor_ids:
        doctor = mongo_db.users.find_one({"_id": doc_id})
        if not doctor:
            count = mongo_db.appointments.count_documents({"doctor_id": doc_id})
            issue = {
                "type": "orphaned_doctor",
                "doctor_id": str(doc_id),
                "count": count,
                "description": f"{count} appointments assigned to non-existent doctor"
            }
            issues.append(issue)
            
            if auto_fix:
                result = mongo_db.appointments.update_many(
                    {"doctor_id": doc_id},
                    {"$set": {"doctor_id": default_doctor_id}}
                )
                fixed.append({
                    **issue,
                    "fixed_count": result.modified_count,
                    "reassigned_to": str(default_doctor_id)
                })
    
    # Check for appointments with missing time data
    missing_time = mongo_db.appointments.count_documents({
        "appointment_time": {"$exists": False}
    })
    if missing_time > 0:
        issues.append({
            "type": "missing_time",
            "count": missing_time,
            "description": f"{missing_time} appointments missing appointment_time"
        })
    
    # Check for broken slot references
    appointments = list(mongo_db.appointments.find({"slot_id": {"$exists": True}}))
    broken_slots = 0
    for apt in appointments:
        slot = mongo_db.time_slots.find_one({"_id": apt["slot_id"]})
        if not slot:
            broken_slots += 1
    
    if broken_slots > 0:
        issues.append({
            "type": "broken_slot_reference",
            "count": broken_slots,
            "description": f"{broken_slots} appointments reference non-existent slots"
        })
    
    return success({
        "issues": issues,
        "fixed": fixed if auto_fix else [],
        "total_issues": len(issues),
        "auto_fix_enabled": auto_fix
    })

# =============== TIME SLOTS API ===============

@appointments_bp.route("/time-slots", methods=["GET"])
@limiter.limit(RATE_LIMITS["general"])  # ✅ 100 per minute
def get_time_slots():
    """Lấy danh sách time slots"""
    doctor_id = request.args.get("doctor_id")
    date = request.args.get("date")
    status = request.args.get("status")
    
    if not doctor_id or not date:
        return fail("Thiếu doctor_id hoặc date", 400)
    
    print(f"🔍 get_time_slots: doctor_id={doctor_id}, date={date}, status={status}")
    
    # ✅ Validate inputs
    try:
        validate_object_id(doctor_id, "doctor_id")
        validate_date(date, "date", allow_past=False)  # Không cho phép quá khứ
    except ValidationError as e:
        return fail(e.message, 400)
    
    try:
        slots = get_slots_by_doctor_date(doctor_id, date, status)
        print(f"✅ Found {len(slots)} slots for date {date}")
        now_utc = datetime.utcnow()
        
        result = []
        for slot in slots:
            # ✅ Convert date to string BEFORE other operations
            if isinstance(slot.get("date"), datetime):
                slot["date"] = slot["date"].strftime("%Y-%m-%d")
            
            # ✅ Convert datetime fields to ISO strings
            if isinstance(slot.get("created_at"), datetime):
                slot["created_at"] = slot["created_at"].isoformat() + "Z"
            if isinstance(slot.get("updated_at"), datetime):
                slot["updated_at"] = slot["updated_at"].isoformat() + "Z"
            if isinstance(slot.get("hold_expires_at"), datetime):
                slot["hold_expires_at"] = slot["hold_expires_at"].isoformat() + "Z"
            
            convert_objectids_to_str(slot)
            
            is_expired = check_slot_expired(slot)
            slot["is_expired"] = is_expired
            
            if is_expired and slot.get("status") == "available":
                slot["status"] = "expired"
            
            result.append(slot)
        
        return success(result)
    
    except Exception as e:
        print(f"❌ Error in get_time_slots: {e}")
        return fail(str(e), 500)


@appointments_bp.route("/time-slots/batch-availability", methods=["GET","POST","OPTIONS"], strict_slashes=False)
@appointments_bp.route("/time-slots/batch-availability/", methods=["GET","POST","OPTIONS"], strict_slashes=False)
def batch_check_availability():
    """Check availability cho nhiều ngày"""
    if request.method == "OPTIONS":
        return "", 204

    if request.method == "POST":
        data = request.get_json(silent=True, force=True) or {}
        doctor_id = data.get("doctor_id")
        dates = data.get("dates", [])
    else:
        doctor_id = request.args.get("doctor_id")
        dates_raw = request.args.get("dates", "")
        dates = request.args.getlist("dates") or [d for d in dates_raw.split(",") if d]

    if not doctor_id:
        return fail("Thiếu doctor_id", 400)
    if not dates or not isinstance(dates, list):
        return fail("Thiếu hoặc sai format dates", 400)

    print(f"🔍 batch_check_availability: doctor_id={doctor_id}, dates={dates}")
    
    try:
        availability = check_date_availability(doctor_id, dates)
        print(f"✅ availability result: {availability}")
        return success(availability)
        
    except Exception as e:
        print(f"❌ Error in batch_check_availability: {e}")
        return fail(str(e), 500)


@appointments_bp.route("/time-slots/hold", methods=["POST"])
@auth_required(roles=["patient"])
def hold_time_slot():
    """HOLD slot trong 2 phút"""
    data = request.get_json() or {}
    user_ctx = get_current_user() or {}
    slot_id = data.get("slot_id")
    
    print(f"🔍 HOLD REQUEST: slot_id={slot_id}, user_ctx={user_ctx}")
    
    if not slot_id:
        return fail("Thiếu slot_id", 400)
    
    patient_oid, error = detect_patient_oid(user_ctx)
    print(f"🔍 PATIENT OID: {patient_oid}, error={error}")
    
    if error:
        return fail(error, 409 if "hồ sơ" in error else 401)
    
    try:
        success_flag, message, response_data = hold_slot(slot_id, patient_oid)
        print(f"🔍 HOLD RESULT: success={success_flag}, message={message}, data={response_data}")
        
        if not success_flag:
            return fail(message, 409)
        
        return success(response_data, message=message)
    
    except Exception as e:
        print(f"❌ Error in hold_time_slot: {e}")
        return fail(str(e), 500)


@appointments_bp.route("/time-slots/release", methods=["POST"])
@auth_required(roles=["patient"])
def release_time_slot():
    """Release slot đang HOLD"""
    data = request.get_json() or {}
    user_ctx = get_current_user() or {}
    slot_id = data.get("slot_id")
    
    if not slot_id:
        return fail("Thiếu slot_id", 400)
    
    patient_oid, error = detect_patient_oid(user_ctx)
    if error:
        return fail(error, 409 if "hồ sơ" in error else 401)
    
    try:
        success_flag, message = release_slot(slot_id, patient_oid)
        return success({"message": message})
    
    except Exception as e:
        print(f"❌ Error in release_time_slot: {e}")
        return fail(str(e), 500)


@appointments_bp.route("/appointments/complete-booking", methods=["POST","OPTIONS"], strict_slashes=False)
@appointments_bp.route("/appointments/complete-booking/", methods=["POST","OPTIONS"], strict_slashes=False)
@auth_required(roles=["patient"])
def complete_booking():
    """Hoàn tất đặt lịch: HOLD -> BOOKED"""
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json() or {}
    user_ctx = get_current_user() or {}

    slot_id = (data.get("slot_id") or "").strip()
    reason = (data.get("reason") or "").strip()
    
    if not slot_id:
        return fail("Thiếu slot_id", 400)
    if not reason:
        return fail("Thiếu lý do khám", 400)

    try:
        patient_oid, error = detect_patient_oid(user_ctx)
        if error:
            return fail(error, 409 if "hồ sơ" in error else 401)

        slot = mongo_db.time_slots.find_one({"_id": ObjectId(slot_id)})
        if not slot:
            return fail("Slot không tồn tại", 404)

        if slot.get("status") != "hold":
            return fail("Slot chưa ở trạng thái HOLD", 400)
        
        if slot.get("held_by") != patient_oid:
            return fail("Slot đang được người khác giữ", 403)

        if slot.get("hold_until") and slot["hold_until"] < datetime.utcnow():
            return fail("Hết thời gian giữ chỗ", 400)

        apt_id = create_appointment(patient_oid, slot, data)
        mark_slot_booked(slot_id, patient_oid, apt_id)

        # ✅ Convert date to string format
        slot_date = slot.get("date")
        if isinstance(slot_date, datetime):
            slot_date = slot_date.strftime("%Y-%m-%d")

        print(f"✅ [complete_booking] Appointment created: {apt_id}, Date: {slot_date}")

        # ✅ Send notification to doctor about new appointment
        try:
            doctor_id = slot.get("doctor_id")
            patient = mongo_db.patients.find_one({"_id": patient_oid})
            if not patient:
                patient = mongo_db.users.find_one({"_id": patient_oid})
            
            patient_name = patient.get("full_name") or patient.get("name", "Bệnh nhân") if patient else "Bệnh nhân"
            appointment_time = f"{slot.get('start_time', '')} - {slot.get('end_time', '')}"
            
            NotificationService.send_new_appointment_to_doctor(
                doctor_id=doctor_id,
                patient_name=patient_name,
                appointment_date=slot_date,
                appointment_time=appointment_time
            )
            
            # Emit socket event for realtime notification
            socketio.emit("new_appointment", {
                "appointment_id": str(apt_id),
                "doctor_id": str(doctor_id),
                "patient_name": patient_name,
                "date": slot_date,
                "time": appointment_time
            }, room=f"doctor_{str(doctor_id)}")
            
        except Exception as notif_err:
            print(f"⚠️ Failed to send new appointment notification to doctor: {notif_err}")

        # ✅ GỬI EMAIL KHI PATIENT ĐẶT LỊCH THÀNH CÔNG (trong background thread để không block response)
        def send_email_background():
            """Gửi email trong background thread để không block response"""
            try:
                print(f"📧 [complete_booking] Starting email sending process in background...")
                patient = mongo_db.patients.find_one({"_id": patient_oid})
                if not patient:
                    patient = mongo_db.users.find_one({"_id": patient_oid})
                
                if not patient:
                    print(f"⚠️ [complete_booking] Patient not found: {patient_oid}")
                    return
                
                email = patient.get("email")
                full_name = patient.get("full_name") or patient.get("name", "Bạn")
                
                print(f"📧 [complete_booking] Patient email: {email}, Full name: {full_name}")
                
                if not email:
                    print(f"⚠️ [complete_booking] Patient has no email address")
                    return
                
                # Get doctor info - Handle both ObjectId and string
                doctor_id_raw = slot.get("doctor_id")
                print(f"📧 [complete_booking] Doctor ID raw: {doctor_id_raw}, type: {type(doctor_id_raw)}")
                
                try:
                    if isinstance(doctor_id_raw, ObjectId):
                        doctor_oid = doctor_id_raw
                    elif isinstance(doctor_id_raw, str):
                        doctor_oid = ObjectId(doctor_id_raw)
                    else:
                        doctor_oid = ObjectId(str(doctor_id_raw))
                    
                    doctor = mongo_db.doctors.find_one({"_id": doctor_oid})
                    if not doctor:
                        print(f"⚠️ [complete_booking] Doctor not found in doctors collection, trying users...")
                        doctor = mongo_db.users.find_one({"_id": doctor_oid, "role": "doctor"})
                    
                    doctor_name = doctor.get("name") or doctor.get("full_name", "Bác sĩ") if doctor else "Bác sĩ"
                    doctor_specialty = doctor.get("specialty") or doctor.get("specialization", "") if doctor else ""
                    
                    print(f"📧 [complete_booking] Doctor found: {doctor_name}, Specialty: {doctor_specialty}")
                    
                    appointment_data = {
                        "doctor_name": doctor_name,
                        "specialty": doctor_specialty,
                        "date": slot_date,
                        "time": f"{slot.get('start_time', '')} - {slot.get('end_time', '')}",
                        "location": "Phòng khám Healthcare AI"
                    }
                    
                    print(f"📧 [complete_booking] Sending booked email to {email}")
                    print(f"📧 [complete_booking] Appointment data: {appointment_data}")
                    
                    email_sent = send_appointment_booked_email(
                        to=email,
                        full_name=full_name,
                        appointment_data=appointment_data,
                        patient_id=str(patient_oid),
                        appointment_id=str(apt_id)
                    )
                    
                    if email_sent:
                        print(f"✅ [complete_booking] Booked email sent successfully to {email}")
                    else:
                        print(f"❌ [complete_booking] Failed to send booked email to {email}")
                except Exception as doctor_error:
                    import traceback
                    print(f"❌ [complete_booking] Error getting doctor info: {doctor_error}")
                    traceback.print_exc()
                    # Still try to send email with default values
                    appointment_data = {
                        "doctor_name": "Bác sĩ",
                        "specialty": "",
                        "date": slot_date,
                        "time": f"{slot.get('start_time', '')} - {slot.get('end_time', '')}",
                        "location": "Phòng khám Healthcare AI"
                    }
                    try:
                        email_sent = send_appointment_booked_email(
                            to=email,
                            full_name=full_name,
                            appointment_data=appointment_data,
                            patient_id=str(patient_oid),
                            appointment_id=str(apt_id)
                        )
                        print(f"{'✅' if email_sent else '❌'} [complete_booking] Email sent with default doctor info: {email_sent}")
                    except:
                        pass
            except Exception as email_error:
                import traceback
                print(f"❌ [complete_booking] Email sending error (non-blocking): {email_error}")
                traceback.print_exc()
        
        # ✅ Start email sending in background thread - không block response
        email_thread = threading.Thread(target=send_email_background, daemon=True)
        email_thread.start()
        print(f"📧 [complete_booking] Email thread started, returning response immediately...")

        # ✅ Return response immediately - không đợi email
        return success({
            "_id": str(apt_id),
            "appointment_id": str(apt_id),
            "slot_id": slot_id,
            "date": slot_date,
            "start_time": slot.get("start_time"),
            "end_time": slot.get("end_time"),
            "status": "booked",
            "message": "Đặt lịch thành công! Email xác nhận đang được gửi."
        }, message="Đặt lịch thành công! Email xác nhận đang được gửi.", status_code=201)

    except Exception as e:
        print(f"❌ Error in complete_booking: {e}")
        return fail(str(e), 500)


# =============== SEND CONFIRMATION EMAIL (Frontend can call this) ===============

@appointments_bp.route("/appointments/send-confirmation-email", methods=["POST", "OPTIONS"], strict_slashes=False)
def send_confirmation_email_route():
    """Send appointment confirmation email - can be called from frontend"""
    # Handle OPTIONS request first (before auth check)
    if request.method == "OPTIONS":
        print(f"📧 [send_confirmation_email_route] OPTIONS request received")
        return "", 204
    
    print(f"📧 [send_confirmation_email_route] POST request received")
    print(f"📧 [send_confirmation_email_route] Headers: {dict(request.headers)}")
    
    # Manual auth check (simpler than decorator for debugging)
    token = None
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            token = auth_header.split(' ')[1]
            print(f"📧 [send_confirmation_email_route] Token found: {token[:20]}...")
        except IndexError:
            print(f"❌ [send_confirmation_email_route] Invalid token format")
            return fail("Token format không hợp lệ", 401)
    
    if not token:
        print(f"❌ [send_confirmation_email_route] No token provided")
        return fail("Thiếu token xác thực", 401)
    
    # Verify token
    try:
        import jwt
        from app.config import JWT_SECRET_KEY
        from flask import g
        
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id') or payload.get('sub')
        role = payload.get('role')
        
        print(f"📧 [send_confirmation_email_route] Token decoded: user_id={user_id}, role={role}")
        
        if not user_id or not role:
            print(f"❌ [send_confirmation_email_route] Invalid token payload: {payload}")
            return fail("Token không hợp lệ", 401)
        
        if role != "patient":
            print(f"❌ [send_confirmation_email_route] Role check failed: {role} != patient")
            return fail("Chỉ bệnh nhân mới có quyền gửi email xác nhận", 403)
        
        # Store user in g
        g.current_user = {
            'user_id': str(user_id),
            'role': role,
            'email': payload.get('email')
        }
        
        print(f"✅ [send_confirmation_email_route] Auth successful")
    except jwt.ExpiredSignatureError:
        print(f"❌ [send_confirmation_email_route] Token expired")
        return fail("Token đã hết hạn", 401)
    except jwt.InvalidTokenError as e:
        print(f"❌ [send_confirmation_email_route] Invalid token: {e}")
        return fail("Token không hợp lệ", 401)
    except Exception as e:
        print(f"❌ [send_confirmation_email_route] Auth error: {e}")
        import traceback
        traceback.print_exc()
        return fail("Lỗi xác thực", 500)

    try:
        print(f"📧 [send_confirmation_email_route] Received request to send confirmation email")
        data = request.get_json() or {}
        email = data.get("email")
        full_name = data.get("full_name", "Bạn")
        appointment_data = data.get("appointment_data", {})

        print(f"📧 [send_confirmation_email_route] Email: {email}, Full name: {full_name}")
        print(f"📧 [send_confirmation_email_route] Appointment data: {appointment_data}")

        if not email:
            print(f"❌ [send_confirmation_email_route] Missing email in request")
            return fail("Thiếu email", 400)

        print(f"📧 [send_confirmation_email_route] Calling send_appointment_confirmation_email...")
        email_sent = send_appointment_confirmation_email(
            to=email,
            full_name=full_name,
            appointment_data=appointment_data,
            patient_id=None,
            appointment_id=None
        )

        if email_sent:
            print(f"✅ [send_confirmation_email_route] Confirmation email sent to {email} (from frontend)")
            return success({"message": "Email đã được gửi thành công", "email": email})
        else:
            print(f"⚠️ [send_confirmation_email_route] Failed to send confirmation email to {email} (from frontend)")
            return fail("Không thể gửi email", 500)

    except Exception as e:
        import traceback
        print(f"❌ [send_confirmation_email_route] Error sending confirmation email: {e}")
        traceback.print_exc()
        return fail(f"Lỗi gửi email: {str(e)}", 500)


# =============== PATIENT APPOINTMENTS ===============

@appointments_bp.route("/appointments/patient", methods=["GET"], strict_slashes=False)
@auth_required(roles=["patient"])
def get_patient_appointments():
    """Lấy danh sách appointments của patient"""
    ctx = get_current_user() or {}
    
    patient_oid, error = detect_patient_oid(ctx)
    if error:
        return fail(error, 409 if "hồ sơ" in error else 401)

    try:
        query_filter = {}
        status_filter = request.args.get("status")
        if status_filter:
            query_filter["status"] = status_filter

        page = int(request.args.get("page", 1))
        # ✅ Tăng limit mặc định lên 1000 để hiển thị tất cả lịch khám
        limit = int(request.args.get("limit", 1000))

        appointments, total = get_appointments_by_patient(patient_oid, query_filter, page, limit)

        for apt in appointments:
            convert_objectids_to_str(apt)
            
            doctor_info = populate_doctor_info(apt["doctor_id"])
            apt["doctor_info"] = doctor_info
            apt["doctor_name"] = doctor_info["name"]
            apt["doctor_specialty"] = doctor_info["specialty"]  # Code (for filtering)
            apt["specialty_name"] = doctor_info.get("specialty_name", doctor_info["specialty"])  # ✅ Vietnamese name

            slot_info = populate_slot_info(apt["slot_id"])
            if slot_info:
                apt["slot_info"] = slot_info
                apt["time_slot"] = slot_info.get("time", "")  # ✅ Add formatted time_slot field

        return success({
            "data": appointments,
            "total": total,
            "page": page,
            "limit": limit
        })

    except Exception as e:
        print(f"❌ Error in get_patient_appointments: {e}")
        return fail(str(e), 500)


@appointments_bp.route("/appointments/<appointment_id>/cancel", methods=["POST"])
@auth_required(roles=["patient", "doctor", "admin"])
def cancel_appointment_route(appointment_id):
    """Hủy appointment"""
    data = request.get_json() or {}
    user = get_current_user()
    
    try:
        appointment = mongo_db.appointments.find_one({"_id": ObjectId(appointment_id)})
        
        if not appointment:
            return fail("Appointment không tồn tại", 404)
        
        # Authorization check
        if user["role"] == "patient":
            # ✅ IMPORTANT: appointment["patient_id"] might be from patients collection or users collection
            # Need to check both possibilities
            print(f"🔍 Authorization check:")
            print(f"   - appointment patient_id: {appointment['patient_id']} (type: {type(appointment['patient_id'])})")
            print(f"   - user user_id: {user['user_id']} (type: {type(user['user_id'])})")
            
            # Check if patient_id matches user_id directly
            patient_id_str = str(appointment["patient_id"])
            is_owner = patient_id_str == user["user_id"]
            
            print(f"   - Direct match: {is_owner}")
            
            # If not direct match, check if this user has a patient record that matches
            if not is_owner:
                print(f"   - Checking patient record with user_id: {user['user_id']}")
                user_patient = mongo_db.patients.find_one({"user_id": ObjectId(user["user_id"])})
                print(f"   - Patient record found: {user_patient is not None}")
                
                if user_patient:
                    print(f"   - Patient record _id: {user_patient['_id']}")
                    is_owner = str(user_patient["_id"]) == patient_id_str
                    print(f"   - Patient record matches: {is_owner}")
                else:
                    # ✅ Maybe patient_id IS the direct patient record ID
                    # Check if appointment.patient_id exists in patients collection
                    print(f"   - Checking if appointment.patient_id exists in patients collection")
                    patient_record = mongo_db.patients.find_one({"_id": appointment["patient_id"]})
                    if patient_record:
                        print(f"   - Found patient record: {patient_record.get('_id')}")
                        print(f"   - Patient record fields: {list(patient_record.keys())}")
                        # Check if this patient belongs to current user
                        if "user_id" in patient_record:
                            print(f"   - Patient.user_id: {patient_record['user_id']}")
                            is_owner = str(patient_record["user_id"]) == user["user_id"]
                        else:
                            print(f"   - No user_id field in patient record!")
                            # Maybe the appointment was created with patient_id = user_id from a different user
                            # Check if there's a user with this patient_id
                            user_record = mongo_db.users.find_one({"patient_id": appointment["patient_id"]})
                            if user_record:
                                print(f"   - Found user with patient_id: {user_record['_id']}")
                                is_owner = str(user_record["_id"]) == user["user_id"]
                                print(f"   - User matches: {is_owner}")
            
            if not is_owner:
                print(f"❌ Authorization failed: patient_id mismatch")
                return fail("Bạn không có quyền hủy appointment này", 403)
            
            print(f"✅ Authorization passed")
        elif user["role"] == "doctor":
            doctor = mongo_db.doctors.find_one({"user_id": ObjectId(user["user_id"])})
            if not doctor or str(appointment["doctor_id"]) != str(doctor["_id"]):
                return fail("Bạn không có quyền hủy appointment này", 403)
            if not data.get("reason"):
                return fail("Vui lòng nhập lý do hủy lịch", 400)
        
        reason = data.get("reason")
        success_flag, message, slot_id = cancel_appointment(
            appointment_id, user["user_id"], user["role"], reason
        )
        
        if not success_flag:
            return fail(message, 500)
        
        if slot_id:
            mark_slot_available(slot_id)
        
        # ✅ Send appointment cancellation email
        print(f"📧 [cancel_appointment] ========== STARTING EMAIL PROCESS ==========")
        print(f"📧 [cancel_appointment] Cancelled by: {user['role']}")
        import sys
        sys.stdout.flush()
        
        try:
            patient_id = appointment["patient_id"]
            doctor_id = appointment["doctor_id"]
            
            print(f"📧 [cancel_appointment] Getting patient info for patient_id: {patient_id}")
            # Get patient info
            patient = mongo_db.patients.find_one({"_id": patient_id})
            if not patient:
                print(f"📧 [cancel_appointment] Patient not found in patients collection, trying users...")
                patient = mongo_db.users.find_one({"_id": patient_id})
            
            if not patient:
                print(f"⚠️ [cancel_appointment] Patient not found: {patient_id}")
            else:
                full_name = patient.get("full_name") or patient.get("name", "Bạn")
                email = patient.get("email")
                
                print(f"📧 [cancel_appointment] Patient email: {email}, Full name: {full_name}")
                
                if not email:
                    print(f"⚠️ [cancel_appointment] Patient has no email address")
                else:
                    # Get doctor info
                    print(f"📧 [cancel_appointment] Getting doctor info for doctor_id: {doctor_id}")
                    doctor = mongo_db.doctors.find_one({"_id": doctor_id})
                    if not doctor:
                        print(f"📧 [cancel_appointment] Doctor not found in doctors collection, trying users...")
                        doctor_user = mongo_db.users.find_one({"_id": doctor_id})
                        if doctor_user:
                            doctor = {
                                "name": doctor_user.get("name") or doctor_user.get("full_name"),
                                "specialty": doctor_user.get("specialty")
                            }
                    
                    if not doctor:
                        print(f"⚠️ [cancel_appointment] Doctor not found: {doctor_id}")
                    else:
                        # Format appointment date
                        appointment_date = appointment.get("date")
                        if isinstance(appointment_date, datetime):
                            appointment_date = appointment_date.strftime("%Y-%m-%d")
                        elif isinstance(appointment_date, str):
                            appointment_date = appointment_date
                        else:
                            appointment_date = str(appointment_date)
                        
                        doctor_name = doctor.get("name") or doctor.get("full_name") or "Bác sĩ"
                        doctor_specialty = doctor.get("specialty") or doctor.get("specialization") or "Chuyên khoa"
                        
                        print(f"📧 [cancel_appointment] Doctor found: {doctor_name}, Specialty: {doctor_specialty}")
                        print(f"📧 [cancel_appointment] Cancellation reason: {reason or 'Không có lý do cụ thể'}")
                        
                        appointment_data = {
                            "doctor_name": doctor_name,
                            "specialty": doctor_specialty,
                            "date": appointment_date,
                            "time": f"{appointment.get('start_time', '')} - {appointment.get('end_time', '')}",
                            "location": "Phòng khám Healthcare AI",
                            "cancellation_reason": reason or "Không có lý do cụ thể"
                        }
                        
                        print(f"📧 [cancel_appointment] Sending cancellation email to {email}")
                        print(f"📧 [cancel_appointment] Appointment data: {appointment_data}")
                        
                        email_sent = send_appointment_cancellation_email(
                            to=email,
                            full_name=full_name,
                            appointment_data=appointment_data,
                            patient_id=str(patient_id),
                            appointment_id=appointment_id,
                            cancelled_by=user["role"]  # ✅ Pass who cancelled (doctor/patient)
                        )
                        
                        if email_sent:
                            print(f"✅ [cancel_appointment] Cancellation email sent successfully to {email}")
                        else:
                            print(f"❌ [cancel_appointment] Failed to send cancellation email to {email}")
        except Exception as email_error:
            import traceback
            print(f"❌ [cancel_appointment] Email sending error (non-blocking): {email_error}")
            traceback.print_exc()
        
        # ✅ Send notification to doctor when patient cancels appointment
        if user["role"] == "patient":
            try:
                doctor_id = appointment["doctor_id"]
                patient = mongo_db.patients.find_one({"_id": appointment["patient_id"]})
                if not patient:
                    patient = mongo_db.users.find_one({"_id": appointment["patient_id"]})
                
                patient_name = patient.get("full_name") or patient.get("name", "Bệnh nhân") if patient else "Bệnh nhân"
                
                # Format appointment date
                appointment_date = appointment.get("date")
                if isinstance(appointment_date, datetime):
                    appointment_date = appointment_date.strftime("%Y-%m-%d")
                elif isinstance(appointment_date, str):
                    appointment_date = appointment_date
                else:
                    appointment_date = str(appointment_date)
                
                appointment_time = f"{appointment.get('start_time', '')} - {appointment.get('end_time', '')}"
                
                NotificationService.send_appointment_cancelled_to_doctor(
                    doctor_id=doctor_id,
                    patient_name=patient_name,
                    appointment_date=appointment_date,
                    appointment_time=appointment_time,
                    reason=reason or ""
                )
                
                # Emit socket event for realtime notification
                socketio.emit("new_notification", {
                    "type": "appointment_cancelled",
                    "title": "Lịch hẹn bị hủy",
                    "message": f"{patient_name} đã hủy lịch khám vào {appointment_date} lúc {appointment_time}",
                    "doctor_id": str(doctor_id)
                }, room=f"doctor_{str(doctor_id)}")
                
                print(f"✅ Notification sent to doctor {doctor_id} about cancelled appointment")
            except Exception as notif_err:
                print(f"⚠️ Failed to send cancellation notification to doctor: {notif_err}")
        
        # ✅ Send notification to patient when doctor cancels appointment
        if user["role"] == "doctor":
            try:
                patient_id = appointment["patient_id"]
                doctor = mongo_db.doctors.find_one({"_id": appointment["doctor_id"]})
                doctor_name = doctor.get("name") or doctor.get("full_name", "Bác sĩ") if doctor else "Bác sĩ"
                
                # Format appointment date
                appointment_date = appointment.get("date")
                if isinstance(appointment_date, datetime):
                    appointment_date = appointment_date.strftime("%Y-%m-%d")
                elif isinstance(appointment_date, str):
                    appointment_date = appointment_date
                else:
                    appointment_date = str(appointment_date)
                
                appointment_time = f"{appointment.get('start_time', '')} - {appointment.get('end_time', '')}"
                
                NotificationService.send_appointment_cancelled_to_patient(
                    patient_id=patient_id,
                    doctor_name=doctor_name,
                    appointment_date=appointment_date,
                    appointment_time=appointment_time,
                    reason=reason or ""
                )
                
                # Emit socket event for realtime notification
                socketio.emit("new_notification", {
                    "type": "appointment_cancelled_by_doctor",
                    "title": "Bác sĩ hủy lịch khám",
                    "message": f"Bác sĩ {doctor_name} đã hủy lịch khám của bạn vào {appointment_date} lúc {appointment_time}",
                    "patient_id": str(patient_id)
                }, room=f"patient_{str(patient_id)}")
                
                print(f"✅ Notification sent to patient {patient_id} about cancelled appointment by doctor")
            except Exception as notif_err:
                print(f"⚠️ Failed to send cancellation notification to patient: {notif_err}")
        
        socketio.emit("appointment_updated", {
            "appointment_id": appointment_id,
            "status": "cancelled",
            "cancelled_at": datetime.utcnow().isoformat(),
            "patient_id": str(appointment["patient_id"]),
            "doctor_id": str(appointment["doctor_id"])
        })
        
        return success({
            "message": message,
            "appointment_id": appointment_id
        })
    
    except Exception as e:
        print(f"❌ Error in cancel_appointment: {e}")
        return fail(str(e), 500)


@appointments_bp.route("/appointments/<appointment_id>/reschedule", methods=["POST", "OPTIONS"])
@auth_required(roles=["patient"])
def reschedule_appointment_route(appointment_id):
    """Đổi lịch khám - tạo appointment mới và đánh dấu appointment cũ là rescheduled"""
    print(f"🔄 [reschedule_appointment] Route called with appointment_id: {appointment_id}, method: {request.method}")
    
    if request.method == "OPTIONS":
        return "", 204
    
    data = request.get_json() or {}
    user = get_current_user()
    
    print(f"🔄 [reschedule_appointment] User: {user.get('user_id')}, Role: {user.get('role')}")
    print(f"🔄 [reschedule_appointment] Request data: {data}")
    
    try:
        # Get old appointment
        old_appointment = mongo_db.appointments.find_one({"_id": ObjectId(appointment_id)})
        
        if not old_appointment:
            return fail("Appointment không tồn tại", 404)
        
        # ✅ Check if appointment can be rescheduled
        old_status = (old_appointment.get("status") or "").lower()
        if old_status == "cancelled":
            return fail("Không thể đổi lịch khám đã bị hủy", 400)
        if old_status == "completed":
            return fail("Không thể đổi lịch khám đã hoàn thành", 400)
        # ✅ Allow rescheduling appointments that are already rescheduled (create new appointment)
        
        # Authorization check - patient can only reschedule their own appointments
        patient_id_str = str(old_appointment["patient_id"])
        is_owner = patient_id_str == user["user_id"]
        
        if not is_owner:
            user_patient = mongo_db.patients.find_one({"user_id": ObjectId(user["user_id"])})
            if user_patient:
                is_owner = str(user_patient["_id"]) == patient_id_str
            else:
                patient_record = mongo_db.patients.find_one({"_id": old_appointment["patient_id"]})
                if patient_record and "user_id" in patient_record:
                    is_owner = str(patient_record["user_id"]) == user["user_id"]
        
        if not is_owner:
            return fail("Bạn không có quyền đổi lịch appointment này", 403)
        
        # Validate new slot data
        slot_id = (data.get("slot_id") or "").strip()
        if not slot_id:
            print(f"❌ [reschedule_appointment] Missing slot_id")
            return fail("Thiếu slot_id", 400)
        
        print(f"🔄 [reschedule_appointment] Checking slot: {slot_id}")
        
        # Get new slot
        try:
            new_slot = mongo_db.time_slots.find_one({"_id": ObjectId(slot_id)})
        except Exception as e:
            print(f"❌ [reschedule_appointment] Invalid slot_id format: {e}")
            return fail("Slot ID không hợp lệ", 400)
        
        if not new_slot:
            print(f"❌ [reschedule_appointment] Slot not found: {slot_id}")
            return fail("Slot không tồn tại", 404)
        
        print(f"🔄 [reschedule_appointment] Slot status: {new_slot.get('status')}, held_by: {new_slot.get('held_by')}")
        
        patient_oid, error = detect_patient_oid(user)
        if error:
            print(f"❌ [reschedule_appointment] Patient OID detection failed: {error}")
            return fail(error, 409 if "hồ sơ" in error else 401)
        
        print(f"🔄 [reschedule_appointment] Patient OID: {patient_oid}")
        
        slot_status = new_slot.get("status", "").upper()
        old_slot_id = old_appointment.get("slot_id")
        
        # ✅ Allow reschedule with:
        # 1. Slot in HOLD status and held by this patient
        # 2. Slot in AVAILABLE status (auto-hold it)
        # 3. Slot in BOOKED status if it's the old appointment's slot (re-booking same slot)
        
        if slot_status == "HOLD":
            # Check if slot is held by this patient
            slot_held_by = new_slot.get("held_by")
            if slot_held_by:
                slot_held_by_str = str(slot_held_by) if hasattr(slot_held_by, '__str__') else slot_held_by
                patient_oid_str = str(patient_oid) if hasattr(patient_oid, '__str__') else patient_oid
                if slot_held_by_str != patient_oid_str:
                    print(f"❌ [reschedule_appointment] Slot held by different user. Slot held_by: {slot_held_by_str}, Patient: {patient_oid_str}")
                    return fail("Slot đang được người khác giữ", 403)
                
                # Check if hold expired
                if new_slot.get("hold_until") and new_slot["hold_until"] < datetime.utcnow():
                    print(f"⚠️ [reschedule_appointment] Slot hold expired, but continuing...")
                    # Continue anyway, we'll book it
            else:
                print(f"❌ [reschedule_appointment] Slot in HOLD but not held by anyone")
                return fail("Slot chưa được giữ chỗ", 400)
        
        elif slot_status == "AVAILABLE":
            # ✅ Auto-hold the slot for reschedule
            print(f"🔄 [reschedule_appointment] Slot is AVAILABLE, auto-holding it...")
            try:
                hold_result = hold_slot(slot_id, patient_oid)
                if not hold_result[0]:  # hold_slot returns (success, message)
                    print(f"❌ [reschedule_appointment] Failed to hold slot: {hold_result[1]}")
                    return fail(f"Không thể giữ slot: {hold_result[1]}", 400)
                print(f"✅ [reschedule_appointment] Slot auto-held successfully")
            except Exception as e:
                print(f"❌ [reschedule_appointment] Error auto-holding slot: {e}")
                return fail("Không thể giữ slot", 400)
        
        elif slot_status == "BOOKED":
            # Check if this is the old appointment's slot (re-booking same slot is allowed)
            if old_slot_id and str(old_slot_id) == slot_id:
                print(f"🔄 [reschedule_appointment] Re-booking same slot, releasing old appointment first...")
                # Release the old slot first
                mark_slot_available(old_slot_id)
                # Then hold it again
                try:
                    hold_result = hold_slot(slot_id, patient_oid)
                    if not hold_result[0]:
                        return fail(f"Không thể giữ slot: {hold_result[1]}", 400)
                except Exception as e:
                    return fail("Không thể giữ slot", 400)
            else:
                print(f"❌ [reschedule_appointment] Slot already booked by another appointment")
                return fail("Slot đã được đặt bởi lịch hẹn khác", 400)
        
        else:
            print(f"❌ [reschedule_appointment] Slot in invalid status: {slot_status}")
            return fail(f"Slot không khả dụng (trạng thái: {slot_status})", 400)
        
        # Create new appointment
        try:
            print(f"🔄 [reschedule_appointment] Creating new appointment...")
            new_apt_id = create_appointment(patient_oid, new_slot, data)
            print(f"✅ [reschedule_appointment] New appointment created: {new_apt_id}")
        except Exception as e:
            print(f"❌ [reschedule_appointment] Failed to create appointment: {e}")
            import traceback
            traceback.print_exc()
            return fail(f"Không thể tạo lịch hẹn mới: {str(e)}", 500)
        
        try:
            mark_slot_booked(slot_id, patient_oid, new_apt_id)
            print(f"✅ [reschedule_appointment] Slot marked as booked")
        except Exception as e:
            print(f"⚠️ [reschedule_appointment] Failed to mark slot as booked: {e}")
            # Continue anyway, slot will be cleaned up later
        
        # Mark old appointment as rescheduled (not cancelled)
        mongo_db.appointments.update_one(
            {"_id": ObjectId(appointment_id)},
            {"$set": {
                "status": "rescheduled",
                "rescheduled_to_appointment_id": new_apt_id,
                "rescheduled_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Release old slot
        old_slot_id = old_appointment.get("slot_id")
        if old_slot_id:
            mark_slot_available(old_slot_id)
        
        # Get appointment details for email
        new_appointment = mongo_db.appointments.find_one({"_id": new_apt_id})
        doctor = mongo_db.doctors.find_one({"_id": new_appointment["doctor_id"]})
        patient = mongo_db.patients.find_one({"_id": patient_oid})
        if not patient:
            patient = mongo_db.users.find_one({"_id": patient_oid})
        
        # ✅ Send reschedule confirmation email
        print(f"📧 [reschedule_appointment] ========== STARTING EMAIL PROCESS ==========")
        import sys
        sys.stdout.flush()
        
        if not patient:
            print(f"⚠️ [reschedule_appointment] Patient not found: {patient_oid}")
        elif not doctor:
            print(f"⚠️ [reschedule_appointment] Doctor not found: {new_appointment.get('doctor_id')}")
        else:
            try:
                full_name = patient.get("full_name") or patient.get("name", "Bạn")
                email = patient.get("email")
                
                print(f"📧 [reschedule_appointment] Patient email: {email}, Full name: {full_name}")
                
                if not email:
                    print(f"⚠️ [reschedule_appointment] Patient has no email address")
                else:
                    # Format dates
                    old_date = old_appointment.get("date")
                    if isinstance(old_date, datetime):
                        old_date = old_date.strftime("%Y-%m-%d")
                    elif isinstance(old_date, str):
                        old_date = old_date
                    else:
                        old_date = str(old_date)
                    
                    new_date = new_appointment.get("date")
                    if isinstance(new_date, datetime):
                        new_date = new_date.strftime("%Y-%m-%d")
                    elif isinstance(new_date, str):
                        new_date = new_date
                    else:
                        new_date = str(new_date)
                    
                    doctor_name = doctor.get("name") or doctor.get("full_name") or "Bác sĩ"
                    doctor_specialty = doctor.get("specialty") or doctor.get("specialization") or ""
                    
                    print(f"📧 [reschedule_appointment] Doctor found: {doctor_name}, Specialty: {doctor_specialty}")
                    
                    old_appointment_data = {
                        "doctor_name": doctor_name,
                        "specialty": doctor_specialty,
                        "date": old_date,
                        "time": f"{old_appointment.get('start_time', '')} - {old_appointment.get('end_time', '')}",
                        "location": "Phòng khám Healthcare AI"
                    }
                    
                    new_appointment_data = {
                        "doctor_name": doctor_name,
                        "specialty": doctor_specialty,
                        "date": new_date,
                        "time": f"{new_appointment.get('start_time', '')} - {new_appointment.get('end_time', '')}",
                        "location": "Phòng khám Healthcare AI"
                    }
                    
                    print(f"📧 [reschedule_appointment] Old appointment: {old_date} {old_appointment_data['time']}")
                    print(f"📧 [reschedule_appointment] New appointment: {new_date} {new_appointment_data['time']}")
                    print(f"📧 [reschedule_appointment] Sending reschedule email to {email}")
                    email_sent = send_appointment_reschedule_email(
                        to=email,
                        full_name=full_name,
                        old_appointment_data=old_appointment_data,
                        new_appointment_data=new_appointment_data,
                        patient_id=str(patient_oid),
                        old_appointment_id=appointment_id,
                        new_appointment_id=str(new_apt_id)
                    )
                    
                    if email_sent:
                        print(f"✅ [reschedule_appointment] Reschedule email sent successfully to {email}")
                    else:
                        print(f"❌ [reschedule_appointment] Failed to send reschedule email to {email}")
            except Exception as email_error:
                import traceback
                print(f"❌ [reschedule_appointment] Email sending error (non-blocking): {email_error}")
                traceback.print_exc()
        
        # Emit socket events
        socketio.emit("appointment_updated", {
            "appointment_id": appointment_id,
            "status": "rescheduled",
            "rescheduled_to_appointment_id": str(new_apt_id),
            "patient_id": str(patient_oid),
            "doctor_id": str(new_appointment["doctor_id"])
        })
        
        socketio.emit("appointment_updated", {
            "appointment_id": str(new_apt_id),
            "status": "booked",
            "patient_id": str(patient_oid),
            "doctor_id": str(new_appointment["doctor_id"])
        })
        
        # Get populated new appointment for response
        new_appointment = mongo_db.appointments.find_one({"_id": new_apt_id})
        if new_appointment:
            # ✅ IMPORTANT: Store _id before convert_objectids_to_str
            appointment_id_str = str(new_apt_id)
            print(f"📋 [reschedule_appointment] Original _id type: {type(new_appointment.get('_id'))}")
            print(f"📋 [reschedule_appointment] Stored appointment_id_str: {appointment_id_str}")
            
            new_appointment["doctor_info"] = populate_doctor_info(new_appointment["doctor_id"])
            new_appointment["patient_info"] = populate_patient_info(new_appointment["patient_id"])
            # ✅ populate_slot_info expects slot_id, not the whole appointment object
            if new_appointment.get("slot_id"):
                slot_info = populate_slot_info(new_appointment["slot_id"])
                if slot_info:
                    new_appointment["slot_info"] = slot_info
            
            # ✅ Convert ObjectIds to strings
            print(f"📋 [reschedule_appointment] Before convert - _id: {new_appointment.get('_id')}, type: {type(new_appointment.get('_id'))}")
            new_appointment = convert_objectids_to_str(new_appointment)
            print(f"📋 [reschedule_appointment] After convert - _id: {new_appointment.get('_id')}, type: {type(new_appointment.get('_id'))}")
            
            # ✅ ALWAYS ensure _id and appointment_id are present (convert might not preserve _id)
            new_appointment["_id"] = appointment_id_str
            new_appointment["appointment_id"] = appointment_id_str
            new_appointment["id"] = appointment_id_str  # ✅ Also set id for compatibility
            
            print(f"📋 [reschedule_appointment] After manual set - _id: {new_appointment.get('_id')}")
            print(f"📋 [reschedule_appointment] After manual set - appointment_id: {new_appointment.get('appointment_id')}")
        else:
            # ✅ Fallback: create minimal appointment object with _id
            appointment_id_str = str(new_apt_id)
            new_appointment = {
                "_id": appointment_id_str,
                "appointment_id": appointment_id_str,
                "id": appointment_id_str
            }
            print(f"⚠️ [reschedule_appointment] Appointment not found, using fallback with _id: {appointment_id_str}")
        
        print(f"📋 [reschedule_appointment] Final new_appointment keys: {list(new_appointment.keys())}")
        print(f"📋 [reschedule_appointment] Final _id: {new_appointment.get('_id')}")
        print(f"📋 [reschedule_appointment] Final appointment_id: {new_appointment.get('appointment_id')}")
        print(f"📋 [reschedule_appointment] Final id: {new_appointment.get('id')}")
        
        return success({
            "message": "Đổi lịch khám thành công",
            "old_appointment_id": appointment_id,
            "new_appointment": new_appointment
        })
    
    except ValueError as e:
        print(f"❌ [reschedule_appointment] ValueError: {e}")
        import traceback
        traceback.print_exc()
        return fail(str(e), 400)
    except Exception as e:
        print(f"❌ [reschedule_appointment] Error: {e}")
        import traceback
        traceback.print_exc()
        return fail(f"Lỗi khi đổi lịch khám: {str(e)}", 500)


@appointments_bp.route("/appointments/<appointment_id>/confirm", methods=["POST"])
@auth_required(roles=["doctor"])
def confirm_appointment_route(appointment_id):
    """Bác sĩ xác nhận lịch khám"""
    user = get_current_user()
    data = request.get_json() or {}
    note = data.get("note", "")
    
    try:
        appointment = mongo_db.appointments.find_one({"_id": ObjectId(appointment_id)})
        
        if not appointment:
            return fail("Appointment không tồn tại", 404)
        
        doctor = mongo_db.doctors.find_one({"user_id": ObjectId(user["user_id"])})
        if not doctor or str(appointment["doctor_id"]) != str(doctor["_id"]):
            return fail("Bạn không có quyền xác nhận appointment này", 403)
        
        success_flag, message = confirm_appointment(appointment_id, user["user_id"], note)
        
        if not success_flag:
            return fail(message, 400 if "đã" in message else 500)
        
        # ✅ AUTO CREATE CONVERSATION & SEND WELCOME MESSAGE
        patient_id = appointment["patient_id"]
        doctor_id = appointment["doctor_id"]
        
        # Tìm hoặc tạo conversation giữa patient và doctor
        conversation = mongo_db.conversations.find_one({
            "mode": "patient",
            "patient_id": patient_id,
            "doctor_id": doctor_id
        })
        
        now = datetime.utcnow()
        
        if not conversation:
            # Tạo conversation mới
            doctor_info = mongo_db.users.find_one({"_id": ObjectId(user["user_id"])})
            doctor_name = doctor_info.get("full_name") or doctor_info.get("name") or "Bác sĩ"
            
            conversation_doc = {
                "mode": "patient",
                "patient_id": patient_id,
                "doctor_id": doctor_id,
                "title": f"Chat với BS {doctor_name}",
                "created_at": now,
                "updated_at": now,
                "last_message": ""
            }
            result = mongo_db.conversations.insert_one(conversation_doc)
            conversation_id = result.inserted_id
            
            print(f"✅ Created conversation {conversation_id} for patient {patient_id} and doctor {doctor_id}")
        else:
            conversation_id = conversation["_id"]
            print(f"✅ Found existing conversation {conversation_id}")
        
        # Gửi tin nhắn chào mừng tự động từ bác sĩ
        doctor_info = mongo_db.users.find_one({"_id": ObjectId(user["user_id"])})
        doctor_name = doctor_info.get("full_name") or doctor_info.get("name") or "Bác sĩ"
        specialty = doctor_info.get("specialty") or ""
        specialty_text = f" chuyên khoa {specialty}" if specialty else ""
        
        welcome_message = f"Xin chào! Tôi là BS {doctor_name}{specialty_text}. Tôi sẽ khám và tư vấn sức khỏe cho bạn. Bạn có thắc mắc gì về tình trạng sức khỏe hay lịch khám của mình, hãy nhắn tin cho tôi nhé! 🩺"
        
        # Insert welcome message
        mongo_db.messages.insert_one({
            "conversation_id": conversation_id,
            "sender": "doctor",
            "text": welcome_message,
            "created_at": now,
            "is_read": True,
            "is_auto": True
        })
        
        # Update conversation
        mongo_db.conversations.update_one(
            {"_id": conversation_id},
            {"$set": {"updated_at": now, "last_message": welcome_message}}
        )
        
        # Emit socket events with confirm_note
        socketio.emit("appointment_updated", {
            "appointment_id": appointment_id,
            "status": appointment.get("status"),
            "is_confirmed": True,
            "confirmed_at": now.isoformat(),
            "confirm_note": note,  # ✅ Include doctor's confirmation note
            "patient_id": str(patient_id),
            "doctor_id": str(doctor_id)
        })
        
        # Emit new message event
        socketio.emit("new_message", {
            "conversation_id": str(conversation_id),
            "sender": "doctor",
            "text": welcome_message,
            "timestamp": now.isoformat() + "Z",
        })
        
        socketio.emit("receive_message", {
            "conversation_id": str(conversation_id),
            "sender": "doctor",
            "text": welcome_message,
            "timestamp": now.isoformat() + "Z",
        }, room=f"room:{str(conversation_id)}")
        
        print(f"✅ Sent welcome message to conversation {conversation_id}")
        
        # ✅ Send appointment confirmation email when doctor confirms
        print(f"📧 [confirm_appointment] ========== STARTING EMAIL PROCESS ==========")
        import sys
        sys.stdout.flush()
        
        try:
            # Get patient info
            print(f"📧 [confirm_appointment] Getting patient info for patient_id: {patient_id}")
            patient = mongo_db.patients.find_one({"_id": patient_id})
            if not patient:
                print(f"📧 [confirm_appointment] Patient not found in patients collection, trying users...")
                patient = mongo_db.users.find_one({"_id": patient_id})
            
            if not patient:
                print(f"⚠️ [confirm_appointment] Patient not found: {patient_id}")
            else:
                full_name = patient.get("full_name") or patient.get("name", "Bạn")
                email = patient.get("email")
                
                print(f"📧 [confirm_appointment] Patient email: {email}, Full name: {full_name}")
                
                if not email:
                    print(f"⚠️ [confirm_appointment] Patient has no email address")
                else:
                    # Get doctor info
                    print(f"📧 [confirm_appointment] Getting doctor info for doctor_id: {doctor_id}")
                    doctor_info = mongo_db.users.find_one({"_id": ObjectId(user["user_id"])})
                    doctor = mongo_db.doctors.find_one({"_id": doctor_id})
                    
                    if doctor and doctor_info:
                        doctor["name"] = doctor_info.get("name") or doctor.get("full_name")
                        doctor["specialty"] = doctor_info.get("specialty") or doctor.get("specialty")
                    
                    if not doctor:
                        print(f"⚠️ [confirm_appointment] Doctor not found: {doctor_id}")
                    else:
                        # Format appointment date
                        appointment_date = appointment.get("date")
                        if isinstance(appointment_date, datetime):
                            appointment_date = appointment_date.strftime("%Y-%m-%d")
                        elif isinstance(appointment_date, str):
                            appointment_date = appointment_date
                        else:
                            appointment_date = str(appointment_date)
                        
                        doctor_name = doctor.get("name") or doctor.get("full_name") or "Bác sĩ"
                        doctor_specialty = doctor.get("specialty") or doctor.get("specialization") or "Chuyên khoa"
                        
                        print(f"📧 [confirm_appointment] Doctor found: {doctor_name}, Specialty: {doctor_specialty}")
                        
                        appointment_data = {
                            "doctor_name": doctor_name,
                            "specialty": doctor_specialty,
                            "date": appointment_date,
                            "time": f"{appointment.get('start_time', '')} - {appointment.get('end_time', '')}",
                            "location": "Phòng khám Healthcare AI"
                        }
                        
                        print(f"📧 [confirm_appointment] Sending confirmation email to {email}")
                        print(f"📧 [confirm_appointment] Appointment data: {appointment_data}")
                        
                        email_sent = send_appointment_confirmation_email(
                            to=email,
                            full_name=full_name,
                            appointment_data=appointment_data,
                            patient_id=str(patient_id),
                            appointment_id=appointment_id
                        )
                        
                        if email_sent:
                            print(f"✅ [confirm_appointment] Confirmation email sent successfully to {email}")
                        else:
                            print(f"❌ [confirm_appointment] Failed to send confirmation email to {email}")
        except Exception as email_error:
            import traceback
            print(f"❌ [confirm_appointment] Email sending error (non-blocking): {email_error}")
            traceback.print_exc()
        
        response_data = {
            "message": message,
            "appointment_id": appointment_id,
            "status": "confirmed",
            "confirmed_at": now.isoformat(),
            "conversation_id": str(conversation_id),
            "welcome_sent": True
        }
        
        if note:
            response_data["confirm_note"] = note
        
        return success(response_data)
    
    except Exception as e:
        print(f"❌ Error in confirm_appointment: {e}")
        import traceback
        traceback.print_exc()
        return fail(str(e), 500)


# =============== ADMIN: GET ALL APPOINTMENTS ===============

@appointments_bp.route("/appointments", methods=["GET"])
@auth_required(roles=["admin", "doctor"])
def get_all_appointments_route():
    """Admin/Doctor xem tất cả appointments"""
    try:
        query_filter = {}
        status_filter = request.args.get("status")
        if status_filter:
            query_filter["status"] = status_filter
        
        search = request.args.get("search")
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 100))
        
        appointments, total = get_all_appointments(query_filter, page, limit)
        
        result = []
        for apt in appointments:
            convert_objectids_to_str(apt)
            
            apt["patient"] = populate_patient_info(apt["patient_id"])
            apt["doctor"] = populate_doctor_info(apt["doctor_id"])
            
            # Try to get time from slot first, fallback to appointment fields
            if apt.get("slot_id"):
                slot_info = populate_slot_info(apt["slot_id"])
                if slot_info:
                    apt["start_time"] = slot_info["start_time"]
                    apt["end_time"] = slot_info["end_time"]
                    apt["time"] = f"{slot_info['start_time']} - {slot_info['end_time']}"
                else:
                    # Slot not found, use appointment_time if available
                    apt["start_time"] = apt.get("appointment_time", "N/A")
                    apt["end_time"] = "N/A"
                    apt["time"] = apt.get("appointment_time", "N/A")
            else:
                # No slot_id, use appointment_time directly
                apt["start_time"] = apt.get("appointment_time", "N/A")
                apt["end_time"] = "N/A"
                apt["time"] = apt.get("appointment_time", "N/A")
            
            if search:
                search_lower = search.lower()
                patient_name = apt["patient"]["name"].lower()
                doctor_name = apt["doctor"]["name"].lower()
                
                if search_lower in patient_name or search_lower in doctor_name:
                    result.append(apt)
            else:
                result.append(apt)
        
        return jsonify({
            "success": True,
            "data": result,
            "total": total,
            "page": page,
            "limit": limit,
        })
    
    except Exception as e:
        print(f"❌ Error in get_all_appointments: {e}")
        return fail(str(e), 500)


@appointments_bp.route("/appointments/counts-by-patient", methods=["GET"])
@auth_required(roles=["admin"])
def get_appointment_counts_by_patient():
    """Admin: Get appointment counts cho tất cả patients"""
    try:
        users = list(mongo_db.users.find({"role": "patient"}))
        counts = {}
        
        for user in users:
            count = mongo_db.appointments.count_documents({"patient_id": user["_id"]})
            patient_record_id = user.get("patient_id")
            
            if patient_record_id:
                counts[str(patient_record_id)] = counts.get(str(patient_record_id), 0) + count
            else:
                counts[str(user["_id"])] = count
        
        return jsonify({
            "success": True,
            "data": counts,
        })
    
    except Exception as e:
        print(f"❌ Error in get_appointment_counts_by_patient: {e}")
        return fail(str(e), 500)


@appointments_bp.route("/appointments/doctor", methods=["GET"])
@auth_required(roles=["doctor"])
def get_doctor_appointments_route():
    """Lấy danh sách appointments của doctor"""
    user = get_current_user()
    
    try:
        user_id = user.get("user_id")
        
        if not user_id:
            return fail("Không thể xác định user_id", 400)
        
        user_oid = ObjectId(user_id)
        
        # Verify user is actually a doctor
        doctor_user = mongo_db.users.find_one({"_id": user_oid, "role": "doctor"})
        if not doctor_user:
            return fail("Không tìm thấy thông tin bác sĩ", 404)
        
        # ✅ IMPORTANT: Appointments có thể lưu doctor_id là users._id HOẶC doctors._id
        # Cần check cả 2 trường hợp
        doctor_record = mongo_db.doctors.find_one({"user_id": user_oid})
        
        # Build query to find appointments for this doctor
        # Case 1: doctor_id = users._id (direct)
        # Case 2: doctor_id = doctors._id (through doctors collection)
        if doctor_record:
            # Query appointments where doctor_id matches either users._id or doctors._id
            doctor_ids = [user_oid, doctor_record["_id"]]
        else:
            # Only users._id
            doctor_ids = [user_oid]
        
        query_filter = {
            "date_from": request.args.get("date_from"),
            "date_to": request.args.get("date_to"),
            "status": request.args.get("status")
        }
        
        # Get appointments for both possible doctor_ids
        all_appointments = []
        for did in doctor_ids:
            appointments = get_appointments_by_doctor(did, query_filter)
            all_appointments.extend(appointments)
        
        # Remove duplicates by _id
        seen = set()
        unique_appointments = []
        for apt in all_appointments:
            apt_id = str(apt["_id"])
            if apt_id not in seen:
                seen.add(apt_id)
                unique_appointments.append(apt)
        
        valid_appointments = []
        for apt in unique_appointments:
            try:
                original_patient_id = apt["patient_id"]
                original_slot_id = apt.get("slot_id")
                
                convert_objectids_to_str(apt)
                
                if apt.get("start_time") is None and original_slot_id:
                    slot = mongo_db.time_slots.find_one({"_id": original_slot_id})
                    if slot:
                        apt["start_time"] = slot.get("start_time", "N/A")
                        apt["end_time"] = slot.get("end_time", "N/A")
                
                patient_info = populate_patient_info(str(original_patient_id))
                apt["patient_name"] = patient_info["name"]
                apt["patient_phone"] = patient_info["phone"]
                apt["patient_email"] = patient_info["email"]
                
                # ✅ Also add full patient object for frontend consistency
                apt["patient"] = {
                    "_id": patient_info["_id"],
                    "full_name": patient_info["name"],
                    "phone": patient_info["phone"],
                    "email": patient_info["email"]
                }
                
                valid_appointments.append(apt)
                
            except Exception as e:
                print(f"⚠️ Error processing appointment {apt.get('_id')}: {e}")
                continue
        
        return success(valid_appointments)
    
    except Exception as e:
        print(f"❌ Error in get_doctor_appointments: {e}")
        import traceback
        traceback.print_exc()
        return fail(str(e), 500)


@appointments_bp.route("/appointments/<appointment_id>", methods=["GET"])
@auth_required()
def get_appointment_details(appointment_id):
    """Lấy chi tiết 1 appointment"""
    user = get_current_user()
    
    try:
        appointment = mongo_db.appointments.find_one({"_id": ObjectId(appointment_id)})
        
        if not appointment:
            return fail("Appointment không tồn tại", 404)
        
        is_patient = str(appointment["patient_id"]) == user["user_id"]
        doctor_oid = get_doctor_oid_from_user(user)
        is_doctor = appointment["doctor_id"] == doctor_oid
        is_admin = user["role"] == "admin"
        
        if not (is_patient or is_doctor or is_admin):
            return fail("Bạn không có quyền xem appointment này", 403)
        
        convert_objectids_to_str(appointment)
        
        appointment["doctor_info"] = populate_doctor_info(appointment["doctor_id"])
        appointment["patient_info"] = populate_patient_info(appointment["patient_id"])
        
        slot_info = populate_slot_info(appointment["slot_id"])
        if slot_info:
            appointment["slot_info"] = slot_info
        
        return success(appointment)
    
    except Exception as e:
        return fail(str(e), 500)


@appointments_bp.route("/appointments/<appointment_id>", methods=["DELETE"])
@auth_required(roles=["admin", "doctor"])  # ✅ Allow doctor to delete their own appointments
def delete_appointment_route(appointment_id):
    """Admin/Doctor: Xóa appointment"""
    try:
        user_id = g.current_user['user_id']
        user_role = g.current_user['role']
        
        # Check if appointment exists first
        apt = mongo_db.appointments.find_one({"_id": ObjectId(appointment_id)})
        if not apt:
            return fail("Lịch hẹn không tồn tại", 404)
        
        # ✅ Doctor can only delete their own appointments
        if user_role == "doctor":
            if str(apt.get('doctor_id')) != user_id:
                return fail("Bạn chỉ có thể xóa lịch hẹn của chính mình", 403)
        
        success_flag, message, slot_id = delete_appointment(appointment_id)
        
        if not success_flag:
            return fail(message, 404 if "không tồn tại" in message else 500)
        
        if slot_id:
            mongo_db.time_slots.update_one(
                {"_id": ObjectId(slot_id)},
                {
                    "$set": {
                        "status": "available",
                        "updated_at": datetime.utcnow()
                    },
                    "$unset": {
                        "held_by": "",
                        "hold_expires_at": ""
                    }
                }
            )
        
        return success({
            "message": message,
            "appointment_id": appointment_id
        })
    
    except Exception as e:
        print(f"❌ Error deleting appointment: {e}")
        return fail(str(e), 500)


@appointments_bp.route("/specialties", methods=["GET"])
def get_specialties():
    """Lấy danh sách 3 chuyên khoa"""
    try:
        specialties_cursor = mongo_db.specialties.find(
            {"code": {"$in": ["general_medicine", "obstetrics", "pediatrics"]}}
        )
        specialties = list(specialties_cursor)
        
        for spec in specialties:
            if "_id" in spec:
                spec["_id"] = str(spec["_id"])
            spec["id"] = spec.get("code")
        
        if not specialties:
            specialties = [
                {"id": "general_medicine", "code": "general_medicine", "name": "Nội tổng quát", "icon": "🩺"},
                {"id": "obstetrics", "code": "obstetrics", "name": "Sản phụ khoa", "icon": "🤰"},
                {"id": "pediatrics", "code": "pediatrics", "name": "Nhi khoa", "icon": "👶"}
            ]
        
        return success(specialties)
    except Exception:
        return success([
            {"id": "general_medicine", "code": "general_medicine", "name": "Nội tổng quát", "icon": "🩺"},
            {"id": "obstetrics", "code": "obstetrics", "name": "Sản phụ khoa", "icon": "🤰"},
            {"id": "pediatrics", "code": "pediatrics", "name": "Nhi khoa", "icon": "👶"}
        ])


# =============== COMPLETE CONSULTATION & POST-CONSULTATION EMAIL ===============

@appointments_bp.route("/appointments/<appointment_id>/complete", methods=["POST", "OPTIONS"])
@auth_required(roles=["doctor", "admin"])
def complete_consultation(appointment_id):
    """
    ✅ Bác sĩ hoàn tất buổi khám và gửi email tóm tắt + link đánh giá
    
    Body:
    {
        "diagnosis": "Chẩn đoán",
        "notes": "Ghi chú",
        "instructions": "Hướng dẫn điều trị",
        "prescription": {...}  # Optional
    }
    """
    if request.method == "OPTIONS":
        return "", 204
    
    try:
        # Validate appointment_id
        try:
            apt_oid = ObjectId(appointment_id)
        except:
            return fail("appointment_id không hợp lệ", 400)
        
        # Get appointment
        appointment = mongo_db.appointments.find_one({"_id": apt_oid})
        if not appointment:
            return fail("Lịch hẹn không tồn tại", 404)
        
        # Check if already completed
        if appointment.get("status") == "DONE":
            return fail("Lịch hẹn đã hoàn tất trước đó", 400)
        
        # Get data
        data = request.get_json() or {}
        diagnosis = data.get("diagnosis", "").strip()
        notes = data.get("notes", "").strip()
        instructions = data.get("instructions", "").strip()
        prescription = data.get("prescription")
        
        if not diagnosis:
            return fail("Thiếu chẩn đoán (diagnosis)", 400)
        
        # Update appointment status to DONE
        update_data = {
            "status": "DONE",
            "completed_at": datetime.utcnow(),
            "diagnosis": diagnosis,
            "notes": notes,
            "instructions": instructions,
            "updated_at": datetime.utcnow()
        }
        
        if prescription:
            update_data["prescription"] = prescription
        
        mongo_db.appointments.update_one(
            {"_id": apt_oid},
            {"$set": update_data}
        )
        
        print(f"✅ Appointment {appointment_id} marked as DONE")
        
        # ✅ Save consultation summary to EHR (optional)
        try:
            ehr_data = {
                "patient_id": appointment.get("patient_id"),
                "doctor_id": appointment.get("doctor_id"),
                "appointment_id": apt_oid,
                "visit_date": appointment.get("appointment_time") or datetime.utcnow(),
                "diagnosis": diagnosis,
                "treatment_notes": notes,
                "instructions": instructions,
                "prescription": prescription,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            ehr_result = mongo_db.ehr.insert_one(ehr_data)
            print(f"✅ EHR record created: {ehr_result.inserted_id}")
        except Exception as ehr_error:
            print(f"⚠️ EHR creation failed (non-blocking): {ehr_error}")
        
        # ✅ Send post-consultation email with review link
        try:
            # Get patient info
            patient_id = appointment.get("patient_id")
            patient = mongo_db.patients.find_one({"_id": patient_id})
            if not patient:
                patient = mongo_db.users.find_one({"_id": patient_id})
            
            # Get doctor info
            doctor_id = appointment.get("doctor_id")
            doctor = mongo_db.users.find_one({"_id": doctor_id})
            
            if patient and doctor:
                full_name = patient.get("full_name") or patient.get("name", "Bạn")
                email = patient.get("email")
                
                if email:
                    # Format date
                    appointment_date = appointment.get("date")
                    if isinstance(appointment_date, datetime):
                        date_str = appointment_date.strftime("%Y-%m-%d")
                    elif isinstance(appointment_date, str):
                        date_str = appointment_date
                    else:
                        date_str = datetime.utcnow().strftime("%Y-%m-%d")
                    
                    appointment_data = {
                        "doctor_name": doctor.get("name") or doctor.get("full_name", "Bác sĩ"),
                        "specialty": doctor.get("specialty", ""),
                        "date": date_str
                    }
                    
                    rating_url = f"http://localhost:3000/appointments/{appointment_id}/rate"
                    
                    email_sent = send_post_consultation_email(
                        to=email,
                        full_name=full_name,
                        appointment_data=appointment_data,
                        rating_url=rating_url,
                        patient_id=str(patient_id),
                        appointment_id=appointment_id,
                        doctor_id=str(doctor_id)
                    )
                    
                    if email_sent:
                        print(f"✅ Post-consultation email sent to {email}")
                        
                        # Log email sent
                        mongo_db.email_logs.insert_one({
                            "type": "post_consultation",
                            "to": email,
                            "appointment_id": apt_oid,
                            "patient_id": patient_id,
                            "sent_at": datetime.utcnow(),
                            "status": "sent"
                        })
                    else:
                        print(f"⚠️ Failed to send post-consultation email to {email}")
        except Exception as email_error:
            print(f"❌ Email sending error (non-blocking): {email_error}")
            import traceback
            traceback.print_exc()
        
        return success({
            "appointment_id": appointment_id,
            "status": "DONE",
            "diagnosis": diagnosis,
            "message": "Hoàn tất khám thành công! Email tóm tắt đã được gửi cho bệnh nhân."
        }, message="Hoàn tất khám thành công!")
    
    except Exception as e:
        print(f"❌ Error in complete_consultation: {e}")
        import traceback
        traceback.print_exc()
        return fail(str(e), 500)


# =============== ADMIN: GENERATE TIME SLOTS ===============

@appointments_bp.route("/time-slots/generate", methods=["POST"])
@auth_required(roles=["admin"])
def admin_generate_time_slots():
    """
    Admin generate time slots cho bác sĩ
    POST /api/time-slots/generate
    
    Body: {
        "doctor_id": "...",
        "start_date": "2025-11-20",
        "end_date": "2025-12-20",
        "working_hours": {
            "start": "08:00",
            "end": "17:00",
            "break": ["12:00", "13:00"]
        },
        "slot_duration": 30,
        "working_days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
    }
    """
    print("🚀 admin_generate_time_slots called!")
    data = request.get_json() or {}
    print(f"📦 Request data: {data}")
    
    doctor_id = data.get("doctor_id")
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    working_hours = data.get("working_hours", {})
    slot_duration = data.get("slot_duration", 30)
    working_days = data.get("working_days", ["monday", "tuesday", "wednesday", "thursday", "friday"])
    
    if not doctor_id:
        return fail("Thiếu doctor_id", 400)
    if not start_date or not end_date:
        return fail("Thiếu start_date hoặc end_date", 400)
    if not working_hours.get("start") or not working_hours.get("end"):
        return fail("Thiếu working_hours", 400)
    
    try:
        doctor_oid = ObjectId(doctor_id)
    except Exception as e:
        print(f"❌ Invalid doctor_id: {e}")
        return fail("doctor_id không hợp lệ", 400)
    
    print(f"🔍 Looking for doctor: {doctor_oid}")
    # ✅ Tìm doctor trong cả 2 collections: doctors hoặc users
    doctor = mongo_db.doctors.find_one({"_id": doctor_oid})
    if not doctor:
        doctor = mongo_db.users.find_one({"_id": doctor_oid, "role": "doctor"})
    
    if not doctor:
        print(f"❌ Doctor not found in both collections: {doctor_oid}")
        return fail("Bác sĩ không tồn tại", 404)
    
    print(f"✅ Found doctor: {doctor.get('full_name') or doctor.get('name')}")
    
    try:
        from datetime import timedelta
        from app.services.scheduler_service import SchedulerService
        
        print(f"📅 Parsing dates: {start_date} to {end_date}")
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        
        if start > end:
            return fail("start_date phải trước end_date", 400)
        
        working_days_lower = [d.lower() for d in working_days]
        day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        
        total_slots = 0
        current_date = start
        
        while current_date <= end:
            date_str = current_date.strftime("%Y-%m-%d")
            weekday = current_date.weekday()
            day_name = day_names[weekday]
            
            if day_name in working_days_lower:
                
                # ✅ Check existing slots - date field là datetime object
                existing = mongo_db.time_slots.count_documents({
                    "doctor_id": doctor_oid,
                    "date": current_date
                })
                
                if existing == 0:
                    print(f"🔨 Creating slots for {date_str} (weekday: {day_name})")
                    slot_ids = SchedulerService.generate_time_slots(
                        doctor_id=doctor_oid,
                        date=date_str,
                        working_hours=working_hours,
                        slot_duration=slot_duration
                    )
                    total_slots += len(slot_ids)
                    print(f"✅ Generated {len(slot_ids)} slots for {date_str}")
                else:
                    print(f"⏭️ Skipping {date_str} - {existing} slots already exist")
            else:
                print(f"⏭️ Skipping {date_str} - not a working day ({day_name})")
            
            current_date += timedelta(days=1)
        
        print(f"🎉 Total slots created: {total_slots}")
        
        try:
            socketio.emit("slots_generated", {
                "doctor_id": doctor_id,
                "doctor_name": doctor.get("full_name") or doctor.get("name"),
                "slots_count": total_slots,
                "start_date": start_date,
                "end_date": end_date,
                "timestamp": datetime.utcnow().isoformat() + 'Z'
            })
            print("✅ Socket event emitted")
        except Exception as socket_err:
            print(f"⚠️ Socket emit error: {socket_err}")
        
        response_data = {
            "total_slots": total_slots,
            "doctor_id": doctor_id,
            "doctor_name": doctor.get("full_name") or doctor.get("name"),
            "start_date": start_date,
            "end_date": end_date
        }
        print(f"✅ Returning success response: {response_data}")
        return success(response_data, message=f"Đã tạo {total_slots} time slots thành công")
        
    except Exception as e:
        print(f"❌ Error generating slots: {e}")
        import traceback
        traceback.print_exc()
        return fail(str(e), 500)
