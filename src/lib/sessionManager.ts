/**
 * Session Management for Auto-logout after inactivity
 */

export const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

let sessionTimer: NodeJS.Timeout | null = null;
let onSessionExpire: (() => void) | null = null;

export const initializeSessionManager = (onExpire: () => void) => {
  onSessionExpire = onExpire;
  resetSessionTimer();
  
  // Add event listeners for user activity
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  const resetTimer = () => {
    resetSessionTimer();
  };
  
  events.forEach(event => {
    document.addEventListener(event, resetTimer, true);
  });
  
  // Return cleanup function
  return () => {
    events.forEach(event => {
      document.removeEventListener(event, resetTimer, true);
    });
    clearSessionTimer();
  };
};

export const resetSessionTimer = () => {
  if (sessionTimer) {
    clearTimeout(sessionTimer);
  }
  
  sessionTimer = setTimeout(() => {
    if (onSessionExpire) {
      onSessionExpire();
    }
  }, SESSION_TIMEOUT);
};

export const clearSessionTimer = () => {
  if (sessionTimer) {
    clearTimeout(sessionTimer);
    sessionTimer = null;
  }
};

export const isSessionActive = () => {
  return sessionTimer !== null;
};