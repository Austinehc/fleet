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
  saveFuelLogToDB
} from './lib/supabase';
import { Car, Shield, Database, CloudLightning, Key, LogIn, UserPlus, Server, HelpCircle, LogOut } from 'lucide-react';

export default function App() {
  const [dbConfigured, setDbConfigured] = useState<boolean>(isSupabaseConfigured());
  const [useLocalSandbox, setUseLocalSandbox] = useState<boolean>(!isSupabaseConfigured());

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

  // --- Current Active UI Role ---
  const [userRole, setUserRole] = useState<'manager' | 'driver'>(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    if (roleParam === 'driver' || roleParam === 'manager') {
      return roleParam;
    }
    return 'manager';
  });

  // Sync URL query updates with userRole state dynamically
  useEffect(() => {
    const handleLocationChange = () => {
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get('role');
      if (roleParam === 'driver') {
        setUserRole('driver');
      } else if (roleParam === 'manager') {
        setUserRole('manager');
      }
    };
    
    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

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
        const role = session.user.user_metadata?.role || 'manager';
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
        const role = session.user.user_metadata?.role || 'manager';
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

      setDataLoading(true);
      try {
        const dbCars = await getCarsFromDB();
        const dbDrivers = await getDriversFromDB();
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
        if (nextSvc.length !== prevSvc.length) {
          const prevSvcIds = new Set(prevSvc.map(l => l.id));
          for (const s of nextSvc) {
            if (!prevSvcIds.has(s.id)) {
              await saveServiceLogToDB(nextCar.id, s).catch(err => console.error('Supabase svc log fail:', err));
            }
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

        // Check fuel logs changes
        const prevFuel = prevCar.fuelLogs || [];
        const nextFuel = nextCar.fuelLogs || [];
        if (nextFuel.length !== prevFuel.length) {
          const prevFuelIds = new Set(prevFuel.map(l => l.id));
          for (const f of nextFuel) {
            if (!prevFuelIds.has(f.id)) {
              await saveFuelLogToDB(nextCar.id, f).catch(err => console.error('Supabase fuel log fail:', err));
            }
          }
        }
      }
    }
  };

  const syncDriversToSupabase = async (prev: Driver[], next: Driver[]) => {
    if (!isSupabaseConfigured() || useLocalSandbox) return;

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
  };

  // Proxy wrapper setters
  const setCarsWithSyncProxy = (value: React.SetStateAction<CarAsset[]>) => {
    setCars(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      syncCarsToSupabase(prev, next);
      return next;
    });
  };

  const setDriversWithSyncProxy = (value: React.SetStateAction<Driver[]>) => {
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

          <form onSubmit={handleAuthSubmit} className="space-y-4" id="main-auth-form">
            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-705 rounded-xl text-xs flex items-start gap-2.5" id="auth-error-msg-box">
                <Shield className="w-4 h-4 shrink-0 mt-0.5 text-red-505 text-red-500" />
                <span className="leading-relaxed font-semibold">{authError}</span>
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

          {/* Fallback sandbox launcher */}
          <div className="border-t border-gray-150 pt-5 space-y-3" id="sandbox-fallback-area">
            <p className="text-[10px] text-slate-450 text-center leading-relaxed font-semibold">
              ⚠️ Developer Notice: Supabase is online! Want to test without creating a database user?
            </p>
            <button
              type="button"
              onClick={() => setUseLocalSandbox(true)}
              className="w-full py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-605 hover:text-indigo-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-3xs"
              id="btn-trigger-sandbox"
            >
              <CloudLightning className="w-3.5 h-3.5 text-amber-500" />
              Bypass Auth and Run Offline Local-First
            </button>
          </div>
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

          <div className="flex flex-col sm:flex-row gap-3 pt-2" id="setup-actions-block">
            <button
              type="button"
              onClick={() => {
                setUseLocalSandbox(true);
              }}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
              id="setup-btn-sandbox"
            >
              <CloudLightning className="w-4 h-4" />
              Try Demo Sandbox First
            </button>
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
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-205 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer text-center transition-all shadow-3xs"
              id="setup-btn-recheck"
            >
              Verify Settings Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Real-Time Sync Indicator Panel or Sign Out banner ---
  const StatusOverlayInfo = () => {
    return (
      <div className="bg-slate-900 border-b border-slate-805 text-[11px] text-slate-400 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 z-30 relative" id="cloud-sync-status-bar">
        <div className="flex items-center gap-2">
          {useLocalSandbox ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
              <span>Running in <strong className="text-amber-400 font-bold uppercase text-[9px]">Offline Sandbox mode</strong> (Local browser storage).</span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset local sandbox storage to default demo data (3 premium cars, diagnostic histories, existing logs, and active drivers with PIN codes)?')) {
                    localStorage.removeItem('fleet_cars');
                    localStorage.removeItem('fleet_drivers');
                    localStorage.removeItem('fleet_active_driver_id');
                    setCars(initialCars);
                    setDrivers(initialDrivers);
                    // Force refresh active driver ID state if needed
                    window.location.reload();
                  }
                }}
                className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 px-2 py-0.5 rounded-[6px] text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-3xs transition-all flex items-center gap-1"
                title="Fill sandbox with 3 premium cars and 3 active pilots"
                id="btn-sandbox-seed-reset"
              >
                🔄 Seed/Reset Demo Data
              </button>
            </div>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="flex flex-wrap items-center gap-1.5">
                <span>Synchronized with <strong className="text-emerald-400 font-bold">Supabase CLOUD DB</strong>.</span>
                <span className="text-[10px] text-slate-500">• User: {user?.email}</span>
                <span className="px-1.5 bg-slate-800 text-indigo-400 rounded text-[9px] uppercase font-bold font-mono">
                  {userRole} view
                </span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isSupabaseConfigured() && useLocalSandbox && (
            <button
              onClick={() => {
                setUseLocalSandbox(false);
                setDbConfigured(true);
              }}
              className="text-indigo-400 hover:text-indigo-300 font-bold text-[10px] uppercase hover:underline cursor-pointer"
              id="btn-reconnect-cloud"
            >
              🔌 Connect Cloud
            </button>
          )}

          {user && (
            <button
              onClick={handleSignOut}
              className="text-slate-500 hover:text-slate-300 font-semibold flex items-center gap-1 cursor-pointer"
              id="state-bar-signout-btn"
            >
              <LogOut className="w-3 h-3 text-red-500" />
              Sign Out
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render the appropriate hub/application
  if (userRole === 'driver') {
    return (
      <div className="flex flex-col min-h-screen" id="driver-app-host">
        <StatusOverlayInfo />
        <DriverApp
          cars={cars}
          setCars={setCarsWithSyncProxy}
          drivers={drivers}
          setDrivers={setDriversWithSyncProxy}
          userRole={userRole}
          setUserRole={isLocked ? undefined : setUserRole}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" id="manager-app-host">
      <StatusOverlayInfo />
      <ManagerApp
        cars={cars}
        setCars={setCarsWithSyncProxy}
        drivers={drivers}
        setDrivers={setDriversWithSyncProxy}
        userRole={userRole}
        setUserRole={isLocked ? undefined : setUserRole}
      />
    </div>
  );
}
