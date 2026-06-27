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
  
  const emailRegex = /^[^\s@]+@(gmail|yahoo|outlook|hotmail)\.com$/i;
  if (!emailRegex.test(sanitized)) {
    return { valid: false, error: 'Email must end with gmail.com, yahoo.com, outlook.com, or hotmail.com' };
  }
  
  return { valid: true };
}

// Validate phone number
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeString(phone);
  
  if (!sanitized || sanitized === '(+260)') {
    return { valid: false, error: 'Phone number is required' };
  }
  
  const phoneRegex = /^\(\+260\)\s?\d{9}$/;
  if (!phoneRegex.test(sanitized)) {
    return { valid: false, error: 'Phone number must start with (+260) followed by 9 digits' };
  }
  
  return { valid: true };
}

// Validate NRC number
export function validateNRCNumber(nrc: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeString(nrc).toUpperCase();
  
  if (!sanitized) {
    return { valid: false, error: 'NRC number is required' };
  }
  
  const nrcRegex = /^\d{6}\/\d{2}\/\d$/;
  if (!nrcRegex.test(sanitized)) {
    return { valid: false, error: 'NRC must be in the format XXXXXX/XX/X' };
  }
  
  return { valid: true };
}

// Validate VIN
export function validateVIN(vin: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeString(vin).toUpperCase();
  
  if (!sanitized) {
    return { valid: false, error: 'VIN is required' };
  }
  if (!/^[A-HJ-NPR-Z0-9]+$/.test(sanitized)) {
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

// Sanitize and validate description/text fields
export function validateDescription(description: string, maxLength = 500): { valid: boolean; error?: string; value?: string } {
  const sanitized = sanitizeString(description);
  
  if (sanitized.length > maxLength) {
    return { valid: false, error: `Description must be less than ${maxLength} characters` };
  }
  
  return { valid: true, value: sanitized };
}