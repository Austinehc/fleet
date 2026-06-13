import React from 'react';
import { Car, User, Plus, Coins, TrendingUp, Users, LogOut } from 'lucide-react';
import { CarAsset } from '../../types';

interface ManagerHeaderProps {
  activeTab: 'fleet' | 'staff' | 'finance';
  setActiveTab: (tab: 'fleet' | 'staff' | 'finance') => void;
  userRole: 'manager' | 'driver';
  setUserRole?: (role: 'manager' | 'driver') => void;
  onAddCarTrigger: () => void;
  onAddDriverTrigger: () => void;
  cars?: CarAsset[];
  onSignOut?: () => void;
}

export default function ManagerHeader({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  onAddCarTrigger,
  onAddDriverTrigger,
  cars = [],
  onSignOut
}: ManagerHeaderProps) {
  const pendingCount = cars.flatMap(car => car.revenueLogs || []).filter(r => r.status === 'Pending').length;

  return (
    <div id="manager-header-wrapper" className="text-left">
      {/* Top Banner Header */}
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-20 backdrop-blur-md bg-white/95 text-left" id="nav-header">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-left" id="brand-logo-area">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center">
                <Car className="w-6 h-6" id="logo-icon-car" />
              </div>
              <div className="text-left">
                <h1 className="text-lg font-bold text-gray-905 leading-tight tracking-tight uppercase">Transit Hub</h1>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 font-mono block text-left">
                  Manager Portal
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2.5 self-stretch md:self-center justify-end" id="btn-top-controls">
            
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="px-3 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-650 hover:text-rose-705 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                id="btn-nav-sign-out"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-505" />
                <span>Sign Out</span>
              </button>
            )}



            <button
              onClick={onAddDriverTrigger}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer font-sans"
              id="btn-add-driver-trigger"
            >
              <User className="w-4 h-4 text-slate-500" />
              Register Driver
            </button>

            <button
              onClick={onAddCarTrigger}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer font-sans"
              id="btn-add-car-trigger"
            >
              <Plus className="w-4 h-4" />
              Add Vehicle
            </button>

          </div>
        </div>
      </header>

      {/* Sub-navigation Menu bar */}
      <div className="bg-slate-50 border-b border-gray-200/80 text-left overflow-x-auto no-scrollbar" id="manager-sub-navigation">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between py-2.5 text-left min-w-max">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('fleet')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer font-sans ${
                activeTab === 'fleet'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-3xs'
              }`}
              id="mgr-view-tab-fleet"
            >
              <Car className="w-3.5 h-3.5" />
              Fleet Inventory
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('staff')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer font-sans ${
                activeTab === 'staff'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-3xs'
              }`}
              id="mgr-view-tab-staff"
            >
              <Users className="w-3.5 h-3.5" />
              Driver Management
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('finance')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer font-sans relative ${
                activeTab === 'finance'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-3xs'
              }`}
              id="mgr-view-tab-finance"
            >
              <Coins className="w-3.5 h-3.5 text-indigo-505" />
              <span>Ledgers & Approvals</span>
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full inline-flex items-center justify-center animate-pulse shrink-0">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
