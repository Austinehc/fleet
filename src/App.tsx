/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CarAsset, Driver } from './types';
import ManagerApp from './ManagerApp';
import DriverApp from './DriverApp';
import {
  isSupabaseConfigured,
  supabase,
  getCarsFromDB,
  getDriversFromDB,
  saveCarAssetToDB,
  deleteCarFromDB,
  saveDriverToDB,
  deleteDriverFromDB,
  saveServiceLogToDB,
  saveRevenueLogToDB,
  saveInsuranceLogToDB,
  deleteServiceLogFromDB,
  deleteRevenueLogFromDB,
  deleteInsuranceLogFromDB
} from './lib/supabase';
import { Shield, Database, LogIn } from 'lucide-react';
import { useOptimizedPolling } from './lib/performance';
import { authService, AuthState } from './lib/authService';

export default function App() {
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

  // --- Refs to track active database sync states / operations and prevent redundant loads & loops ---
  const lastSyncedCarsStr = React.useRef<string>('');
  const lastSyncedDriversStr = React.useRef<string>('');
  const writeTransactionsInFlight = React.useRef<number>(0);
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

  // --- Push changes from Supabase to State or Fallback to LocalStorage ---
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
        const dbCars = await getCarsFromDB();
        const dbDrivers = await getDriversFromDB();
        
        // Seed last synced refs to prevent feedback loops on initial load
        lastSyncedCarsStr.current = JSON.stringify(dbCars);
        lastSyncedDriversStr.current = JSON.stringify(dbDrivers);

        setCars(dbCars);
        setDrivers(dbDrivers);
      } catch (err: any) {
        console.error('Error fetching dynamic Supabase records, falling back to empty state:', err);
        setCars([]);
        setDrivers([]);
      } finally {
        setDataLoading(false);
      }
    }

    loadBackendData();
  }, [supabase, authState.user, useLocalSandbox, dbConfigured, userRole]);

  // --- Optimized periodic background poll updates from Supabase to keep driver & manager screens accurate live ---
  const { startPolling, stopPolling } = useOptimizedPolling(
    async () => {
      // Avoid overwriting local state or making fetch request if write transactions are actively in flight
      if (writeTransactionsInFlight.current > 0) {
        return;
      }
      // If we made a local update within the last 8 seconds, do not overwrite state with poll data to prevent flicker/double-sync
      if (Date.now() - lastLocalUpdateTime.current < 8000) {
        return;
      }
      try {
        const dbCars = await getCarsFromDB();
        if (writeTransactionsInFlight.current > 0) return;
        if (Date.now() - lastLocalUpdateTime.current < 8000) return;
        const dbDrivers = await getDriversFromDB();
        if (writeTransactionsInFlight.current > 0) return;
        if (Date.now() - lastLocalUpdateTime.current < 8000) return;
        
        // Save database outputs as currently synced
        lastSyncedCarsStr.current = JSON.stringify(dbCars);
        lastSyncedDriversStr.current = JSON.stringify(dbDrivers);

        // Directly overwrite state quietly
        setCars(dbCars);
        setDrivers(dbDrivers);
      } catch (err) {
        console.warn('Background database synchronization poll failed:', err);
      }
    },
    5000 // Optimized interval: 5 seconds for responsive updates
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

  // --- Auth Handlers ---
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
      console.error(err);
      setAuthError(err.message || 'Authentication flow encountered an error.');
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
    setAuthEmail('');
    setAuthPassword('');
  };

  // --- Wrapped State Proxy Sync Engine ---
  const syncCarsToSupabase = async (prev: CarAsset[], next: CarAsset[]) => {
    if (!isSupabaseConfigured() || useLocalSandbox) return;

    // Check if the current next state has already been processed or matches
    const nextStr = JSON.stringify(next);
    if (nextStr === lastSyncedCarsStr.current) {
      return;
    }
    lastSyncedCarsStr.current = nextStr;

    writeTransactionsInFlight.current++;
    try {
      const prevMap = new Map(prev.map(c => [c.id, c]));
      const nextMap = new Map(next.map(c => [c.id, c]));

      // 1. Detect Detachments / Row deletions
      for (const prevCar of prev) {
        if (!nextMap.has(prevCar.id)) {
          await deleteCarFromDB(prevCar.id).catch(err => console.error('Supabase deletes fail:', err));
        }
      }

      // 2. Detect Insertions and Updates
      for (const nextCar of next) {
        const prevCar = prevMap.get(nextCar.id);

        if (!prevCar) {
          // Totally new car added
          await saveCarAssetToDB(nextCar).catch(err => console.error('Supabase car save fail:', err));
          
          // Save initial sub-logs if any exist inside this car
          for (const log of nextCar.serviceLogs || []) {
            await saveServiceLogToDB(nextCar.id, log).catch(err => console.error('Svc logs failed:', err));
          }
          for (const log of nextCar.revenueLogs || []) {
            await saveRevenueLogToDB(nextCar.id, log).catch(err => console.error('Revenue logs failed:', err));
          }
          for (const log of nextCar.insuranceLogs || []) {
            await saveInsuranceLogToDB(nextCar.id, log).catch(err => console.error('Insurance logs failed:', err));
          }
        } else {
          // Compare values
          const hasCarChanges =
            prevCar.make !== nextCar.make ||
            prevCar.model !== nextCar.model ||
            prevCar.year !== nextCar.year ||
            prevCar.plateNumber !== nextCar.plateNumber ||
            prevCar.color !== nextCar.color ||
            prevCar.vin !== nextCar.vin ||
            prevCar.mileage !== nextCar.mileage ||
            prevCar.status !== nextCar.status ||
            (prevCar.purchasePrice ?? 0) !== (nextCar.purchasePrice ?? 0) ||
            (prevCar.salePrice ?? 0) !== (nextCar.salePrice ?? 0) ||
            prevCar.disposedAt !== nextCar.disposedAt ||
            Boolean(prevCar.isDisposed) !== Boolean(nextCar.isDisposed) ||
            JSON.stringify(prevCar.photos) !== JSON.stringify(nextCar.photos);

          if (hasCarChanges) {
            await saveCarAssetToDB(nextCar).catch(err => console.error('Supabase update car fail:', err));
          }

          // Check service logs changes
          const prevSvc = prevCar.serviceLogs || [];
          const nextSvc = nextCar.serviceLogs || [];
          const prevSvcIds = new Set(prevSvc.map(l => l.id));
          for (const s of nextSvc) {
            if (!prevSvcIds.has(s.id)) {
              await saveServiceLogToDB(nextCar.id, s).catch(err => console.error('Supabase svc log fail:', err));
            }
          }
          const nextSvcIds = new Set(nextSvc.map(l => l.id));
          for (const s of prevSvc) {
            if (!nextSvcIds.has(s.id)) {
              await deleteServiceLogFromDB(s.id).catch(err => console.error('Supabase delete svc log fail:', err));
            }
          }

          // Check revenue logs changes
          const prevRev = prevCar.revenueLogs || [];
          const nextRev = nextCar.revenueLogs || [];
          const prevRevIdMap = new Map(prevRev.map(l => [l.id, l]));
          for (const r of nextRev) {
            const prevR = prevRevIdMap.get(r.id);
            if (!prevR) {
              await saveRevenueLogToDB(nextCar.id, r).catch(err => console.error('Supabase revenue log fail:', err));
            } else if (prevR.status !== r.status) {
              // Approval toggled
              await saveRevenueLogToDB(nextCar.id, r).catch(err => console.error('Supabase revenue change status fail:', err));
            }
          }
          const nextRevIds = new Set(nextRev.map(l => l.id));
          for (const r of prevRev) {
            if (!nextRevIds.has(r.id)) {
              await deleteRevenueLogFromDB(r.id).catch(err => console.error('Supabase delete revenue log fail:', err));
            }
          }

          // Check insurance logs changes
          const prevInsurance = prevCar.insuranceLogs || [];
          const nextInsurance = nextCar.insuranceLogs || [];
          const prevInsuranceIds = new Set(prevInsurance.map(l => l.id));
          for (const i of nextInsurance) {
            if (!prevInsuranceIds.has(i.id)) {
              await saveInsuranceLogToDB(nextCar.id, i).catch(err => console.error('Supabase insurance log fail:', err));
            }
          }
          const nextInsuranceIds = new Set(nextInsurance.map(l => l.id));
          for (const i of prevInsurance) {
            if (!nextInsuranceIds.has(i.id)) {
              await deleteInsuranceLogFromDB(i.id).catch(err => console.error('Supabase delete insurance log fail:', err));
            }
          }
        }
      }
    } finally {
      // Small delay on clearing flight count to allow database transactions to settle nicely
      setTimeout(() => {
        writeTransactionsInFlight.current = Math.max(0, writeTransactionsInFlight.current - 1);
      }, 500);
    }
  };

  const syncDriversToSupabase = async (prev: Driver[], next: Driver[]) => {
    if (!isSupabaseConfigured() || useLocalSandbox) return;

    // Check if the current next state has already been processed or matches
    const nextStr = JSON.stringify(next);
    if (nextStr === lastSyncedDriversStr.current) {
      return;
    }
    lastSyncedDriversStr.current = nextStr;

    writeTransactionsInFlight.current++;
    try {
      const prevMap = new Map(prev.map(d => [d.id, d]));
      const nextMap = new Map(next.map(d => [d.id, d]));

      // Deletes
      for (const prevDrv of prev) {
        if (!nextMap.has(prevDrv.id)) {
          await deleteDriverFromDB(prevDrv.id).catch(err => console.error('Supabase driver delete fail:', err));
        }
      }

      // Inserts/Updates
      for (const nextDrv of next) {
        const prevDrv = prevMap.get(nextDrv.id);
        if (!prevDrv) {
          await saveDriverToDB(nextDrv).catch(err => console.error('Supabase driver insert fail:', err));
        } else {
          const changed =
            prevDrv.fullName !== nextDrv.fullName ||
            prevDrv.licenseNumber !== nextDrv.licenseNumber ||
            prevDrv.nrcNumber !== nextDrv.nrcNumber ||
            prevDrv.email !== nextDrv.email ||
            prevDrv.phone !== nextDrv.phone ||
            prevDrv.status !== nextDrv.status ||
            prevDrv.assignedCarId !== nextDrv.assignedCarId ||
            prevDrv.profilePicture !== nextDrv.profilePicture ||
            prevDrv.accessCode !== nextDrv.accessCode;

          if (changed) {
            await saveDriverToDB(nextDrv).catch(err => console.error('Supabase driver update fail:', err));
          }
        }
      }
    } finally {
      setTimeout(() => {
        writeTransactionsInFlight.current = Math.max(0, writeTransactionsInFlight.current - 1);
      }, 500);
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

  // Render the appropriate hub/application
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
      <div className="flex flex-col min-h-screen" id="driver-app-host">
        <DriverApp {...driverProps} />
      </div>
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
    <div className="flex flex-col min-h-screen" id="manager-app-host">
      <ManagerApp {...managerProps} />
    </div>
  );
}
