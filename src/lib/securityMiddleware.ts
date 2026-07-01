/**
 * Security Middleware - Comprehensive Input Validation and XSS Prevention
 * Implements defense-in-depth security measures
 */

// Rate limiting tracker
interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

class SecurityMiddleware {
  private rateLimits = new Map<string, RateLimitEntry>();
  private readonly MAX_REQUESTS_PER_MINUTE = 30;
  private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

  /**
   * Comprehensive input sanitization with multiple layers of protection
   */
  sanitizeInput(input: string, type: 'text' | 'email' | 'phone' | 'vin' | 'pin' = 'text'): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Step 1: Basic cleanup
    let sanitized = input.trim();

    // Step 2: Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    // Step 3: Remove Unicode directional override characters
    sanitized = sanitized.replace(/[\u202A-\u202E\u2066-\u2069]/g, '');

    // Step 4: Type-specific sanitization
    switch (type) {
      case 'email':
        return this.sanitizeEmail(sanitized);
      case 'phone':
        return this.sanitizePhone(sanitized);
      case 'vin':
        return this.sanitizeVIN(sanitized);
      case 'pin':
        return this.sanitizePIN(sanitized);
      default:
        return this.sanitizeText(sanitized);
    }
  }

  /**
   * Text sanitization with XSS prevention
   */
  private sanitizeText(input: string): string {
    return input
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove script injections
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/livescript:/gi, '')
      // Remove event handlers
      .replace(/on\w+\s*=/gi, '')
      // Remove dangerous CSS
      .replace(/expression\s*\(/gi, '')
      .replace(/url\s*\(/gi, '')
      // Encode dangerous characters
      .replace(/[&<>"'\/\\]/g, (match) => {
        const entities: { [key: string]: string } = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '/': '&#x2F;',
          '\\': '&#x5C;'
        };
        return entities[match] || match;
      })
      // Limit length
      .substring(0, 1000);
  }

  /**
   * Email sanitization
   */
  private sanitizeEmail(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^\w.@+-]/g, '') // Only allow word chars, dots, @, +, -
      .substring(0, 254); // RFC limit
  }

  /**
   * Phone number sanitization
   */
  private sanitizePhone(input: string): string {
    return input
      .replace(/[^\d+\-\s()]/g, '') // Only digits, +, -, space, parentheses
      .substring(0, 20);
  }

  /**
   * VIN sanitization
   */
  private sanitizeVIN(input: string): string {
    return input
      .toUpperCase()
      .replace(/[^A-HJ-NPR-Z0-9]/g, '') // VIN valid characters
      .substring(0, 17);
  }

  /**
   * PIN sanitization
   */
  private sanitizePIN(input: string): string {
    return input
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '') // Only alphanumeric
      .substring(0, 6);
  }

  /**
   * Advanced XSS detection
   */
  detectXSS(input: string): { isSafe: boolean; threats: string[] } {
    const threats: string[] = [];

    // Known XSS patterns
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<link/i,
      /<meta/i,
      /expression\s*\(/i,
      /url\s*\(/i,
      /import\s*\(/i,
      /@import/i,
      /document\./i,
      /window\./i,
      /eval\s*\(/i,
      /setTimeout/i,
      /setInterval/i,
      /alert\s*\(/i,
      /confirm\s*\(/i,
      /prompt\s*\(/i
    ];

    xssPatterns.forEach((pattern, index) => {
      if (pattern.test(input)) {
        threats.push(`XSS_PATTERN_${index + 1}`);
      }
    });

    // Check for encoded attacks
    try {
      const decoded = decodeURIComponent(input);
      if (decoded !== input) {
        xssPatterns.forEach((pattern, index) => {
          if (pattern.test(decoded)) {
            threats.push(`ENCODED_XSS_PATTERN_${index + 1}`);
          }
        });
      }
    } catch {
      // Invalid encoding might be an attack
      threats.push('INVALID_ENCODING');
    }

    return {
      isSafe: threats.length === 0,
      threats
    };
  }

  /**
   * SQL injection detection
   */
  detectSQLInjection(input: string): { isSafe: boolean; threats: string[] } {
    const threats: string[] = [];

    // SQL injection patterns
    const sqlPatterns = [
      /(\b(select|insert|update|delete|drop|create|alter|exec|union)\b)/i,
      /(\b(or|and)\s+\w+\s*=\s*\w+)/i,
      /(--|\/\*|\*\/)/,
      /(\b\d+\s*=\s*\d+\b)/,
      /(\bor\s+[\'"]\w*[\'"]\s*=\s*[\'"]\w*[\'"])/i,
      /(\band\s+[\'"]\w*[\'"]\s*=\s*[\'"]\w*[\'"])/i,
      /(;[\s\r\n]*drop)/i,
      /(;[\s\r\n]*delete)/i,
      /(\bsp_\w+|\bxp_\w+)/i,
      /(\bexec\s*\()/i
    ];

    sqlPatterns.forEach((pattern, index) => {
      if (pattern.test(input)) {
        threats.push(`SQL_INJECTION_PATTERN_${index + 1}`);
      }
    });

    return {
      isSafe: threats.length === 0,
      threats
    };
  }

  /**
   * Rate limiting check
   */
  checkRateLimit(identifier: string): { allowed: boolean; remainingRequests: number; resetTime: number } {
    const now = Date.now();
    const entry = this.rateLimits.get(identifier);

    // Clean expired entries periodically
    if (Math.random() < 0.1) { // 10% chance to cleanup
      this.cleanupExpiredEntries();
    }

    if (!entry) {
      // First request
      this.rateLimits.set(identifier, {
        count: 1,
        resetTime: now + 60000, // 1 minute
        blocked: false
      });
      return { allowed: true, remainingRequests: this.MAX_REQUESTS_PER_MINUTE - 1, resetTime: now + 60000 };
    }

    // Check if block period has expired
    if (entry.blocked && now > entry.resetTime + this.BLOCK_DURATION) {
      entry.blocked = false;
      entry.count = 1;
      entry.resetTime = now + 60000;
      return { allowed: true, remainingRequests: this.MAX_REQUESTS_PER_MINUTE - 1, resetTime: entry.resetTime };
    }

    // Check if blocked
    if (entry.blocked) {
      return { allowed: false, remainingRequests: 0, resetTime: entry.resetTime + this.BLOCK_DURATION };
    }

    // Check if reset time has passed
    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + 60000;
      return { allowed: true, remainingRequests: this.MAX_REQUESTS_PER_MINUTE - 1, resetTime: entry.resetTime };
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > this.MAX_REQUESTS_PER_MINUTE) {
      entry.blocked = true;
      return { allowed: false, remainingRequests: 0, resetTime: entry.resetTime + this.BLOCK_DURATION };
    }

    return { 
      allowed: true, 
      remainingRequests: this.MAX_REQUESTS_PER_MINUTE - entry.count, 
      resetTime: entry.resetTime 
    };
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.rateLimits.entries()) {
      if (!entry.blocked && now > entry.resetTime) {
        this.rateLimits.delete(key);
      } else if (entry.blocked && now > entry.resetTime + this.BLOCK_DURATION) {
        this.rateLimits.delete(key);
      }
    }
  }

  /**
   * Generate security headers for HTTP responses
   */
  getSecurityHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };
  }

  /**
   * Validate file uploads
   */
  validateFileUpload(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    // Size check
    if (file.size > maxSize) {
      errors.push('File size exceeds 5MB limit');
    }

    // Type check
    if (!allowedTypes.includes(file.type)) {
      errors.push('Invalid file type. Only JPEG, PNG, and WebP are allowed');
    }

    // Name check
    const fileName = file.name.toLowerCase();
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      errors.push('Invalid file name');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Log security events
   */
  logSecurityEvent(event: {
    type: 'XSS_ATTEMPT' | 'SQL_INJECTION_ATTEMPT' | 'RATE_LIMIT_EXCEEDED' | 'INVALID_FILE_UPLOAD';
    details: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userAgent?: string;
    ip?: string;
  }): void {
    // In production, send to security monitoring service
    console.warn(`[SECURITY EVENT] ${event.type}:`, {
      ...event,
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware();

// Export validation functions for backward compatibility
export function sanitizeString(input: string): string {
  return securityMiddleware.sanitizeInput(input, 'text');
}

export function sanitizeForDatabase(input: string): string {
  const sanitized = securityMiddleware.sanitizeInput(input, 'text');
  const xssCheck = securityMiddleware.detectXSS(sanitized);
  const sqlCheck = securityMiddleware.detectSQLInjection(sanitized);
  
  if (!xssCheck.isSafe) {
    securityMiddleware.logSecurityEvent({
      type: 'XSS_ATTEMPT',
      details: { input: input.substring(0, 100), threats: xssCheck.threats },
      severity: 'high'
    });
  }
  
  if (!sqlCheck.isSafe) {
    securityMiddleware.logSecurityEvent({
      type: 'SQL_INJECTION_ATTEMPT',
      details: { input: input.substring(0, 100), threats: sqlCheck.threats },
      severity: 'critical'
    });
  }
  
  return sanitized;
}