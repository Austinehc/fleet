/**
 * Secure input validation and sanitization utilities
 * Prevents XSS, SQL injection, and other security vulnerabilities
 */

// Comprehensive XSS prevention with enhanced protection
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  return input
    .trim()
    // Remove all HTML tags and script content
    .replace(/<[^>]*>/g, '')
    // Remove potential script injection patterns (case insensitive)
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/livescript:/gi, '')
    .replace(/mocha:/gi, '')
    // Remove event handlers and dangerous attributes
    .replace(/on\w+\s*=/gi, '')
    .replace(/style\s*=/gi, '')
    .replace(/href\s*=/gi, '')
    .replace(/src\s*=/gi, '')
    // Remove dangerous CSS expressions
    .replace(/expression\s*\(/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    // Encode special characters that could be used for injection
    .replace(/[&<>"'\/\\]/g, (match) => {
      const htmlEntities: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '\\': '&#x5C;'
      };
      return htmlEntities[match] || match;
    })
    // Remove null bytes and control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Remove Unicode directional override characters (potential for spoofing)
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    // Limit length to prevent buffer overflow attacks
    .substring(0, 1000);
}

// Enhanced database sanitization with SQL injection prevention
export function sanitizeForDatabase(input: string): string {
  if (!input) return '';
  
  const sanitized = sanitizeString(input);
  
  // Additional SQL injection protection
  return sanitized
    .replace(/['";\\]/g, '') // Remove SQL metacharacters
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comments start
    .replace(/\*\//g, '') // Remove SQL block comments end
    // Block dangerous SQL keywords (case insensitive)
    .replace(/\b(union|select|insert|update|delete|drop|exec|execute|sp_|xp_)\b/gi, (match) => match + '_blocked')
    // Block common injection patterns
    .replace(/(\w+)\s*\(\s*\)/gi, '$1_func_blocked') // Function calls
    .replace(/\b(or|and)\s+['"]\w*['"]\s*=\s*['"]\w*['"]/gi, 'condition_blocked') // OR/AND conditions
    .replace(/\b\d+\s*=\s*\d+/g, 'numeric_condition_blocked') // Numeric conditions like 1=1
    .replace(/insert/gi, 'insert_blocked')
    .replace(/update/gi, 'update_blocked')
    .replace(/delete/gi, 'delete_blocked')
    .replace(/drop/gi, 'drop_blocked')
    .replace(/exec/gi, 'exec_blocked')
    .substring(0, 500); // Reasonable limit for most fields
}

// Enhanced validation functions using security middleware
import { securityMiddleware } from './securityMiddleware';

// Validate PIN format with strict requirements
export function validatePinFormat(pin: string): { valid: boolean; error?: string } {
  if (!pin) {
    return { valid: false, error: 'PIN is required' };
  }

  // Sanitize input first
  const cleanPin = securityMiddleware.sanitizeInput(pin, 'pin');
  
  if (cleanPin.length !== 6) {
    return { valid: false, error: 'PIN must be exactly 6 characters' };
  }
  
  // Only allow alphanumeric characters (no special chars to prevent injection)
  if (!/^[A-Z0-9]{6}$/.test(cleanPin)) {
    return { valid: false, error: 'PIN can only contain letters and numbers' };
  }
  
  // Ensure at least one number and one letter for security
  if (!/(?=.*[0-9])(?=.*[A-Z])/.test(cleanPin)) {
    return { valid: false, error: 'PIN must contain at least one letter and one number' };
  }

  // Additional security checks
  const xssCheck = securityMiddleware.detectXSS(cleanPin);
  if (!xssCheck.isSafe) {
    return { valid: false, error: 'PIN contains invalid characters' };
  }
  
  return { valid: true };
}

// Validate email format with enhanced security
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const sanitized = securityMiddleware.sanitizeInput(email, 'email');
  
  if (!sanitized) {
    return { valid: false, error: 'Email is required' };
  }
  
  // More restrictive email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(sanitized)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  
  // Prevent email injection attacks
  if (sanitized.includes('\n') || sanitized.includes('\r') || sanitized.includes('\t')) {
    return { valid: false, error: 'Email contains invalid characters' };
  }
  
  if (sanitized.length > 254) { // RFC 5321 limit
    return { valid: false, error: 'Email address is too long' };
  }
  
  return { valid: true };
}

// Validate phone number with strict formatting
export function validatePhone(phone: string): { valid: boolean; error?: string; value?: string } {
  const sanitized = sanitizeForDatabase(phone).replace(/\D/g, ''); // Remove all non-digits

  if (!sanitized) {
    return { valid: true, value: '' };
  }

  if (sanitized.length > 15) { // International standard max length
    return { valid: false, error: 'Phone number must not exceed 15 digits' };
  }

  if (sanitized.length < 7) {
    return { valid: false, error: 'Phone number must be at least 7 digits' };
  }

  // Only digits allowed - no injection possible
  return { valid: true, value: sanitized };
}

// Validate vehicle plate number with security considerations
export function validatePlateNumber(plate: string): { valid: boolean; error?: string; value?: string } {
  const sanitized = sanitizeForDatabase(plate).toUpperCase().trim();

  if (!sanitized) {
    return { valid: false, error: 'Plate number is required' };
  }

  // Remove spaces for validation
  const compact = sanitized.replace(/\s+/g, '');
  
  // Strict alphanumeric only - prevents injection
  if (!/^[A-Z0-9]{3,8}$/.test(compact)) {
    return { valid: false, error: 'Plate number must be 3-8 alphanumeric characters only' };
  }

  // Format for display (add space if needed)
  const formatted = compact.length > 3 ? `${compact.slice(0, 3)} ${compact.slice(3)}` : compact;
  return { valid: true, value: formatted };
}

// Validate NRC number with enhanced security
export function validateNRCNumber(nrc: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeForDatabase(nrc);
  
  if (!sanitized) {
    return { valid: false, error: 'NRC number is required' };
  }
  
  // Strict format validation - prevents injection
  const nrcRegex = /^\d{6}\/\d{2}\/\d$/;
  if (!nrcRegex.test(sanitized)) {
    return { valid: false, error: 'NRC must be exactly in format XXXXXX/XX/X (digits only)' };
  }
  
  return { valid: true };
}

// Validate VIN with security considerations
export function validateVIN(vin: string): { valid: boolean; error?: string } {
  const sanitized = securityMiddleware.sanitizeInput(vin, 'vin');
  
  if (!sanitized) {
    return { valid: false, error: 'VIN is required' };
  }
  
  // VIN standard: 17 characters, no I, O, Q
  if (sanitized.length !== 17) {
    return { valid: false, error: 'VIN must be exactly 17 characters' };
  }
  
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(sanitized)) {
    return { valid: false, error: 'VIN contains invalid characters (no I, O, Q allowed)' };
  }

  // Additional security check
  const xssCheck = securityMiddleware.detectXSS(sanitized);
  if (!xssCheck.isSafe) {
    return { valid: false, error: 'VIN contains invalid characters' };
  }
  
  return { valid: true };
}

// Validate license number with enhanced security
export function validateLicenseNumber(license: string): { valid: boolean; error?: string } {
  const sanitized = securityMiddleware.sanitizeInput(license, 'text');
  
  if (!sanitized) {
    return { valid: false, error: 'License number is required' };
  }
  
  // Basic format validation
  if (sanitized.length < 5 || sanitized.length > 20) {
    return { valid: false, error: 'License number must be between 5 and 20 characters' };
  }
  
  // Only allow alphanumeric and hyphens
  if (!/^[A-Z0-9\-]+$/.test(sanitized)) {
    return { valid: false, error: 'License number can only contain letters, numbers, and hyphens' };
  }
  
  return { valid: true };
  
  if (sanitized.length < 5 || sanitized.length > 20) {
    return { valid: false, error: 'License number must be 5-20 characters' };
  }
  
  // Only alphanumeric and basic separators allowed
  if (!/^[A-Za-z0-9\-_\/]{5,20}$/.test(sanitized)) {
    return { valid: false, error: 'License number can only contain letters, numbers, hyphens, underscores, and forward slashes' };
  }
  
  return { valid: true };
}

// Validate numeric input with range checking
export function validateNumber(
  value: string | number, 
  min?: number, 
  max?: number, 
  fieldName = 'Value'
): { valid: boolean; error?: string; value?: number } {
  
  let numericValue: number;
  
  if (typeof value === 'string') {
    // Sanitize string input first
    const sanitized = sanitizeForDatabase(value);
    numericValue = parseFloat(sanitized);
  } else {
    numericValue = value;
  }
  
  if (isNaN(numericValue) || !isFinite(numericValue)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }
  
  if (min !== undefined && numericValue < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }
  
  if (max !== undefined && numericValue > max) {
    return { valid: false, error: `${fieldName} must be at most ${max}` };
  }
  
  return { valid: true, value: numericValue };
}

// Validate file upload with comprehensive security checks
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  
  if (!file) {
    return { valid: false, error: 'File is required' };
  }
  
  // Check file size
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 5MB' };
  }
  
  // Minimum size check (prevents empty files)
  if (file.size < 100) {
    return { valid: false, error: 'File appears to be corrupted or empty' };
  }
  
  // Check MIME type
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return { valid: false, error: 'File must be JPEG, PNG, or WebP format' };
  }
  
  // Check file extension (double validation)
  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
  if (!hasValidExtension) {
    return { valid: false, error: 'File extension must be .jpg, .jpeg, .png, or .webp' };
  }
  
  // Prevent path traversal attacks in filename
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return { valid: false, error: 'Invalid file name' };
  }
  
  return { valid: true };
}

