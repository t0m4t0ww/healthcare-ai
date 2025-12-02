import { useState, useCallback, useEffect } from 'react';
import { getDoctors } from '../../../../services/services';
import { mapDoctorExperience } from '../utils/messageHelpers';

export const useDoctorSelection = () => {
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showDoctorSelector, setShowDoctorSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load available doctors
  const loadDoctors = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('📥 Loading available doctors...');
      const doctors = await getDoctors();
      const mappedDoctors = (Array.isArray(doctors) ? doctors : doctors.data || [])
        .map(mapDoctorExperience);
      setAvailableDoctors(mappedDoctors);
      console.log(`✅ Loaded ${mappedDoctors.length} doctors`);
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-load doctors on mount
  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const handleDoctorSelect = useCallback((doctor) => {
    const mappedDoctor = mapDoctorExperience(doctor);
    setSelectedDoctor(mappedDoctor);
    setShowDoctorSelector(false);
    console.log('✅ Selected doctor:', mappedDoctor.name);
  }, []);

  const openDoctorSelector = useCallback(() => {
    setShowDoctorSelector(true);
  }, []);

  const closeDoctorSelector = useCallback(() => {
    setShowDoctorSelector(false);
  }, []);

  return {
    availableDoctors,
    selectedDoctor,
    showDoctorSelector,
    isLoading,
    loadDoctors,
    handleDoctorSelect,
    openDoctorSelector,
    closeDoctorSelector,
    setSelectedDoctor
  };
};
