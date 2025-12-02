// src/components/ui/FormField.js - Reusable Form Field with Validation
import React from 'react';
import { AlertCircle } from 'lucide-react';

export const FormField = ({ 
  label, 
  name, 
  type = 'text', 
  value, 
  onChange, 
  onBlur,
  error, 
  touched,
  required = false,
  placeholder,
  disabled = false,
  helperText,
  className = '',
  inputClassName = '',
  as = 'input',
  rows = 3,
  options = [],
  ...rest
}) => {
  const inputId = `field-${name}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  
  const hasError = touched && error;
  
  const baseInputClasses = `
    w-full px-4 py-3 rounded-lg
    border-2 transition-all duration-200
    bg-white dark:bg-slate-800
    text-slate-900 dark:text-white
    placeholder:text-slate-400 dark:placeholder:text-slate-500
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus:ring-2
    ${hasError 
      ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900' 
      : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-200 dark:focus:ring-blue-900'
    }
    ${inputClassName}
  `.trim();

  const renderInput = () => {
    switch (as) {
      case 'textarea':
        return (
          <textarea
            id={inputId}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={baseInputClasses}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
            aria-required={required ? 'true' : 'false'}
            {...rest}
          />
        );
      
      case 'select':
        return (
          <select
            id={inputId}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            className={baseInputClasses}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
            aria-required={required ? 'true' : 'false'}
            {...rest}
          >
            <option value="">{placeholder || 'Chọn...'}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      default:
        return (
          <input
            id={inputId}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={baseInputClasses}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
            aria-required={required ? 'true' : 'false'}
            {...rest}
          />
        );
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-label="bắt buộc">*</span>
          )}
        </label>
      )}
      
      {/* Input/Textarea/Select */}
      {renderInput()}
      
      {/* Helper Text */}
      {helperText && !hasError && (
        <p 
          id={helperId}
          className="text-xs text-slate-500 dark:text-slate-400"
        >
          {helperText}
        </p>
      )}
      
      {/* Error Message */}
      {hasError && (
        <div 
          id={errorId}
          className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

// FormField với Formik integration
export const FormikField = ({ name, formik, ...rest }) => {
  return (
    <FormField
      name={name}
      value={formik.values[name] || ''}
      onChange={formik.handleChange}
      onBlur={formik.handleBlur}
      error={formik.errors[name]}
      touched={formik.touched[name]}
      {...rest}
    />
  );
};

export default FormField;
