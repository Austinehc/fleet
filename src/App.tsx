import React, { useState, useEffect } from 'react';
import { CarAsset, Driver } from './types';
import ManagerApp from './ManagerApp';
import DriverApp from './DriverApp';
import {
  isSupabaseConfigured,
  supabase,
  saveCarAssetToDB,
  deleteCarFromDB,
  saveDriverToDB,
  deleteDriverFromDB
} from './lib/supabase';
import { loadCarsData, loadDriversData } from './lib/dataLoaders';
import { Shield, Database, LogIn } from 'lucide-react';
import { useOptimizedPolling } from './lib/performance';
import { authService, AuthState } from './lib/authService';
import { stateManager } from './lib/stateManager';
import { AppErrorBoundary, RouteErrorBoundary } from './components/ErrorBoundary';
import { errorHandler } from './lib/errorHandling';

function AppContent() {
  const [dbConfigured, setDbConfigured] = useState<boolean>(isSupabaseConfigured());
  const [useLocalSandbox, setUseLocalSandbox] = useState<boolean>(false);

  // --- Auth State from AuthService ---
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
  });
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  // --- Core State Storage ---
  const [cars, setCars] = useState<CarAsset[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);

  // --- Refs to track active database sync states with race condition prevention ---
  const lastSyncedCarsStr = React.useRef<string>('');
  const lastSyncedDriversStr = React.useRef<string>('');
  const lastLocalUpdateTime = React.useRef<number>(0);

  // --- Current Active UI Role ---
  const [userRole, setUserRole] = useState<'manager' | 'driver'>(() => {
    // First, check if role is locked by environment variable
    const envLockedRole = (import.meta as any).env?.VITE_APP_ROLE;
    if (envLockedRole === 'driver' || envLockedRole === 'manager') {
      return envLockedRole;
    }
    
    // Then check URL parameters
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    if (roleParam === 'driver' || roleParam === 'manager') {
      return roleParam;
    }
    
    // Finally check localStorage
    const savedRole = localStorage.getItem('fleet_user_role');
    if (savedRole === 'driver' || savedRole === 'manager') {
      return savedRole;
    }
    
    return 'manager';
  });

  // Subscribe to auth service changes
  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  // Update role based on auth state or URL parameters
  useEffect(() => {
    const envLockedRole = (import.meta as any).env?.VITE_APP_ROLE;
    if (envLockedRole === 'driver' || envLockedRole === 'manager') {
      setUserRole(envLockedRole);
      return;
    }
    
    // Check URL parameters
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    if (roleParam === 'driver' || roleParam === 'manager') {
      setUserRole(roleParam);
      return;
    }
    
    // Use role from auth service if available
    if (authState.profile?.role) {
      setUserRole(authState.profile.role);
    }
  }, [authState.profile]);

  // Sync userRole state updates to localStorage
  useEffect(() => {
    // Don't save to localStorage if role is locked by environment
    const envLockedRole = (import.meta as any).env?.VITE_APP_ROLE;
    if (envLockedRole === 'driver' || envLockedRole === 'manager') {
      return; // Skip localStorage updates when environment role is set
    }
    
    localStorage.setItem('fleet_user_role', userRole);
  }, [userRole]);

  // Lock user switcher if VITE_APP_ROLE is declared in environment
  const envLockedRole = (import.meta as any).env?.VITE_APP_ROLE;
  const isLocked = !!envLockedRole;

  // --- Load data from backend with error handling ---
  useEffect(() => {
    async function loadBackendData() {
      const shouldLoadFromDb = isSupabaseConfigured() && !useLocalSandbox && supabase && (authState.user || userRole === 'driver');
      if (!shouldLoadFromDb) {
        // Clear data if no database connection or not authenticated
        setCars([]);
        setDrivers([]);
        return;
      }

      // Quiet load: Only flag dataLoading if we have no assets yet to avoid visual noise/page flashes
      const isInitial = cars.length === 0 && drivers.length === 0;
      if (isInitial) {
        setDataLoading(true);
      }

      try {
        const dbCars = await loadCarsData();
        const dbDrivers = await loadDriversData();
        
        // Seed last synced refs to prevent feedback loops on initial load
        lastSyncedCarsStr.current = JSON.stringify(dbCars);
        lastSyncedDriversStr.current = JSON.stringify(dbDrivers);

        setCars(dbCars);
        setDrivers(dbDrivers);
      } catch (err: any) {
        errorHandler.logError(err, 'Backend data loading');
        console.error('Error fetching dynamic Supabase records, falling back to empty state:', err);
        setCars([]);
        setDrivers([]);
      } finally {
        setDataLoading(false);
      }
    }

    loadBackendData();
  }, [supabase, authState.user, useLocalSandbox, dbConfigured, userRole]);

  // --- Optimized periodic background poll updates with improved error handling ---
  const { startPolling, stopPolling } = useOptimizedPolling(
    async () => {
      // Skip if state manager indicates recent local updates
      if (stateManager.isRecentlySynced('background_poll', 8000)) {
        return;
      }

      try {
        const cars = await loadCarsData();
        const drivers = await loadDriversData();
        
        // Save database outputs as currently synced
        lastSyncedCarsStr.current = JSON.stringify(cars);
        lastSyncedDriversStr.current = JSON.stringify(drivers);

        // Directly overwrite state quietly
        setCars(cars);
        setDrivers(drivers);
      } catch (err) {
        errorHandler.logError(err as Error, 'Background polling');
      }
    },
    30000, // 30 seconds base interval (improved from 5 seconds)
    {
      maxInterval: 300000, // 5 minutes max
      backoffMultiplier: 1.5,
      maxRetries: 3,
      enableVisibilityOptimization: true
    }
  );

  useEffect(() => {
    const shouldPoll = isSupabaseConfigured() && !useLocalSandbox && supabase && (authState.user || userRole === 'driver');
    if (shouldPoll) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [supabase, authState.user, useLocalSandbox, dbConfigured, userRole, startPolling, stopPolling]);

  // --- Save Sandbox state to localStorage whenever it changes ---
  useEffect(() => {
    if (useLocalSandbox) {
      localStorage.setItem('fleet_cars', JSON.stringify(cars));
    }
  }, [cars, useLocalSandbox]);

  useEffect(() => {
    if (useLocalSandbox) {
      localStorage.setItem('fleet_drivers', JSON.stringify(drivers));
    }
  }, [drivers, useLocalSandbox]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMsg(null);

    if (!supabase) {
      setAuthError('Supabase client is not loaded. Please set environment variables.');
      return;
    }

    if (!authEmail || !authPassword) {
      setAuthError('Please fill out both email and password keys.');
      return;
    }

    try {
      const result = await authService.signIn(authEmail, authPassword);

      if (result.success) {
        // Auth service will handle state updates via subscription
        setAuthEmail('');
        setAuthPassword('');
      } else {
        setAuthError(result.error || 'Authentication failed');
      }
    } catch (err: any) {
      errorHandler.logError(err, 'Authentication submission');
      setAuthError(err.message || 'Authentication flow encountered an error.');
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setAuthEmail('');
      setAuthPassword('');
    } catch (error) {
      errorHandler.logError(error as Error, 'Sign out');
    }
  };

  // --- Enhanced State Sync with Race Condition Prevention ---
  const syncCarsToSupabase = async (prev: CarAsset[], next: CarAsset[]) => {
    if (!isSupabaseConfigured() || useLocalSandbox) return;

    const nextStr = JSON.stringify(next);
    if (nextStr === lastSyncedCarsStr.current) return;

    try {
      await stateManager.executeWithLock('cars_sync', async () => {
        lastSyncedCarsStr.current = nextStr;
        
        const prevMap = new Map(prev.map(c => [c.id, c]));
        const nextMap = new Map(next.map(c => [c.id, c]));

        // Process deletions
        for (const prevCar of prev) {
          if (!nextMap.has(prevCar.id)) {
            await errorHandler.handleAsync(() => deleteCarFromDB(prevCar.id), `Delete car ${prevCar.id}`);
          }
        }

        // Process additions and updates
        for (const nextCar of next) {
          const prevCar = prevMap.get(nextCar.id);
          if (!prevCar) {
            await errorHandler.handleAsync(() => saveCarAssetToDB(nextCar), `Create car ${nextCar.id}`);
          } else {
            // Check for changes and update accordingly
            const hasChanges = JSON.stringify(prevCar) !== JSON.stringify(nextCar);
            if (hasChanges) {
              await errorHandler.handleAsync(() => saveCarAssetToDB(nextCar), `Update car ${nextCar.id}`);
            }
          }
        }
      });
    } catch (error) {
      errorHandler.logError(error as Error, 'Cars synchronization');
    }
  };

  const syncDriversToSupabase = async (prev: Driver[], next: Driver[]) => {
    if (!isSupabaseConfigured() || useLocalSandbox) return;

    const nextStr = JSON.stringify(next);
    if (nextStr === lastSyncedDriversStr.current) return;

    try {
      await stateManager.executeWithLock('drivers_sync', async () => {
        lastSyncedDriversStr.current = nextStr;

        const prevMap = new Map(prev.map(d => [d.id, d]));
        const nextMap = new Map(next.map(d => [d.id, d]));

        // Process deletions
        for (const prevDrv of prev) {
          if (!nextMap.has(prevDrv.id)) {
            await errorHandler.handleAsync(() => deleteDriverFromDB(prevDrv.id), `Delete driver ${prevDrv.id}`);
          }
        }

        // Process additions and updates
        for (const nextDrv of next) {
          const prevDrv = prevMap.get(nextDrv.id);
          if (!prevDrv) {
            await errorHandler.handleAsync(() => saveDriverToDB(nextDrv), `Create driver ${nextDrv.id}`);
          } else {
            const hasChanges = JSON.stringify(prevDrv) !== JSON.stringify(nextDrv);
            if (hasChanges) {
              await errorHandler.handleAsync(() => saveDriverToDB(nextDrv), `Update driver ${nextDrv.id}`);
            }
          }
        }
      });
    } catch (error) {
      errorHandler.logError(error as Error, 'Drivers synchronization');
    }
  };

  // Proxy wrapper setters
  const setCarsWithSyncProxy = (value: React.SetStateAction<CarAsset[]>) => {
    lastLocalUpdateTime.current = Date.now();
    setCars(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      syncCarsToSupabase(prev, next);
      return next;
    });
  };

  const setDriversWithSyncProxy = (value: React.SetStateAction<Driver[]>) => {
    lastLocalUpdateTime.current = Date.now();
    setDrivers(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      syncDriversToSupabase(prev, next);
      return next;
    });
  };

  // --- Render Authentication and Connection Setup Panel ---
  if (authState.loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-805 space-y-4" id="auth-loading-screen">
        <div className="w-16 h-16 flex items-center justify-center animate-pulse">
          <img src="/north-links.png" alt="North Links" className="w-full h-full object-contain" />
        </div>
        <div className="text-center animate-none">
          <p className="font-bold text-sm tracking-wider uppercase font-sans text-slate-800">Fleet Cloud Assets</p>
          <p className="text-xs text-slate-450 mt-1">Initializing secure credentials & synchronizing state...</p>
        </div>
      </div>
    );
  }

  // Show Auth Card if Supabase is Configured and user is NOT logged in currently, AND we have not bypassed with Local Sandbox
  if (dbConfigured && !authState.user && !useLocalSandbox && userRole === 'manager') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden" id="auth-unauthenticated-screen">
        {/* Abstract background blur circles */}
        <div className="absolute top-1/4 -left-36 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-36 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-white border border-gray-200/80 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 z-10 animate-fade-in" id="auth-form-card">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 flex items-center justify-center mx-auto">
              <img src="/north-links.png" alt="North Links" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase font-sans">North links Manager Portal</h2>
              <p className="text-xs text-slate-450 mt-1">Sign in with your manager credentials to access the management portal.</p>
            </div>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4" id="main-auth-form">
            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex flex-col gap-2" id="auth-error-msg-box">
                <div className="flex items-start gap-2.5">
                  <Shield className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span className="leading-relaxed font-semibold">{authError}</span>
                </div>
                {authError.includes("Database error saving new user") && (
                  <div className="mt-1 bg-white/90 border border-red-150 p-3 rounded-lg text-[11px] text-slate-700 font-normal space-y-2 leading-relaxed">
                    <p className="font-bold text-red-800 flex items-center gap-1">Supabase Trigger Conflict Detected</p>
                    <p>
                      Your Supabase database has a pre-existing <strong>PostgreSQL Trigger</strong> (typically <code>on_auth_user_created</code> on table <code>auth.users</code>) created from an old setup or separate project.
                    </p>
                    <p>
                      When a new user is created under authentication, that trigger fails because of a missing or mismatching public table (e.g. <code>profiles</code>).
                    </p>
                    <p className="font-semibold text-slate-800">To fix this, go to your Supabase Dashboard, open the SQL Editor, and run:</p>
                    <pre className="p-2 bg-slate-900 text-slate-50 font-mono text-[10px] rounded-lg overflow-x-auto select-all my-1.5 font-bold">
                      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
                    </pre>
                    <p className="text-[10px] text-slate-500">
                      Once this trigger is dropped, you can immediately create your account with no database error!
                    </p>
                  </div>
                )}
              </div>
            )}

            {authMsg && (
              <div className="p-3 bg-indigo-50 border border-indigo-150 text-indigo-750 rounded-xl text-xs flex items-start gap-2.5 animate-pulse" id="auth-info-msg-box">
                <Database className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
                <span className="leading-relaxed font-semibold">{authMsg}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email Address</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="e.g. manager@fleetcorp.com"
                className="w-full bg-slate-50 border border-gray-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none transition-colors"
                id="auth-input-email"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Password</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-50 border border-gray-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none transition-colors"
                id="auth-input-pwd"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
              id="auth-btn-submit"
            >
              <LogIn className="w-4 h-4" />
              Sign In to Manager Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Show Setup Guide if Supabase variables are totally missing AND user hasn't toggled sandbox
  if (!dbConfigured && !useLocalSandbox) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center justify-center p-4 relative" id="auth-unconfigured-screen">
        <div className="max-w-xl w-full bg-white border border-gray-200 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6" id="setup-card">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 flex items-center justify-center mx-auto">
              <img src="/north-links.png" alt="North Links" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 font-sans uppercase tracking-wide">Backend Database Needed</h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Ready to migrate to a real Supabase database and Cloudinary storage? Please define the credentials in your local environment parameters.
            </p>
          </div>

          <div className="bg-slate-50 border border-gray-150 rounded-2xl p-4 text-xs space-y-3 text-left" id="setup-guide-steps">
            <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider font-semibold block">⚙️ How to configure:</span>
            
            <ol className="list-decimal list-inside space-y-2 text-slate-655 text-left">
              <li>Open your local <strong className="font-mono text-slate-800">.env.example</strong> file or copy keys into your hosting environment parameters.</li>
              <li>Provision a free project on <span className="text-emerald-600 font-bold">Supabase</span> and paste your project URL & Anon key under:
                <pre className="mt-1 bg-white p-2 rounded text-[10px] font-mono border border-gray-200 text-slate-550">
                  VITE_SUPABASE_URL="https://your-proj.supabase.co"{"\n"}
                  VITE_SUPABASE_ANON_KEY="..."
                </pre>
              </li>
              <li>Generate your table structures inside Supabase's SQL Editor using the copy-pasteable script schema we compiled for you in <strong className="font-mono text-slate-800">/src/supabase-schema.sql</strong>!</li>
              <li>(Optional) Provision an unsigned upload preset on <b className="text-slate-800">Cloudinary</b> and paste:
                <pre className="mt-1 bg-white p-2 rounded text-[10px] font-mono border border-gray-200 text-slate-550">
                  VITE_CLOUDINARY_CLOUD_NAME="..."{"\n"}
                  VITE_CLOUDINARY_UPLOAD_PRESET="..."
                </pre>
              </li>
            </ol>
          </div>

          <div className="pt-2" id="setup-actions-block">
            <button
              type="button"
              onClick={() => {
                // Force check again
                const configuredNow = isSupabaseConfigured();
                setDbConfigured(configuredNow);
                if (configuredNow) {
                  setUseLocalSandbox(false);
                } else {
                  alert('Supabase credentials are still unconfigured in properties. Please save variables first.');
                }
              }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md hover:shadow-lg cursor-pointer text-center uppercase tracking-wider"
              id="setup-btn-recheck"
            >
              Verify Settings Again & Initialize
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render the appropriate hub/application with error boundaries
  if (userRole === 'driver') {
    const driverProps = {
      cars,
      setCars: setCarsWithSyncProxy,
      drivers,
      userRole,
      onSignOut: handleSignOut,
      ...(isLocked ? {} : { setUserRole })
    };

    return (
      <RouteErrorBoundary>
        <div className="flex flex-col min-h-screen" id="driver-app-host">
          <DriverApp {...driverProps} />
        </div>
      </RouteErrorBoundary>
    );
  }

  const managerProps = {
    cars,
    setCars: setCarsWithSyncProxy,
    drivers,
    setDrivers: setDriversWithSyncProxy,
    userRole,
    onSignOut: handleSignOut,
    dataLoading,
    ...(isLocked ? {} : { setUserRole })
  };

  return (
    <RouteErrorBoundary>
      <div className="flex flex-col min-h-screen" id="manager-app-host">
        <ManagerApp {...managerProps} />
      </div>
    </RouteErrorBoundary>
  );
}

// Export App with top-level error boundary
export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}
