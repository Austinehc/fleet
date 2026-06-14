import { useState, useEffect } from 'react';
import { Key, UserCheck, Shield, ChevronLeft, Clock, AlertTriangle } from 'lucide-react';
import { Driver } from '../../types';
import { validatePinFormat, pinAttemptTracker } from '../../lib/auth';
import { errorHandler, FleetError } from '../../lib/errorHandling';
import { ERROR_MESSAGES, AUTH_CONSTANTS } from '../../lib/constants';
import { useDebouncedCallback } from '../../lib/performance';
import { authService } from '../../lib/authService';

interface DriverAuthProps {
  drivers: Driver[];
  onAuthSuccess: (driverId: string, fullName: string) => void;
  driverLoginError: string | null;
  setDriverLoginError: (err: string | null) => void;
  triggerErrorToast?: (msg: string) => void;
}

export default function DriverAuth({
  drivers,
  onAuthSuccess,
  driverLoginError,
  setDriverLoginError,
  triggerErrorToast
}: DriverAuthProps) {
  const [enteredDriverCode, setEnteredDriverCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);

  // Update lockout timer
  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setInterval(() => {
        const remaining = pinAttemptTracker.getRemainingLockoutTime('driver_auth');
        setLockoutTime(remaining);
        if (remaining === 0) {
          setAttemptCount(0);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [lockoutTime]);

  // Debounced input validation
  const validateInput = useDebouncedCallback((code: string) => {
    if (code.length > 0) {
      const validation = validatePinFormat(code);
      if (!validation.valid && code.length === AUTH_CONSTANTS.PIN_LENGTH) {
        setDriverLoginError(validation.error || 'Invalid PIN format');
      } else if (validation.valid) {
        setDriverLoginError(null);
      }
    }
  }, 300);

  // Handle input change with validation
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setEnteredDriverCode(value);
    validateInput(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is locked out
    if (!pinAttemptTracker.canAttempt('driver_auth')) {
      const remaining = pinAttemptTracker.getRemainingLockoutTime('driver_auth');
      setLockoutTime(remaining);
      const minutes = Math.ceil(remaining / 60000);
      const lockoutMsg = `Too many failed attempts. Try again in ${minutes} minutes.`;
      setDriverLoginError(lockoutMsg);
      if (triggerErrorToast) triggerErrorToast(lockoutMsg);
      return;
    }

    setIsSubmitting(true);
    setDriverLoginError(null);

    const { data: validationResult, error: validationError } = errorHandler.handleSync(
      () => validatePinFormat(enteredDriverCode.trim()),
      'PIN validation'
    );

    if (validationError || !validationResult?.valid) {
      const errorMsg = validationResult?.error || ERROR_MESSAGES.VALIDATION_ERROR;
      setDriverLoginError(errorMsg);
      if (triggerErrorToast) triggerErrorToast(errorMsg);
      setIsSubmitting(false);
      return;
    }

    try {
      // Find driver first
      const trimmedCode = enteredDriverCode.trim().toUpperCase();
      const matchedDriver = drivers.find(d => d.accessCode?.trim().toUpperCase() === trimmedCode);
      
      if (!matchedDriver) {
        // Record failed attempt
        pinAttemptTracker.recordAttempt('driver_auth', false);
        const newAttemptCount = attemptCount + 1;
        setAttemptCount(newAttemptCount);

        const remainingAttempts = AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS - newAttemptCount;
        let errorMsg = 'Invalid access code. Please verify and try again.';
        
        if (remainingAttempts > 0) {
          errorMsg += ` ${remainingAttempts} attempts remaining.`;
        } else {
          errorMsg = 'Account temporarily locked due to multiple failed attempts.';
          const lockoutMs = pinAttemptTracker.getRemainingLockoutTime('driver_auth');
          setLockoutTime(lockoutMs);
        }

        setDriverLoginError(errorMsg);
        if (triggerErrorToast) triggerErrorToast('Authentication failed');
        return;
      }

      // Use secure PIN verification via RPC call
      const authResult = await authService.authenticateDriver(matchedDriver.id, trimmedCode);
      
      if (authResult.success) {
        // Record successful attempt
        pinAttemptTracker.recordAttempt('driver_auth', true);
        
        // Clear form and proceed
        setEnteredDriverCode('');
        setAttemptCount(0);
        onAuthSuccess(matchedDriver.id, matchedDriver.fullName);
      } else {
        // Record failed attempt
        pinAttemptTracker.recordAttempt('driver_auth', false);
        const newAttemptCount = attemptCount + 1;
        setAttemptCount(newAttemptCount);

        const remainingAttempts = AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS - newAttemptCount;
        let errorMsg = authResult.error || 'Invalid access code. Please verify and try again.';
        
        if (remainingAttempts > 0 && !authResult.error?.includes('locked')) {
          errorMsg += ` ${remainingAttempts} attempts remaining.`;
        } else if (authResult.error?.includes('locked')) {
          const lockoutMs = pinAttemptTracker.getRemainingLockoutTime('driver_auth');
          setLockoutTime(lockoutMs);
        }

        setDriverLoginError(errorMsg);
        if (triggerErrorToast) {
          triggerErrorToast('Authentication failed');
        }

        // Log security event
        errorHandler.logError(
          new FleetError(
            'Driver authentication failed via secure RPC',
            'AUTH_FAILED',
            'medium',
            { 
              attemptCount: newAttemptCount, 
              driverId: matchedDriver.id,
              code: trimmedCode.substring(0, 2) + '****' 
            }
          ),
          'Driver Authentication'
        );
      }
    } catch (error) {
      errorHandler.logError(error as Error, 'Driver Authentication Error');
      setDriverLoginError(ERROR_MESSAGES.OPERATION_FAILED);
      if (triggerErrorToast) triggerErrorToast(ERROR_MESSAGES.OPERATION_FAILED);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 relative overflow-hidden" id="drv-auth-wrapper-space">
      {/* Abstract background blur circles for consistency with corporate manager login */}
      <div className="absolute top-1/4 -left-36 w-80 h-80 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-36 w-80 h-80 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white border border-gray-200/80 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6 z-10 text-center animate-fade-in" id="drv-auth-gate-card">
        
        {/* Brand/Security Icon */}
        <div className="space-y-3">
          <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Key className="w-6 h-6" id="drv-pin-header-icon" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-gray-900 text-base uppercase font-sans tracking-wide">Driver Security Gate</h3>
            <p className="text-[11px] text-gray-500 max-w-sm mx-auto leading-relaxed">
              Authenticate access with your 6-digit alphanumeric personal PIN code to synchronize digital duty logs and access your active station.
            </p>
          </div>
        </div>

        {/* Dynamic Error State */}
        {driverLoginError && (
          <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-705 rounded-2xl text-xs text-left leading-relaxed flex items-start gap-2.5" id="drv-login-err">
            <Shield className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{driverLoginError}</span>
          </div>
        )}

        {/* Lockout Warning */}
        {lockoutTime > 0 && (
          <div className="p-3.5 bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl text-xs text-left leading-relaxed flex items-start gap-2.5" id="drv-lockout-warning">
            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <div className="font-semibold">Account Temporarily Locked</div>
              <div>Time remaining: {Math.ceil(lockoutTime / 60000)} minutes</div>
            </div>
          </div>
        )}

        {/* Security Status */}
        {attemptCount > 0 && lockoutTime === 0 && (
          <div className="p-3 bg-orange-50 border border-orange-100 text-orange-700 rounded-xl text-xs text-center flex items-center justify-center gap-2" id="drv-attempt-warning">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span>{AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS - attemptCount} attempts remaining</span>
          </div>
        )}

        {/* Login credentials Form code */}
        <form onSubmit={handleSubmit} className="space-y-5 text-left" id="drv-code-form">
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Your personal access code (6 digits)</label>
            <input
              type="text"
              maxLength={AUTH_CONSTANTS.PIN_LENGTH}
              required
              placeholder="e.g. ABC123"
              value={enteredDriverCode}
              onChange={handleInputChange}
              disabled={isSubmitting || lockoutTime > 0}
              className={`w-full bg-slate-50 border focus:border-indigo-500 rounded-xl px-4 py-3 text-base text-center font-mono font-black uppercase text-slate-800 tracking-widest focus:outline-none transition-colors ${
                isSubmitting || lockoutTime > 0 
                  ? 'opacity-50 cursor-not-allowed border-gray-200' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              id="drv-input-access-code"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || lockoutTime > 0 || enteredDriverCode.length !== AUTH_CONSTANTS.PIN_LENGTH}
            className={`w-full py-3 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 uppercase tracking-widest ${
              isSubmitting || lockoutTime > 0 || enteredDriverCode.length !== AUTH_CONSTANTS.PIN_LENGTH
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg'
            }`}
            id="drv-btn-authenticate"
          >
            <UserCheck className="w-4 h-4" />
            {isSubmitting ? 'Authenticating...' : 'Access Driver Station'}
          </button>
        </form>



        {/* Back Link and Helper text */}
        <div className="border-t border-gray-150 pt-4 text-center text-xs text-slate-400 font-medium space-y-3" id="drv-auth-footer-helpers">
          <p className="text-gray-505 leading-normal">
            Don't have an access key? Contact your coordinator in the <strong className="font-semibold text-gray-700">Transit Hub Office</strong> to generate and deliver your code.
          </p>
          <div className="flex justify-center" id="btn-back-to-portal-gate">
            <a
              href="?role=manager"
              className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-500 font-bold tracking-tight text-[11px] uppercase hover:underline"
              id="link-go-to-manager"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Manager View
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
