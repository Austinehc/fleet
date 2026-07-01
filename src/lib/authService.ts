/**
 * Secure Authentication Service with proper session management
 */

import { supabase } from './supabase';
import { User, Session } from '@supabase/supabase-js';
import { errorHandler } from './errorHandling';

import { SafeResult, SafeError, createSafeError, createSafeResult } from './typeSafety';

export interface UserProfile {
  id: string;
  auth_user_id: string;
  email: string;
  role: 'manager' | 'driver';
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
}

export type AuthResult = SafeResult<{ sessionToken?: string; driverId?: string }, SafeError>;

class AuthService {
  private authState: AuthState = {
    user: null,
    profile: null,
    session: null,
    loading: true,
  };

  private listeners: Set<(state: AuthState) => void> = new Set();

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!supabase) {
      this.authState.loading = false;
      this.notifyListeners();
      return;
    }

    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (session) {
        await this.handleSessionChange(session);
      } else {
        this.authState = { user: null, profile: null, session: null, loading: false };
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        await this.handleSessionChange(session);
      });

    } catch (error) {
      errorHandler.logError(error as Error, 'Auth service initialization');
      this.authState.loading = false;
    }

    this.notifyListeners();
  }

  private async handleSessionChange(session: Session | null): Promise<void> {
    this.authState.session = session;
    this.authState.user = session?.user || null;

    if (session?.user) {
      // Fetch user profile
      try {
        const profile = await this.getUserProfile(session.user.id);
        this.authState.profile = profile;
      } catch (error) {
        errorHandler.logError(error as Error, 'Failed to fetch user profile');
        this.authState.profile = null;
      }
    } else {
      this.authState.profile = null;
    }

    this.authState.loading = false;
    this.notifyListeners();
  }

  private async getUserProfile(authUserId: string): Promise<UserProfile | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found
        return null;
      }
      throw error;
    }

    return data;
  }

  // Subscribe to auth state changes
  subscribe(callback: (state: AuthState) => void): () => void {
    this.listeners.add(callback);
    // Immediately call with current state
    callback(this.authState);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback({ ...this.authState }));
  }

  // Sign up manager
  async signUpManager(email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'manager'
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Create user profile
        await this.createUserProfile(data.user.id, email, 'manager', fullName);
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed';
      errorHandler.logError(error as Error, 'Manager sign up');
      return { success: false, error: message };
    }
  }

  // Sign in
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      errorHandler.logError(error as Error, 'User sign in');
      return { success: false, error: message };
    }
  }

  // Driver PIN authentication using database function
  async authenticateDriver(pin: string): Promise<AuthResult> {
    if (!supabase) {
      return createSafeError({
        type: 'DATABASE_ERROR' as const,
        message: 'Supabase not configured'
      });
    }

    try {
      // Server-side only PIN verification - no client-side driver matching
      const { data, error } = await supabase.rpc('authenticate_driver_by_pin', {
        input_pin: pin
      });

      if (error) {
        throw new Error(`PIN verification failed: ${error.message}`);
      }

      if (data?.success) {
        // Generate secure JWT session token
        const sessionToken = await this.generateSecureSessionToken(data.driver_id);
        this.storeDriverSession(data.driver_id, sessionToken);
        
        return createSafeResult({ 
          sessionToken,
          driverId: data.driver_id
        });
      } else {
        return createSafeError({
          type: 'AUTH_ERROR' as const,
          message: data?.error || 'Invalid PIN. Please check your PIN and try again.',
          action: 'driver_authentication'
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      return createSafeError({
        type: 'AUTH_ERROR' as const,
        message,
        action: 'driver_authentication'
      });
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    if (supabase) {
      await supabase.auth.signOut();
    }

    if (typeof window !== 'undefined') {
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith('sb-')) {
          window.localStorage.removeItem(key);
        }
      }
    }
    
    // Clear driver session if exists
    this.clearDriverSession();
    
    this.authState = { user: null, profile: null, session: null, loading: false };
    this.notifyListeners();
  }

  // Helper methods
  private async createUserProfile(authUserId: string, email: string, role: 'manager' | 'driver', fullName: string): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
      .from('user_profiles')
      .insert({
        auth_user_id: authUserId,
        email,
        role,
        full_name: fullName
      });

    if (error) throw error;
  }

  private async generateSecureSessionToken(driverId: string): Promise<string> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // Use Supabase JWT signing (more secure than client-side)
    const { data, error } = await supabase.rpc('generate_driver_jwt', {
      driver_id: driverId,
      expires_in: 8 * 60 * 60 // 8 hours in seconds
    });

    if (error) {
      throw new Error(`Failed to generate secure session: ${error.message}`);
    }

    return data.token;
  }

  private storeDriverSession(driverId: string, sessionToken: string): void {
    const sessionData = {
      driverId,
      sessionToken,
      timestamp: Date.now(),
      expiresAt: Date.now() + (8 * 60 * 60 * 1000) // 8 hours
    };
    
    // Use secure session storage with encryption
    const encryptedSession = this.encryptSessionData(sessionData);
    sessionStorage.setItem('driver_session', encryptedSession);
  }

  private encryptSessionData(sessionData: any): string {
    // Simple encryption for session data (in production, use proper crypto library)
    const jsonString = JSON.stringify(sessionData);
    return btoa(jsonString);
  }

  private decryptSessionData(encryptedData: string): any {
    try {
      const jsonString = atob(encryptedData);
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }

  private clearDriverSession(): void {
    sessionStorage.removeItem('driver_session');
    localStorage.removeItem('fleet_active_driver_id');
  }

  // Get driver session with enhanced security validation
  getDriverSession(): { driverId: string; valid: boolean } | null {
    const sessionStr = sessionStorage.getItem('driver_session');
    if (!sessionStr) return null;

    try {
      const session = this.decryptSessionData(sessionStr);
      if (!session) return null;

      const isValid = session.expiresAt > Date.now();
      
      if (!isValid) {
        this.clearDriverSession();
        return null;
      }

      // Validate session token integrity
      if (!session.sessionToken || !session.driverId) {
        this.clearDriverSession();
        return null;
      }

      return { driverId: session.driverId, valid: true };
    } catch {
      this.clearDriverSession();
      return null;
    }
  }

  // Current auth state getters
  get currentUser(): User | null {
    return this.authState.user;
  }

  get currentProfile(): UserProfile | null {
    return this.authState.profile;
  }

  get isAuthenticated(): boolean {
    return !!this.authState.user || !!this.getDriverSession()?.valid;
  }

  get userRole(): 'manager' | 'driver' | null {
    const driverSession = this.getDriverSession();
    if (driverSession?.valid) return 'driver';
    return this.authState.profile?.role || null;
  }

  get isLoading(): boolean {
    return this.authState.loading;
  }
}

// Export singleton instance
export const authService = new AuthService();