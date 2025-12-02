import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, Star, Stethoscope, Users, Award } from 'lucide-react';
import { SPECIALTIES, GENDERS, RATINGS } from '../utils/constants';

export const DoctorFilters = ({ 
  searchQuery,
  setSearchQuery,
  specialtyFilter,
  setSpecialtyFilter,
  genderFilter,
  setGenderFilter,
  ratingFilter,
  setRatingFilter,
  hasActiveFilters,
  resetFilters,
  totalDoctors,
  filteredCount,
  doctors = [] 
}) => {
  // ✅ Get unique specialties from actual doctors
  const availableSpecialties = React.useMemo(() => {
    const specialties = new Set();
    doctors.forEach(doctor => {
      const specialty = doctor.specialty || doctor.doctor_profile?.specialization || doctor.specialty_name;
      if (specialty) {
        specialties.add(specialty.toLowerCase());
      }
    });
    return Array.from(specialties);
  }, [doctors]);

  // ✅ Check if only one specialty exists
  const hasOnlyOneSpecialty = availableSpecialties.length === 1;
  const singleSpecialty = hasOnlyOneSpecialty ? availableSpecialties[0] : null;
  
  // ✅ Get label for single specialty
  const singleSpecialtyLabel = React.useMemo(() => {
    if (!singleSpecialty) return null;
    const specialtyOption = SPECIALTIES.find(s => 
      s.value !== 'all' && s.value.toLowerCase() === singleSpecialty
    );
    if (specialtyOption) {
      return specialtyOption.label.replace('🩺 ', ''); 
    }
    if (singleSpecialty === 'general_medicine') return 'Nội tổng quát';
    if (singleSpecialty === 'obstetrics') return 'Sản phụ khoa';
    if (singleSpecialty === 'pediatrics') return 'Nhi khoa';
    return 'Nội tổng quát';
  }, [singleSpecialty]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-white to-emerald-50/30 rounded-2xl p-5 shadow-lg border-2 border-emerald-100"
    >
      {/* ✅ BỐ CỤC MỚI: Flex Container chính chia làm 2 phần Trái/Phải */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        
        {/* --- PHẦN 1: TIÊU ĐỀ (BÊN TRÁI) --- */}
        <div className="flex items-center gap-3 min-w-fit">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-md shadow-emerald-200">
            <Filter size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">Tìm kiếm bác sĩ</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              {filteredCount === totalDoctors 
                ? `Tổng ${totalDoctors} bác sĩ`
                : `Hiển thị ${filteredCount}/${totalDoctors} kết quả`
              }
            </p>
          </div>
        </div>

        {/* --- PHẦN 2: CÔNG CỤ TÌM KIẾM & BỘ LỌC (BÊN PHẢI) --- */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 flex-1 xl:justify-end">
          
          {/* Search Bar - Giới hạn width trên màn hình lớn để đẹp hơn */}
          <div className="relative flex-grow sm:flex-grow-0 sm:w-64 lg:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên, chuyên khoa..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-emerald-200 focus:border-emerald-500 rounded-xl text-slate-900 placeholder-slate-400 transition-all outline-none shadow-sm h-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Nhóm các bộ lọc Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Specialty Filter */}
            {hasOnlyOneSpecialty ? (
              <div className="h-10 px-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-semibold flex items-center gap-2 whitespace-nowrap shadow-sm">
                <Stethoscope size={16} className="text-emerald-600" />
                <span>{singleSpecialtyLabel || 'Nội tổng quát'}</span>
              </div>
            ) : (
              <div className="relative group">
                 <Stethoscope size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 z-10" />
                 <select
                  value={specialtyFilter}
                  onChange={(e) => setSpecialtyFilter(e.target.value)}
                  className="h-10 pl-9 pr-8 text-sm bg-white border border-emerald-200 focus:border-emerald-500 rounded-xl text-slate-900 font-medium transition-all outline-none cursor-pointer appearance-none shadow-sm hover:border-emerald-400 min-w-[160px]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2310b981' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '10px'
                  }}
                >
                  {SPECIALTIES.map((specialty) => (
                    <option key={specialty.value} value={specialty.value}>
                      {specialty.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Gender Filter */}
            <div className="relative">
              <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-600 z-10" />
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="h-10 pl-9 pr-8 text-sm bg-white border border-emerald-200 focus:border-emerald-500 rounded-xl text-slate-900 font-medium transition-all outline-none cursor-pointer appearance-none shadow-sm hover:border-emerald-400 min-w-[140px]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2310b981' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '10px'
                }}
              >
                {GENDERS.map((gender) => (
                  <option key={gender.value} value={gender.value}>
                    {gender.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating Filter */}
            <div className="relative">
              <Award size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 z-10" />
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="h-10 pl-9 pr-8 text-sm bg-white border border-emerald-200 focus:border-emerald-500 rounded-xl text-slate-900 font-medium transition-all outline-none cursor-pointer appearance-none shadow-sm hover:border-emerald-400 min-w-[140px]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2310b981' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '10px'
                }}
              >
                {RATINGS.map((rating) => (
                  <option key={rating.value} value={rating.value}>
                    {rating.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={resetFilters}
                  className="h-10 px-3 flex items-center gap-1.5 text-xs bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl font-bold transition-all shadow-md shadow-red-200"
                >
                  <X size={14} />
                  <span>Xóa</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* --- PHẦN 3: CÁC TAGS ĐANG ACTIVE (GIỮ NGUYÊN) --- */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-emerald-100"
          >
            {searchQuery && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100/50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-semibold"
              >
                <Search size={12} />
                <span>"{searchQuery}"</span>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="ml-1 hover:bg-emerald-200 rounded-full p-0.5 transition-colors"
                >
                  <X size={12} />
                </button>
              </motion.div>
            )}
            
            {specialtyFilter && specialtyFilter !== 'all' && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex items-center gap-1.5 px-3 py-1 bg-teal-100/50 border border-teal-200 text-teal-800 rounded-full text-xs font-semibold"
              >
                <Stethoscope size={12} />
                <span>{SPECIALTIES.find(s => s.value === specialtyFilter)?.label}</span>
                <button 
                  onClick={() => setSpecialtyFilter('all')}
                  className="ml-1 hover:bg-teal-200 rounded-full p-0.5 transition-colors"
                >
                  <X size={12} />
                </button>
              </motion.div>
            )}
            
            {genderFilter && genderFilter !== 'all' && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex items-center gap-1.5 px-3 py-1 bg-green-100/50 border border-green-200 text-green-800 rounded-full text-xs font-semibold"
              >
                <Users size={12} />
                <span>{GENDERS.find(g => g.value === genderFilter)?.label}</span>
                <button 
                  onClick={() => setGenderFilter('all')}
                  className="ml-1 hover:bg-green-200 rounded-full p-0.5 transition-colors"
                >
                  <X size={12} />
                </button>
              </motion.div>
            )}
            
            {ratingFilter && ratingFilter !== 'all' && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-100/50 border border-amber-200 text-amber-800 rounded-full text-xs font-semibold"
              >
                <Star size={12} className="fill-current text-amber-500" />
                <span>{RATINGS.find(r => r.value === ratingFilter)?.label}</span>
                <button 
                  onClick={() => setRatingFilter('all')}
                  className="ml-1 hover:bg-amber-200 rounded-full p-0.5 transition-colors"
                >
                  <X size={12} />
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};