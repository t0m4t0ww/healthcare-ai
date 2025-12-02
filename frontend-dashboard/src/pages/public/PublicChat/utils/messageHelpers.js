/**
 * Normalize message sender to prevent role confusion on reload
 */
export const normalizeSender = (msg, conv, currentUser) => {
  const raw = (msg.sender ?? msg.author_type ?? msg.role ?? msg.from ?? '')
    .toString()
    .toLowerCase();
  const authorId = msg.author_id ?? msg.user_id ?? msg.sender_id ?? msg.owner_id ?? null;

  // 1) If server explicitly says the role, use it
  if (['patient', 'doctor', 'ai', 'assistant', 'system'].includes(raw)) {
    return raw === 'assistant' ? 'ai' : raw;
  }

  // 2) Infer from conversation IDs
  if (authorId && conv) {
    if (authorId === conv.patient_id) return 'patient';
    if (authorId === conv.doctor_id) return 'doctor';
  }

  // 3) Fallback to current user
  if (authorId && currentUser) {
    // ✅ Check both user.id (users collection) and user.patient_id (patients collection)
    const userId = currentUser.id || currentUser._id;
    const patientId = currentUser.patient_id;
    
    if (authorId === userId || (patientId && authorId === patientId)) {
      return 'patient';
    }
  }

  // 4) Final fallback based on conversation mode
  return conv?.mode === 'ai' ? 'ai' : 'doctor';
};

/**
 * Map doctor experience from various API response formats
 */
export const mapDoctorExperience = (doctor) => {
  if (!doctor) return null;
  
  // Priority 1: years_of_experience from API (main field from backend)
  let experienceYears = doctor.years_of_experience;
  
  // Priority 2: experience field (alternative field from backend)
  if (experienceYears == null && doctor.experience != null) {
    experienceYears = doctor.experience;
  }
  
  // Priority 3: experience_years (if already mapped)
  if (experienceYears == null && doctor.experience_years != null) {
    experienceYears = doctor.experience_years;
  }
  
  // Fallback: calculate from doctor_profile
  if (experienceYears == null) {
    const profile = doctor.doctor_profile || {};
    experienceYears = profile.years_of_experience || 0;
    
    // Calculate from started_at
    if (!experienceYears && profile.started_at) {
      const startYear = new Date(profile.started_at).getFullYear();
      const currentYear = new Date().getFullYear();
      experienceYears = Math.max(0, currentYear - startYear);
    }
    
    // Calculate from graduation_year (add internship buffer)
    if (!experienceYears && profile.graduation_year) {
      const currentYear = new Date().getFullYear();
      experienceYears = Math.max(0, currentYear - profile.graduation_year - 2);
    }
  }
  
  return {
    ...doctor,
    experience_years: Math.max(0, Math.floor(experienceYears || 0))
  };
};

/**
 * Format message for display
 */
export const formatMessage = (msg, conv, currentUser) => ({
  id: msg._id || msg.id || msg.message_id || Date.now().toString(),
  role: normalizeSender(msg, conv, currentUser),
  text: msg.text || msg.message || msg.content,
  timestamp: new Date(msg.created_at || msg.timestamp).toISOString()
});