// Sanitize and validate description/text fields with enhanced security
export function validateDescription(description: string, maxLength = 500): { valid: boolean; error?: string; value?: string } {
  const sanitized = sanitizeForDatabase(description);
  
  if (sanitized.length > maxLength) {
    return { valid: false, error: `Description must be less than ${maxLength} characters` };
  }
  
  // Check for suspicious patterns that might indicate injection attempts
  const suspiciousPatterns = [
    /script\s*:/i,
    /javascript\s*:/i,
    /data\s*:/i,
    /vbscript\s*:/i,
    /onload\s*=/i,
    /onerror\s*=/i,
    /onclick\s*=/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(description)) {
      return { valid: false, error: 'Description contains prohibited content' };
    }
  }
  
  return { valid: true, value: sanitized };
}

// Validate URL inputs (for image URLs, etc.)
export function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'URL is required' };
  }
  
  const sanitized = sanitizeString(url);
  
  try {
    const urlObj = new URL(sanitized);
    
    // Only allow HTTPS for security
    if (urlObj.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS URLs are allowed' };
    }
    
    // Block localhost and private IP ranges
    const hostname = urlObj.hostname.toLowerCase();
    if (hostname === 'localhost' || 
        hostname.startsWith('127.') || 
        hostname.startsWith('192.168.') || 
        hostname.startsWith('10.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) {
      return { valid: false, error: 'Local and private network URLs are not allowed' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}