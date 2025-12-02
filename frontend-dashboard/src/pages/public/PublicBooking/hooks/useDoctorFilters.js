import { useState, useCallback } from 'react';

export const useDoctorFilters = (doctors) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');

  const filteredDoctors = doctors.filter(doctor => {
    // Search filter
    const matchesSearch = !searchQuery || 
      doctor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doctor.specialty || doctor.doctor_profile?.specialization || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    // Specialty filter
    const matchesSpecialty = specialtyFilter === 'all' || 
      (doctor.specialty || doctor.doctor_profile?.specialization || '').toLowerCase() === specialtyFilter.toLowerCase();
    
    // Gender filter
    const matchesGender = genderFilter === 'all' || 
      (doctor.gender || '').toLowerCase() === genderFilter.toLowerCase();
    
    // Rating filter
    const matchesRating = ratingFilter === 'all' || 
      (doctor.rating || 0) >= parseFloat(ratingFilter);
    
    return matchesSearch && matchesSpecialty && matchesGender && matchesRating;
  });

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setSpecialtyFilter('all');
    setGenderFilter('all');
    setRatingFilter('all');
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    specialtyFilter,
    setSpecialtyFilter,
    genderFilter,
    setGenderFilter,
    ratingFilter,
    setRatingFilter,
    filteredDoctors,
    resetFilters,
    hasActiveFilters: searchQuery || specialtyFilter !== 'all' || genderFilter !== 'all' || ratingFilter !== 'all'
  };
};
