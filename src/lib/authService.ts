/**
 * Secure Authentication Service with proper session management
 */

import { supabase } from './supabase';
import { User, Session } from '@supabase/supabase-js';
import { errorHandler } from './errorHandling';

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
  async authenticateDriver(driverId: string, pin: string): Promise<{ success: boolean; error?: string; sessionToken?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // First verify that the driver exists and has an auth record
      const { data: authCheck, error: authError } = await supabase
        .from('driver_auth')
        .select('driver_id, attempts, locked_until')
        .eq('driver_id', driverId)
        .single();

      if (authError || !authCheck) {
        return { success: false, error: 'Driver not found or PIN not set. Please contact your manager.' };
      }

      // Check if account is locked
      if (authCheck.locked_until && new Date(authCheck.locked_until) > new Date()) {
        return { success: false, error: 'Account temporarily locked due to multiple failed attempts. Please try again later.' };
      }

      // Use the secure RPC function for PIN verification
      const { data, error } = await supabase.rpc('verify_pin', {
        driver_id: driverId,
        pin: pin
      });

      if (error) {
        throw new Error(`PIN verification failed: ${error.message}`);
      }

      if (data === true) {
        // Generate session token for driver
        const sessionToken = this.generateSessionToken(driverId);
        this.storeDriverSession(driverId, sessionToken);
        return { success: true, sessionToken };
      } else {
        return { success: false, error: 'Invalid PIN. Please check your PIN and try again.' };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      errorHandler.logError(error as Error, `Driver authentication: ${driverId}`);
      return { success: false, error: message };
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

  private generateSessionToken(driverId: string): string {
    const timestamp = Date.now();
    const randomData = crypto.getRandomValues(new Uint8Array(32));
    const tokenData = `${driverId}:${timestamp}:${Array.from(randomData).join(',')}`;
    return btoa(tokenData);
  }

  private storeDriverSession(driverId: string, sessionToken: string): void {
    const sessionData = {
      driverId,
      sessionToken,
      timestamp: Date.now(),
      expiresAt: Date.now() + (8 * 60 * 60 * 1000) // 8 hours
    };
    
    sessionStorage.setItem('driver_session', JSON.stringify(sessionData));
  }

  private clearDriverSession(): void {
    sessionStorage.removeItem('driver_session');
    localStorage.removeItem('fleet_active_driver_id');
  }

  // Get driver session
  getDriverSession(): { driverId: string; valid: boolean } | null {
    const sessionStr = sessionStorage.getItem('driver_session');
    if (!sessionStr) return null;

    try {
      const session = JSON.parse(sessionStr);
      const isValid = session.expiresAt > Date.now();
      
      if (!isValid) {
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