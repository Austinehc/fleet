import React, { useState } from 'react';
import { SlidersHorizontal, Search, AlertTriangle, User, Gauge, Edit, Car, Trash2 } from 'lucide-react';
import { CarAsset, Driver } from '../../types';
import { createSafeCar, createSafeDriver, safeFind } from '../../lib/typeSafety';

interface FleetDashboardProps {
  cars: CarAsset[];
  setCars: React.Dispatch<React.SetStateAction<CarAsset[]>>;
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  selectedCarId: string | null;
  setSelectedCarId: (id: string | null) => void;
  onEditCar: (car: CarAsset) => void;
  onEditDriver: (driver: Driver) => void;
  onManageDrivers: () => void;
  setShowCamera: (show: boolean) => void;
  setNewCarPhoto: (photo: string) => void;
}

export default function FleetDashboard({
  cars,
  setCars,
  drivers,
  setDrivers,
  onEditCar
}: FleetDashboardProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [disposeTargetCar, setDisposeTargetCar] = useState<CarAsset | null>(null);
  const [disposeAction, setDisposeAction] = useState<'sold' | 'delete' | null>(null);
  const [disposeSalePrice, setDisposeSalePrice] = useState('');
  const [disposeError, setDisposeError] = useState('');
  const [deleteExportConfirmed, setDeleteExportConfirmed] = useState(false);

  // Stats Counters
  const totalAssets = cars.length;
  const metrics = {
    available: cars.filter(c => c.status === 'Available').length,
    assigned: cars.filter(c => c.status === 'Assigned').length,
    maintenance: cars.filter(c => c.status === 'Maintenance').length,
    oos: cars.filter(c => c.status === 'Out of Service').length
  };
  const activeDrivers = drivers.filter(d => d.status === 'Active').length;

  const handleDisposeCar = () => {
    if (!disposeTargetCar) return;

    if (disposeAction === 'delete') {
      if (!deleteExportConfirmed) {
        setDisposeError('Please confirm that all data has been exported before deleting this asset.');
        return;
      }

      setCars(prev => prev.filter(car => car.id !== disposeTargetCar.id));
      setDrivers(prev => prev.map(driver => {
        if (driver.assignedCarId === disposeTargetCar.id) {
          return { ...driver, assignedCarId: null, status: 'On Leave' as const };
        }
        return driver;
      }));
      setDisposeTargetCar(null);
      setDisposeAction(null);
      setDisposeSalePrice('');
      setDisposeError('');
      setDeleteExportConfirmed(false);
      return;
    }

    const parsedSalePrice = Number(disposeSalePrice);
    if (!Number.isFinite(parsedSalePrice) || parsedSalePrice < 0) {
      setDisposeError('Please enter a valid sale price');
      return;
    }

    const today = new Date().toISOString().split('T')[0] || '';

    setCars(prev => prev.map(car => {
      if (car.id !== disposeTargetCar.id) return car;

      const saleLog = {
        id: `sale-${Date.now()}`,
        date: today,
        amount: parsedSalePrice,
        category: 'Other' as const,
        description: `Vehicle disposal sale - ${car.make} ${car.model} (${car.plateNumber})`,
        status: 'Approved' as const,
      };

      return {
        ...car,
        status: 'Disposed' as const,
        isDisposed: true,
        disposedAt: today,
        salePrice: parsedSalePrice,
        purchasePrice: car.purchasePrice ?? 0,
        revenueLogs: [...(car.revenueLogs || []), saleLog],
      };
    }));

    setDrivers(prev => prev.map(driver => {
      if (driver.assignedCarId === disposeTargetCar.id) {
        return { ...driver, assignedCarId: null, status: 'On Leave' as const };
      }
      return driver;
    }));

    setDisposeTargetCar(null);
    setDisposeAction(null);
    setDisposeSalePrice('');
    setDisposeError('');
    setDeleteExportConfirmed(false);
  };

  // Filter cars list
  const filteredCars = cars.filter(car => {
    // Status Filter
    if (statusFilter !== 'All' && car.status !== statusFilter) return false;

    // Search query match (plate or driver name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const plateMatch = car.plateNumber.toLowerCase().includes(q);
      const makeModelMatch = `${car.make} ${car.model}`.toLowerCase().includes(q);
      
      const assignedDriver = drivers.find(d => d.assignedCarId === car.id);
      const driverMatch = assignedDriver ? assignedDriver.fullName.toLowerCase().includes(q) : false;

      if (!plateMatch && !makeModelMatch && !driverMatch) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0" id="manager-fleet-dashboard-root">
      
      {/* 4-Column High-Contrast Stats Banner */}
      <section className="bg-white border-b border-gray-200/80 py-5" id="fleet-stats-banner">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-banner-grid">
            
            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3 text-left" id="stat-card-total">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide font-sans">Total Assets</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-gray-900">{totalAssets}</span>
                  <span className="text-[10px] text-gray-550">vehicles</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3 text-left" id="stat-card-available">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Available</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-gray-900">{metrics.available}</span>
                  <span className="text-[10px] text-gray-550 font-semibold">ready</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3 text-left" id="stat-card-assigned">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">On Road</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-gray-900">{metrics.assigned}</span>
                  <span className="text-[10px] text-gray-550 font-semibold">assigned</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3 text-left" id="stat-card-active-driver">
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide font-sans">Active Drivers</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-gray-900">{activeDrivers}</span>
                  <span className="text-[10px] text-gray-550 font-semibold font-sans">staff keys</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Main Grid Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6" id="dashboard-body">
        
        <div className="flex flex-col gap-5 text-left w-full" id="fleet-list-section">
          
          {/* Filter and Search Box Control panel */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200/70 shadow-sm space-y-4" id="fleet-filter-card">
            
            {/* Search Bar plate or name as specified */}
            <div className="relative text-left" id="search-input-wrapper">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search fleet by plate number or driver name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 hover:bg-gray-50/80 focus:bg-white text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 placeholder-gray-400 transition-all font-medium text-gray-900"
                id="fleet-search-box"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full w-5 h-5 flex items-center justify-center font-bold"
                  id="btn-clear-search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Tag Filters Row */}
            <div className="flex flex-wrap items-center gap-1.5" id="status-filters-row">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mr-1.5 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filter status:
              </span>
              {['All', 'Available', 'Assigned', 'Maintenance', 'Out of Service'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    statusFilter === status
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-transparent'
                  }`}
                  id={`filter-${status.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle Results Grid List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" id="vehicles-grid">
            {filteredCars.length > 0 ? (
              filteredCars.map((car) => {
                // Use type-safe car wrapper
                const safeCar = createSafeCar(car);
                const driverAssigned = safeFind(drivers, d => d.assignedCarId === car.id);
                const safeDriver = createSafeDriver(driverAssigned);
                
                // Check for expiring insurance using safe methods
                const expiringInsurance = safeCar.getExpiringInsurance(30);
                const expiredInsurance = safeCar.getExpiredInsurance();
                
                return (
                    <div
                    key={safeCar.id}
                    onClick={() => car.status !== 'Disposed' && onEditCar(car)}
                    className={`group bg-white rounded-2xl border border-gray-200/75 hover:border-indigo-300 hover:shadow-xs transition-all overflow-hidden relative flex flex-col justify-between ${car.status === 'Disposed' ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                    id={`car-card-${safeCar.id}`}
                  >
                    {/* Insurance Alert Banner */}
                    {(expiredInsurance.length > 0 || expiringInsurance.length > 0) && (
                      <div className={`px-3 py-1.5 text-center text-xs font-bold ${
                        expiredInsurance.length > 0 
                          ? 'bg-red-50 text-red-700 border-b border-red-100' 
                          : 'bg-amber-50 text-amber-700 border-b border-amber-100'
                      }`}>
                        {expiredInsurance.length > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{expiredInsurance.length} Insurance Expired</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{expiringInsurance.length} Insurance Expiring Soon</span>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Picture Header (Renders uploaded vehicle photo or elegant fallback) */}
                    <div className="h-32 bg-slate-50 relative overflow-hidden shrink-0 border-b border-gray-100" id={`card-pic-${safeCar.id}`}>
                      {safeCar.hasPhotos ? (
                        <img
                          src={safeCar.primaryPhoto!}
                          alt={safeCar.displayName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:scale-102 transition-all p-4">
                          <Car className="w-8 h-8 text-slate-300 animate-pulse" />
                          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-1.5 font-sans">No Photo Recorded</span>
                        </div>
                      )}
                      
                      {/* Floating badgifiers */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 select-none">
                        <span className="bg-white/95 backdrop-blur-xs border border-gray-250 text-gray-805 font-mono font-bold text-[9px] px-1.5 py-0.5 rounded shadow-3xs uppercase" id={`plate-lbl-${safeCar.id}`}>
                          {safeCar.plateNumber}
                        </span>
                        <span className={`text-[8px] font-black tracking-wide px-2 py-0.5 rounded-full uppercase shadow-3xs ${
                          safeCar.status === 'Available' ? 'bg-emerald-500 text-white' :
                          safeCar.status === 'Assigned' ? 'bg-indigo-600 text-white' :
                          safeCar.status === 'Maintenance' ? 'bg-amber-500 text-white' :
                          'bg-rose-500 text-white'
                        }`} id={`status-tag-${safeCar.id}`}>
                          {safeCar.status}
                        </span>
                      </div>

                      {/* Hover action indicator */}
                      <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-xs hover:bg-white text-indigo-600 p-1.5 rounded-lg shadow-3xs transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Edit className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Card Content Box */}
                    <div className="p-4 flex-1 flex flex-col justify-between text-left" id={`card-body-${safeCar.id}`}>
                      <div>
                        <div className="flex items-center justify-between" id={`card-title-row-${safeCar.id}`}>
                          <h3 className="font-extrabold text-gray-950 group-hover:text-indigo-600 transition-colors text-sm truncate uppercase tracking-tight">
                            {safeCar.make} {safeCar.model}
                          </h3>
                          <span className="text-xs font-mono text-gray-400 font-bold">{safeCar.year}</span>
                        </div>
                        <p className="text-[11px] text-gray-550 mt-1 flex items-center gap-1 bg-slate-50 py-1 px-1.5 rounded" id={`card-details-row-${safeCar.id}`}>
                          <Gauge className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-mono font-bold">{safeCar.mileage.toLocaleString()} km</span>
                          <span className="text-gray-300">|</span>
                          <span className="font-mono text-gray-450 text-[10px] truncate max-w-[120px]">VIN: {safeCar.vin.substring(0, 10)}...</span>
                        </p>
                      </div>

                      {/* Driver assignment footer */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2" id={`card-driver-sec-${safeCar.id}`}>
                        <div className="flex items-center gap-2 text-left" id={`driver-meta-${safeCar.id}`}>
                          <div className={`p-1.5 rounded-lg ${safeDriver.isActive && safeDriver.hasAssignedCar ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left font-sans">
                            <p className="text-[9px] uppercase tracking-wide font-bold text-gray-400">Driver Assignment</p>
                            <p className="text-xs font-extrabold text-gray-800 line-clamp-1 font-sans">
                              {safeDriver.fullName || 'No Driver Assigned'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDisposeTargetCar(car);
                            setDisposeAction(safeCar.isDisposed ? 'delete' : null);
                            setDisposeSalePrice('');
                            setDisposeError('');
                            setDeleteExportConfirmed(false);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          {safeCar.isDisposed ? 'Delete' : 'Dispose'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full bg-white rounded-2xl border border-gray-100 p-12 text-center" id="empty-results-box">
                <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-gray-400 mb-3">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-gray-850 text-sm">No Vehicles Found</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">None of the fleet vehicles matched your plate query or driver status selections.</p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
                  className="mt-3.5 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-120 text-indigo-700 font-bold rounded-lg text-xs transition-colors cursor-pointer font-sans"
                  id="btn-reset-filters"
                >
                  Clear Filter Selections
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {disposeTargetCar && (
        <div className="fixed inset-0 z-[60] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4" id="dispose-car-modal">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl text-left" id="dispose-car-modal-box">
            <h3 className="text-sm font-bold text-gray-900">Dispose vehicle</h3>
            <p className="mt-1 text-xs text-gray-500">
              Choose what to do with {disposeTargetCar.make} {disposeTargetCar.model} ({disposeTargetCar.plateNumber}).
            </p>

            <div className="mt-4 flex gap-2">
                {!disposeTargetCar?.isDisposed && (
                <button
                  type="button"
                  onClick={() => {
                    setDisposeAction('sold');
                    setDisposeError('');
                    setDeleteExportConfirmed(false);
                  }}
                  className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${disposeAction === 'sold' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  Mark as sold
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setDisposeAction('delete');
                  setDisposeError('');
                  setDeleteExportConfirmed(false);
                }}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${disposeAction === 'delete' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Delete vehicle
              </button>
            </div>

            {disposeAction === 'sold' && (
              <div className="mt-4 space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500">Sale price (zmk)</label>
                <input
                  type="number"
                  min="0"
                  value={disposeSalePrice}
                  onChange={(e) => setDisposeSalePrice(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 focus:border-indigo-400 focus:outline-none"
                  placeholder="Enter sale price"
                />
              </div>
            )}

            {disposeAction === 'delete' && (
              <label className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                <input
                  type="checkbox"
                  checked={deleteExportConfirmed}
                  onChange={(e) => setDeleteExportConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Ensure that all data has been exported for this asset before deleting it.</span>
              </label>
            )}

            {disposeError && <p className="mt-3 text-[11px] font-medium text-rose-600">{disposeError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDisposeTargetCar(null);
                  setDisposeAction(null);
                  setDisposeSalePrice('');
                  setDisposeError('');
                  setDeleteExportConfirmed(false);
                }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisposeCar}
                disabled={disposeAction === 'delete' && !deleteExportConfirmed}
                className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all ${disposeAction === 'delete' && !deleteExportConfirmed ? 'cursor-not-allowed bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {disposeAction === 'delete' ? 'Delete vehicle' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
