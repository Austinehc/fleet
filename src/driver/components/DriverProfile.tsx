import React from 'react';
import { Driver } from '../../types';

interface DriverProfileProps {
  activeDriver: Driver;
  driverPortalTab: 'log_work' | 'history';
  setDriverPortalTab: (tab: 'log_work' | 'history') => void;
}

export default function DriverProfile({
  activeDriver,
  driverPortalTab,
  setDriverPortalTab
}: DriverProfileProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" id="drv-profile-strip">
      <div className="flex items-center gap-4 text-left">
        {activeDriver.profilePicture ? (
          <img
            src={activeDriver.profilePicture}
            alt={activeDriver.fullName}
            className="w-12 h-12 rounded-2xl shadow-md border border-indigo-200 object-cover shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="bg-indigo-650 text-white w-12 h-12 rounded-2xl shadow-md shadow-indigo-600/10 flex items-center justify-center font-bold text-lg shrink-0">
            {activeDriver.fullName.split(' ').map(n => n[0]).join('')}
          </div>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-855">{activeDriver.fullName}</h2>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
              activeDriver.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              activeDriver.status === 'On Leave' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
              'bg-slate-100 text-slate-500'
            }`}>
              Status: {activeDriver.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
              ID: {activeDriver.id}
            </span>
            <span>• Lic: <strong className="font-mono text-slate-800">{activeDriver.licenseNumber}</strong></span>
            <span>• Phone: <strong className="text-slate-855">{activeDriver.phone}</strong></span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 self-start md:self-auto text-left" id="driver-portal-nav-bar">
        <button
          type="button"
          onClick={() => setDriverPortalTab('log_work')}
          className={`py-1.5 px-3.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
            driverPortalTab === 'log_work'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-150'
              : 'text-slate-550 hover:text-slate-800'
          }`}
          id="tab-btn-drv-log"
        >
          Log Activities
        </button>
        <button
          type="button"
          onClick={() => setDriverPortalTab('history')}
          className={`py-1.5 px-3.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
            driverPortalTab === 'history'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-150'
              : 'text-slate-550 hover:text-slate-800'
          }`}
          id="tab-btn-drv-hist"
        >
          My Logs History
        </button>
      </div>
    </div>
  );
}
