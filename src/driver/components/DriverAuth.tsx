import React, { useState } from 'react';
import { Key, UserCheck, Shield, ChevronLeft } from 'lucide-react';
import { Driver } from '../../types';

interface DriverAuthProps {
  drivers: Driver[];
  onAuthSuccess: (driverId: string, fullName: string) => void;
  driverLoginError: string | null;
  setDriverLoginError: (err: string | null) => void;
}

export default function DriverAuth({
  drivers,
  onAuthSuccess,
  driverLoginError,
  setDriverLoginError
}: DriverAuthProps) {
  const [enteredDriverCode, setEnteredDriverCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDriverLoginError(null);
    const trimmedCode = enteredDriverCode.trim();
    if (trimmedCode.length !== 6) {
      setDriverLoginError('The access code must be exactly 6 characters.');
      return;
    }
    const matchedDrv = drivers.find(
      d => d.accessCode?.trim().toUpperCase() === trimmedCode.toUpperCase()
    );
    if (matchedDrv) {
      onAuthSuccess(matchedDrv.id, matchedDrv.fullName);
      setEnteredDriverCode('');
    } else {
      setDriverLoginError('Invalid/unknown access code. Please verify the code or contact your system manager.');
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

        {/* Login credentials Form code */}
        <form onSubmit={handleSubmit} className="space-y-5 text-left" id="drv-code-form">
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Your personal access code (6 digits)</label>
            <input
              type="text"
              maxLength={6}
              required
              placeholder="e.g. AD3F89"
              value={enteredDriverCode}
              onChange={(e) => setEnteredDriverCode(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 border border-gray-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-base text-center font-mono font-black uppercase text-slate-800 tracking-widest focus:outline-none transition-colors"
              id="drv-input-access-code"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 uppercase tracking-widest"
            id="drv-btn-authenticate"
          >
            <UserCheck className="w-4 h-4" />
            Access Driver Station
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
