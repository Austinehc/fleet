/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CarAsset, Driver } from './types';
import { initialCars, initialDrivers } from './data';
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
  saveFuelLogToDB,
  deleteServiceLogFromDB,
  deleteRevenueLogFromDB,
  deleteFuelLogFromDB
} from './lib/supabase';
import { Car, Shield, Database, Key, LogIn, UserPlus, Server, HelpCircle, LogOut } from 'lucide-react';

export default function App() {
  const [dbConfigured, setDbConfigured] = useState<boolean>(isSupabaseConfigured());
  const [useLocalSandbox, setUseLocalSandbox] = useState<boolean>(false);

  // --- Auth State ---
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authRole, setAuthRole] = useState<'manager' | 'driver'>('manager');
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

  // Sync URL query updates with userRole state dynamically
  useEffect(() => {
    // Don't allow role changes if locked by environment
    const envLockedRole = (import.meta as any).env?.VITE_APP_ROLE;
    if (envLockedRole === 'driver' || envLockedRole === 'manager') {
      return; // Skip URL-based role switching when environment role is set
    }
    
    const handleLocationChange = () => {
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get('role');
      if (roleParam === 'driver') {
        setUserRole('driver');
        localStorage.setItem('fleet_user_role', 'driver');
      } else if (roleParam === 'manager') {
        setUserRole('manager');
        localStorage.setItem('fleet_user_role', 'manager');
      }
    };
    
    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

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

  // --- Authentication state synchronization on start ---
  useEffect(() => {
    if (!dbConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        const params = new URLSearchParams(window.location.search);
        const roleParam = params.get('role');
        const role = roleParam === 'driver' || roleParam === 'manager'
          ? roleParam
          : (session.user.user_metadata?.role || 'manager');
        setUserRole(envLockedRole || role);
      }
      setAuthLoading(false);
    }).catch(err => {
      console.error('Session retrieve error:', err);
      setAuthLoading(false);
    });

    // Listen to Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        const params = new URLSearchParams(window.location.search);
        const roleParam = params.get('role');
        const role = roleParam === 'driver' || roleParam === 'manager'
          ? roleParam
          : (session.user.user_metadata?.role || 'manager');
        setUserRole(envLockedRole || role);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [dbConfigured]);

  // --- Push changes from Supabase to State or Fallback to LocalStorage ---
  useEffect(() => {
    async function loadBackendData() {
      const shouldLoadFromDb = isSupabaseConfigured() && !useLocalSandbox && supabase && (user || userRole === 'driver');
      if (!shouldLoadFromDb) {
        // Fallback or Local Storage Loading
        const savedCars = localStorage.getItem('fleet_cars');
        const savedDrivers = localStorage.getItem('fleet_drivers');
        setCars(savedCars ? JSON.parse(savedCars) : initialCars);
        setDrivers(savedDrivers ? JSON.parse(savedDrivers) : initialDrivers);
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
        console.error('Error fetching dynamic Supabase records, falling back:', err);
      } finally {
        setDataLoading(false);
      }
    }

    loadBackendData();
  }, [supabase, user, useLocalSandbox, dbConfigured, userRole]);

  // --- Periodic background poll updates from Supabase to keep driver & manager screens accurate live ---
  useEffect(() => {
    const shouldPoll = isSupabaseConfigured() && !useLocalSandbox && supabase && (user || userRole === 'driver');
    if (!shouldPoll) return;

    const intervalId = setInterval(async () => {
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
    }, 4000); // Poll every 4 seconds for snappy status updates

    return () => clearInterval(intervalId);
  }, [supabase, user, useLocalSandbox, dbConfigured, userRole]);

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
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              role: authRole
            }
          }
        });

        if (error) throw error;
        
        if (data.user && data.session) {
          setUser(data.user);
          setUserRole(envLockedRole || authRole);
          setAuthMsg('Account registered successfully! Welcome.');
        } else {
          setAuthMsg('Registration initiated! Please verify your password / verification link if required.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword
        });

        if (error) throw error;

        if (data.user) {
          setUser(data.user);
          const role = data.user.user_metadata?.role || 'manager';
          setUserRole(envLockedRole || role);
        }
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Authentication flow encountered an error.');
    }
  };

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
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
          for (const log of nextCar.fuelLogs || []) {
            await saveFuelLogToDB(nextCar.id, log).catch(err => console.error('Fuel logs failed:', err));
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

          // Check fuel logs changes
          const prevFuel = prevCar.fuelLogs || [];
          const nextFuel = nextCar.fuelLogs || [];
          const prevFuelIds = new Set(prevFuel.map(l => l.id));
          for (const f of nextFuel) {
            if (!prevFuelIds.has(f.id)) {
              await saveFuelLogToDB(nextCar.id, f).catch(err => console.error('Supabase fuel log fail:', err));
            }
          }
          const nextFuelIds = new Set(nextFuel.map(l => l.id));
          for (const f of prevFuel) {
            if (!nextFuelIds.has(f.id)) {
              await deleteFuelLogFromDB(f.id).catch(err => console.error('Supabase delete fuel log fail:', err));
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
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-805 space-y-4" id="auth-loading-screen">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center animate-spin">
          <Car className="w-6 h-6 text-indigo-600" />
        </div>
        <div className="text-center animate-none">
          <p className="font-bold text-sm tracking-wider uppercase font-sans text-slate-800">Fleet Cloud Assets</p>
          <p className="text-xs text-slate-450 mt-1">Initializing secure credentials & synchronizing state...</p>
        </div>
      </div>
    );
  }

  // Show Auth Card if Supabase is Configured and user is NOT logged in currently, AND we have not bypassed with Local Sandbox
  if (dbConfigured && !user && !useLocalSandbox && userRole === 'manager') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden" id="auth-unauthenticated-screen">
        {/* Abstract background blur circles */}
        <div className="absolute top-1/4 -left-36 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-36 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-white border border-gray-200/80 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 z-10 animate-fade-in" id="auth-form-card">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-650 rounded-xl flex items-center justify-center mx-auto shadow-md">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase font-sans">Fleet Assets Cloud Portal</h2>
              <p className="text-xs text-slate-450 mt-1">Connect your verified credentials to begin tracking fleet operations.</p>
            </div>
          </div>

          {/* Tab component for toggling auth login vs signup mode */}
          <div className="flex border-b border-gray-150" id="auth-mode-tabs">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError(null);
                setAuthMsg(null);
              }}
              className={`flex-1 pb-2.5 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                authMode === 'login'
                  ? 'border-indigo-600 text-indigo-600 font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
              id="auth-tab-login"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setAuthError(null);
                setAuthMsg(null);
              }}
              className={`flex-1 pb-2.5 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                authMode === 'signup'
                  ? 'border-indigo-600 text-indigo-600 font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
              id="auth-tab-signup"
            >
              Create Account
            </button>
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
                    <p className="font-bold text-red-800 flex items-center gap-1">💡 Supabase Trigger Conflict Detected</p>
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
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Corporate Email Address</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="e.g. user@fleetcorp.com"
                className="w-full bg-slate-50 border border-gray-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none transition-colors"
                id="auth-input-email"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Access PIN / Password</label>
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
              Authenticate Access
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
            <Database className="w-12 h-12 text-indigo-650 mx-auto animate-pulse" />
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
    return (
      <div className="flex flex-col min-h-screen" id="driver-app-host">
        <DriverApp
          cars={cars}
          setCars={setCarsWithSyncProxy}
          drivers={drivers}
          setDrivers={setDriversWithSyncProxy}
          userRole={userRole}
          setUserRole={isLocked ? undefined : setUserRole}
          onSignOut={handleSignOut}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" id="manager-app-host">
      <ManagerApp
        cars={cars}
        setCars={setCarsWithSyncProxy}
        drivers={drivers}
        setDrivers={setDriversWithSyncProxy}
        userRole={userRole}
        setUserRole={isLocked ? undefined : setUserRole}
        onSignOut={handleSignOut}
        dataLoading={dataLoading}
      />
    </div>
  );
}
