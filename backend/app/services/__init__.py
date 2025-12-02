# backend/app/services/__init__.py
"""
Services package for Healthcare AI
"""

from app.services.appointment_service import AppointmentService
from app.services.ehr_service import EHRService

__all__ = [
    'AppointmentService',
    'EHRService'
]