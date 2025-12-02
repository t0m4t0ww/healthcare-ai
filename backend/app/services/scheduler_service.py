# backend/app/services/scheduler_service.py
from datetime import datetime, timedelta
from bson import ObjectId
from app.extensions import mongo_db

class SchedulerService:
    @staticmethod
    def generate_time_slots(doctor_id, date, working_hours, slot_duration=30):
        """
        Tạo time slots cho bác sĩ theo working hours
        Args:
            doctor_id: str or ObjectId
            date: str (YYYY-MM-DD)
            working_hours: {
                "start": "08:00",
                "end": "17:00",
                "break": ["12:00", "13:00"]  # optional
            }
            slot_duration: int (minutes)
        Returns:
            List[str]: slot_ids
        """
        try:
            doctor_oid = ObjectId(doctor_id) if isinstance(doctor_id, str) else doctor_id
        except:
            raise ValueError("Invalid doctor_id")
        
        # Parse working hours
        start_time = datetime.strptime(working_hours["start"], "%H:%M")
        end_time = datetime.strptime(working_hours["end"], "%H:%M")
        break_times = working_hours.get("break", [])
        
        # Generate slots
        slots = []
        current_time = start_time
        
        while current_time < end_time:
            next_time = current_time + timedelta(minutes=slot_duration)
            
            # Skip break time
            is_break = False
            if break_times:
                current_str = current_time.strftime("%H:%M")
                for i in range(0, len(break_times), 2):
                    if i+1 < len(break_times):
                        break_start = break_times[i]
                        break_end = break_times[i+1]
                        if break_start <= current_str < break_end:
                            is_break = True
                            break
            
            if not is_break:
                # Parse date string to datetime object for MongoDB schema
                date_obj = datetime.strptime(date, "%Y-%m-%d") if isinstance(date, str) else date
                
                slot = {
                    "doctor_id": doctor_oid,
                    "date": date_obj,  # ✅ datetime object
                    "start_time": current_time.strftime("%H:%M"),
                    "end_time": next_time.strftime("%H:%M"),
                    "status": "available",  # ✅ lowercase
                    "held_by": None,
                    "hold_expires_at": None,
                    "max_patients": 1,
                    "consultation_type": "consultation",
                    "created_at": datetime.utcnow()
                }
                slots.append(slot)
            
            current_time = next_time
        
        # Insert to DB
        if slots:
            result = mongo_db.time_slots.insert_many(slots)
            return [str(oid) for oid in result.inserted_ids]
        return []