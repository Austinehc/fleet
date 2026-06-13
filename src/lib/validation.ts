/**
 * Input validation and sanitization utilities
 */

// Sanitize string input to prevent XSS
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes that could break SQL
    .substring(0, 500); // Limit length
}

// Validate email format
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeString(email);
  
  if (!sanitized) {
    return { valid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
}

// Validate phone number
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeString(phone).replace(/\D/g, ''); // Keep only digits
  
  if (!sanitized) {
    return { valid: false, error: 'Phone number is required' };
  }
  
  if (sanitized.length < 10 || sanitized.length > 15) {
    return { valid: false, error: 'Phone number must be 10-15 digits' };
  }
  
  return { valid: true };
}

// Validate VIN
export function validateVIN(vin: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeString(vin).toUpperCase();
  
  if (!sanitized) {
    return { valid: false, error: 'VIN is required' };
  }
  
  if (sanitized.length !== 17) {
    return { valid: false, error: 'VIN must be exactly 17 characters' };
  }
  
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(sanitized)) {
    return { valid: false, error: 'VIN contains invalid characters' };
  }
  
  return { valid: true };
}

// Validate license number
export function validateLicenseNumber(license: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeString(license);
  
  if (!sanitized) {
    return { valid: false, error: 'License number is required' };
  }
  
  if (sanitized.length < 5 || sanitized.length > 20) {
    return { valid: false, error: 'License number must be 5-20 characters' };
  }
  
  return { valid: true };
}

// Validate numeric input
export function validateNumber(
  value: string | number, 
  min?: number, 
  max?: number, 
  fieldName = 'Value'
): { valid: boolean; error?: string; value?: number } {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }
  
  if (min !== undefined && num < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }
  
  if (max !== undefined && num > max) {
    return { valid: false, error: `${fieldName} must be at most ${max}` };
  }
  
  return { valid: true, value: num };
}

// Validate file upload
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (!file) {
    return { valid: false, error: 'File is required' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 5MB' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File must be JPEG, PNG, or WebP format' };
  }
  
  return { valid: true };
}

// Validate plate number
export function validatePlateNumber(plate: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeString(plate).toUpperCase();
  
  if (!sanitized) {
    return { valid: false, error: 'Plate number is required' };
  }
  
  if (sanitized.length < 3 || sanitized.length > 10) {
    return { valid: false, error: 'Plate number must be 3-10 characters' };
  }
  
  if (!/^[A-Z0-9-\s]+$/.test(sanitized)) {
    return { valid: false, error: 'Plate number contains invalid characters' };
  }
  
  return { valid: true };
}

// Sanitize and validate description/text fields
export function validateDescription(description: string, maxLength = 500): { valid: boolean; error?: string; value?: string } {
  const sanitized = sanitizeString(description);
  
  if (sanitized.length > maxLength) {
    return { valid: false, error: `Description must be less than ${maxLength} characters` };
  }
  
  return { valid: true, value: sanitized };
}