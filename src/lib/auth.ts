/**
 * Authentication utilities for secure driver PIN management
 */

// Simple but secure hash function for PINs (better than plain text)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'fleet_salt_2024'); // Add salt
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify PIN against stored hash
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const pinHash = await hashPin(pin);
  return pinHash === storedHash;
}

// Generate secure PIN hash for storage
export async function generatePinHash(pin: string): Promise<string> {
  return await hashPin(pin);
}

// Generate secure random PIN
export function generateSecurePin(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < 6; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

// Validate PIN format
export function validatePinFormat(pin: string): { valid: boolean; error?: string } {
  if (!pin || typeof pin !== 'string') {
    return { valid: false, error: 'PIN is required' };
  }
  
  if (pin.length !== 6) {
    return { valid: false, error: 'PIN must be exactly 6 characters' };
  }
  
  if (!/^[A-Z0-9]+$/.test(pin)) {
    return { valid: false, error: 'PIN must contain only uppercase letters and numbers' };
  }
  
  return { valid: true };
}

// Rate limiting for PIN attempts
class PinAttemptTracker {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private readonly maxAttempts = 5;
  private readonly lockoutDuration = 15 * 60 * 1000; // 15 minutes

  canAttempt(identifier: string): boolean {
    const record = this.attempts.get(identifier);
    if (!record) return true;

    const now = Date.now();
    if (now - record.lastAttempt > this.lockoutDuration) {
      this.attempts.delete(identifier);
      return true;
    }

    return record.count < this.maxAttempts;
  }

  recordAttempt(identifier: string, success: boolean): void {
    const now = Date.now();
    const record = this.attempts.get(identifier) || { count: 0, lastAttempt: now };

    if (success) {
      this.attempts.delete(identifier);
    } else {
      record.count++;
      record.lastAttempt = now;
      this.attempts.set(identifier, record);
    }
  }

  getRemainingLockoutTime(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record || record.count < this.maxAttempts) return 0;

    const elapsed = Date.now() - record.lastAttempt;
    return Math.max(0, this.lockoutDuration - elapsed);
  }
}

export const pinAttemptTracker = new PinAttemptTracker();