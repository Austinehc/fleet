import React, { useState } from 'react';
import { SlidersHorizontal, Info, Search, AlertTriangle, User, ChevronRight, Gauge, Edit, Camera, Hash, Mail, Smartphone, Wrench, Coins, FileText, Trash2, TrendingUp, Check, Printer, FileDown, Car } from 'lucide-react';
import { CarAsset, Driver, ServiceLog, RevenueLog } from '../../types';

interface FleetDashboardProps {
  cars: CarAsset[];
  setCars: React.Dispatch<React.SetStateAction<CarAsset[]>>;
  drivers: Driver[];
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
  selectedCarId,
  setSelectedCarId,
  onEditCar,
  onEditDriver,
  onManageDrivers,
  setShowCamera,
  setNewCarPhoto
}: FleetDashboardProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Tabs detail indicator
  const [activeDetailTab, setActiveDetailTab] = useState<'service' | 'finance'>('service');
  const [selectedFinancePeriod, setSelectedFinancePeriod] = useState<'all' | '7d' | '30d' | 'this_month' | 'last_month'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Stats Counters
  const totalAssets = cars.length;
  const metrics = {
    available: cars.filter(c => c.status === 'Available').length,
    assigned: cars.filter(c => c.status === 'Assigned').length,
    maintenance: cars.filter(c => c.status === 'Maintenance').length,
    oos: cars.filter(c => c.status === 'Out of Service').length
  };
  const activeDrivers = drivers.filter(d => d.status === 'Active').length;

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

  const selectedCar = cars.find(c => c.id === selectedCarId) || (filteredCars.length > 0 ? filteredCars[0] : null);
  const selectedCarDriver = selectedCar ? drivers.find(d => d.assignedCarId === selectedCar.id) : null;

  // Sync state helpers
  const updateCarStatus = (id: string, status: CarAsset['status']) => {
    setCars(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, status };
      }
      return c;
    }));
  };

  const handleDirectDriverAssign = (carId: string, driverId: string) => {
    setCars(prevCars => prevCars.map(c => {
      if (c.id === carId) {
        return { ...c, status: 'Assigned' as const };
      }
      return c;
    }));

    // Update global driver object
    onEditDriver({
      ...drivers.find(d => d.id === driverId)!,
      assignedCarId: carId,
      status: 'Active'
    });
  };

  const handleDirectDriverUnassign = (carId: string) => {
    const activeDriver = drivers.find(d => d.assignedCarId === carId);
    if (!activeDriver) return;

    if (!window.confirm(`Are you sure you want to release ${activeDriver.fullName} from vehicle?`)) return;

    setCars(prevCars => prevCars.map(c => {
      if (c.id === carId) {
        return { ...c, status: 'Available' as const };
      }
      return c;
    }));

    onEditDriver({
      ...activeDriver,
      assignedCarId: undefined
    });
  };

  // Finance Approval within specific vehicle view
  const handleApproveRevenueLog = (carId: string, logId: string) => {
    setCars(prev => prev.map(car => {
      if (car.id === carId) {
        return {
          ...car,
          revenueLogs: (car.revenueLogs || []).map(log => {
            if (log.id === logId) {
              return { ...log, status: 'Approved' };
            }
            return log;
          })
        };
      }
      return car;
    }));
  };

  const handleDeleteRevenueLog = (carId: string, logId: string) => {
    if (!window.confirm('Do you want to discard this revenue logging record?')) return;
    setCars(prev => prev.map(car => {
      if (car.id === carId) {
        return {
          ...car,
          revenueLogs: (car.revenueLogs || []).filter(log => log.id !== logId)
        };
      }
      return car;
    }));
  };

  // Dynamic Print PDF Generators
  const handlePrintSummary = (car: CarAsset, logs: any[], period: string, total: number) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const summaryRows = logs.map(l => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 8px font-weight: bold;">${l.date}</td>
        <td style="padding: 8px;">${l.category}</td>
        <td style="padding: 8px;">${l.driverName || 'Operator'}</td>
        <td style="padding: 8px; color: #64748b;">${l.description || 'N/A'}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold; color: #10b981;">+zmk ${l.amount.toLocaleString()}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Finance Statement - ${car.make} ${car.model}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica; color: #1e293b; padding: 40px; }
            h1 { font-size: 20px; font-weight: 800; color: #1e1b4b; margin-bottom: 4px; }
            .kpi { display: inline-block; background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 24px; border-radius: 12px; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { text-align: left; padding: 10px; background-color: #f8fafc; font-size: 11px; text-transform: uppercase; color: #64748b; }
          </style>
        </head>
        <body>
          <h1>FLEET CASHINGS REPORT</h1>
          <p style="font-size: 12px; margin-top: 0; color: #64748b;">Vehicle: <strong>${car.make} ${car.model}</strong> (${car.plateNumber}) • Period: ${period.toUpperCase()}</p>
          <div class="kpi">
            <span style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #15803d; block">Total Approved Yield</span>
            <div style="font-size: 20px; font-weight: 900; color: #166534;">zmk ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Operator</th>
                <th>Statement Notes</th>
                <th style="text-align: right;">Yield Amount</th>
              </tr>
            </thead>
            <tbody>${summaryRows}</tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = (car: CarAsset, logs: any[], period: string, total: number) => {
    setIsExportingPDF(true);
    const element = document.createElement('div');
    element.className = "p-10 text-left bg-white font-sans text-gray-800";
    
    const rowsHtml = logs.map(l => `
      <tr class="border-b border-gray-100 text-xs">
        <td class="py-2.5 font-bold font-mono">${l.date}</td>
        <td class="py-2.5">${l.category}</td>
        <td class="py-2.5 font-semibold text-slate-700">${l.driverName || 'Staff Operator'}</td>
        <td class="py-2.5 text-gray-400 font-medium">${l.description || 'N/A'}</td>
        <td class="py-2.5 text-right font-black text-emerald-600">+zmk ${l.amount.toLocaleString()}</td>
      </tr>
    `).join('');

    element.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto;">
        <div style="border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="font-size: 24px; font-weight: 900; color: #1e1b4b; letter-spacing: -0.025em; text-transform: uppercase;">Zambia Logistics Transit Ledger</h1>
          <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Dynamic Revenue Statement & Verification</p>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 12px;">
          <div>
            <p><strong>Vehicle Specs:</strong> ${car.make} ${car.model}</p>
            <p><strong>License Plate:</strong> ${car.plateNumber}</p>
            <p><strong>Registration ID:</strong> VIN-${car.vin.toUpperCase()}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Statement Run:</strong> ${period.toUpperCase()}</p>
          </div>
        </div>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 16px; margin-bottom: 30px;">
          <span style="font-size: 10px; font-weight: bold; color: #15803d; text-transform: uppercase; letter-spacing: 0.05em; display: block;">Aggregated Receipts Balance</span>
          <h2 style="font-size: 28px; font-weight: 900; color: #166534; margin: 4px 0 0 0;">zmk ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #64748b;">
              <th style="text-align: left; padding-bottom: 8px;">Receipt Date</th>
              <th style="text-align: left; padding-bottom: 8px;">Log Type</th>
              <th style="text-align: left; padding-bottom: 8px;">Submitting Operator</th>
              <th style="text-align: left; padding-bottom: 8px;">Statement description</th>
              <th style="text-align: right; padding-bottom: 8px;">Income</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8;">
          Authorized Enterprise Ledger of Fleet Logistics Co. All transactions verified by corporate administration controllers.
        </div>
      </div>
    `;

    document.body.appendChild(element);

    const checkHtml2pdf = setInterval(() => {
      if ((window as any).html2pdf) {
        clearInterval(checkHtml2pdf);
        const options = {
          margin: 0.5,
          filename: `Statement-${car.plateNumber}-${period}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        (window as any).html2pdf().set(options).from(element).save().then(() => {
          document.body.removeChild(element);
          setIsExportingPDF(false);
        });
      }
    }, 100);
  };

  return (
    <div id="fleet-registry-screen-con">
      {/* Hero Stats Board */}
      <section className="bg-white border-b border-gray-200/50 py-5" id="stats-dashboard">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" id="stats-summary-grid">
            
            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3 text-left" id="stat-card-total-assets">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Total Cars</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-gray-900">{totalAssets}</span>
                  <span className="text-[10px] text-gray-500">registered</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3 text-left" id="stat-card-available">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <span className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">✓</span>
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Available</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-gray-900">{metrics.available}</span>
                  <span className="text-[10px] text-gray-500">ready</span>
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
                  <span className="text-[10px] text-gray-500 font-semibold text-slate-505">assigned</span>
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
                  <span className="text-[10px] text-gray-500">staff keys</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Main Grid Content Area split layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6" id="dashboard-body">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="app-split-container">
          
          {/* LEFT SECTION: Search Engine & Vehicle Asset List - Grid Column span 7 */}
          <section className="lg:col-span-7 flex flex-col gap-5 text-left" id="fleet-list-section">
            
            {/* Filter and Search Box Control panel */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200/70 shadow-sm space-y-4" id="fleet-filter-card">
              
              {/* Search Bar plate or name as specified */}
              <div className="relative" id="search-input-wrapper text-left">
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

            {/* Status Badge Legend Grid */}
            <div className="bg-white border border-gray-200/70 rounded-2xl p-4 shadow-sm" id="status-legend-panel">
              <div className="flex items-center gap-1.5 mb-2.5" id="legend-header-sec">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-550 flex items-center gap-1">⚠️ Fleet Status Legend</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left" id="legend-grid-inner">
                <div className="flex items-start gap-2 p-1 rounded-lg transition-colors text-left" id="legend-item-available">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-tight">Available</p>
                    <p className="text-[10px] text-gray-450 mt-0.5 leading-snug font-sans">Ready for direct staff dispatch.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-1 rounded-lg transition-colors text-left" id="legend-item-assigned">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-tight">Assigned</p>
                    <p className="text-[10px] text-gray-450 mt-0.5 leading-snug font-sans">Active staff operating.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-1 rounded-lg transition-colors text-left" id="legend-item-maintenance">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-tight">Maintenance</p>
                    <p className="text-[10px] text-gray-450 mt-0.5 leading-snug font-sans">In diagnostics check.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-1 rounded-lg transition-colors text-left" id="legend-item-oos">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-tight">Out of Service</p>
                    <p className="text-[10px] text-gray-450 mt-0.5 leading-snug font-sans">OOS decommissioned.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Results Grid List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="vehicles-grid">
              {filteredCars.length > 0 ? (
                filteredCars.map((car) => {
                  const driverAssigned = drivers.find(d => d.assignedCarId === car.id);
                  const isSelected = selectedCarId === car.id;
                  
                  return (
                    <div
                      key={car.id}
                      onClick={() => setSelectedCarId(car.id)}
                      className={`group cursor-pointer bg-white rounded-2xl border transition-all overflow-hidden relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-50 shadow-md animate-fade-in'
                          : 'border-gray-200/75 hover:border-gray-350 hover:shadow-2xs'
                      }`}
                      id={`car-card-${car.id}`}
                    >
                      {/* Elegant Text Header instead of Cover Photo */}
                      <div className="bg-slate-50 border-b border-gray-150 p-3.5 flex items-center justify-between" id={`card-img-wrap-${car.id}`}>
                        <div className="flex items-center gap-2">
                          <span className="bg-white border border-gray-250 text-gray-805 font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow-3xs uppercase" id={`plate-lbl-${car.id}`}>
                            {car.plateNumber}
                          </span>
                          <span className={`text-[9px] font-extrabold tracking-wide px-2 py-0.5 rounded-full uppercase shadow-3xs ${
                            car.status === 'Available' ? 'bg-emerald-500 text-white' :
                            car.status === 'Assigned' ? 'bg-indigo-600 text-white' :
                            car.status === 'Maintenance' ? 'bg-amber-500 text-white' :
                            'bg-rose-500 text-white'
                          }`} id={`status-tag-${car.id}`}>
                            {car.status}
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditCar(car);
                          }}
                          className="bg-white hover:bg-slate-100 border border-gray-200 hover:border-indigo-300 text-gray-700 hover:text-indigo-600 p-1.5 rounded-lg shadow-3xs transition-all flex items-center justify-center cursor-pointer"
                          title="Edit Vehicle details"
                          id={`btn-edit-car-card-${car.id}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Card Content Box */}
                      <div className="p-4 flex-1 flex flex-col justify-between text-left" id={`card-body-${car.id}`}>
                        <div>
                          <div className="flex items-center justify-between" id={`card-title-row-${car.id}`}>
                            <h3 className="font-extrabold text-gray-950 group-hover:text-indigo-600 transition-colors text-sm truncate uppercase tracking-tight">
                              {car.make} {car.model}
                            </h3>
                            <span className="text-xs font-mono text-gray-400 font-bold">{car.year}</span>
                          </div>
                          <p className="text-[11px] text-gray-505 mt-1 flex items-center gap-1 bg-slate-50 py-1 px-1.5 rounded" id={`card-details-row-${car.id}`}>
                            <Gauge className="w-3.5 h-3.5 text-gray-400" />
                            <span className="font-mono font-bold">{car.mileage.toLocaleString()} km</span>
                            <span className="text-gray-300">|</span>
                            <span className="font-mono text-gray-450 text-[10px] truncate max-w-[120px]">VIN: {car.vin.substring(0, 10)}...</span>
                          </p>
                        </div>

                        {/* Driver assignment footer */}
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between" id={`card-driver-sec-${car.id}`}>
                          <div className="flex items-center gap-2 text-left" id={`driver-meta-${car.id}`}>
                            <div className={`p-1.5 rounded-lg ${driverAssigned ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div className="text-left">
                              <p className="text-[9px] uppercase tracking-wide font-bold text-gray-400">Driver Assignment</p>
                              <p className="text-xs font-extrabold text-gray-800 line-clamp-1">
                                {driverAssigned ? driverAssigned.fullName : 'No Driver Assigned'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-gray-300 hover:text-indigo-600 self-end" id={`arrow-ind-${car.id}`}>
                            <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'translate-x-0.5 text-indigo-500' : ''}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-12 text-center" id="empty-results-box">
                  <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-gray-400 mb-3">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-gray-850 text-sm">No Vehicles Found</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">None of the fleet vehicles matched your plate query or driver status selections.</p>
                  <button
                    onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
                    className="mt-3.5 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-120 text-indigo-700 font-bold rounded-lg text-xs transition-colors cursor-pointer font-sans"
                    id="btn-reset-filters"
                  >
                    Clear Filter Selections
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT SECTION: Deep Inspector / Car Details & Sub-Timeline - Grid Column span 5 */}
          <section className="lg:col-span-5" id="fleet-details-container">
            {selectedCar ? (
              <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm sticky top-24 text-left animate-fade-in" id="vehicle-details-card">
                
                {/* Visual Cover Header replaced with slate text header */}
                <div className="bg-slate-900 p-5 relative border-b border-slate-800" id="detail-img-pane">
                  <div className="flex items-center justify-between gap-4" id="detail-header-inner">
                    <div className="text-left">
                      <p className="text-[10px] text-indigo-400 font-mono font-bold tracking-wider uppercase">Active Fleet Asset</p>
                      <h2 className="text-white text-base font-black tracking-tight mt-1 uppercase">
                        {selectedCar.make} {selectedCar.model}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 mt-2" id="detail-indicators-row">
                        <span className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 bg-slate-800 text-slate-100 border border-slate-705 rounded text-center uppercase tracking-wide">
                          {selectedCar.plateNumber}
                        </span>
                        <span className="text-[10px] text-slate-300 font-bold">
                          • {selectedCar.year}
                        </span>
                        <span className="text-[10px] text-slate-300 font-bold">
                          • {selectedCar.color}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setNewCarPhoto(''); 
                        setShowCamera(true);
                      }}
                      className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white px-3 py-1.5 text-[10px] font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-3xs transition-all font-sans shrink-0 self-start"
                      id="btn-update-photo"
                    >
                      <Camera className="w-3.5 h-3.5 text-indigo-400" />
                      Attach Photo
                    </button>
                  </div>
                </div>

                {/* Sub Panel details */}
                <div className="p-5 space-y-6" id="detail-card-panel">
                  {/* Row 1: Vehicle Specs */}
                  <div className="grid grid-cols-2 gap-3.5" id="spec-fields">
                    <div className="p-3 bg-gray-50/75 border border-gray-100 rounded-xl" id="field-vin">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Hash className="w-3 h-3 text-indigo-505" /> VIN Number
                      </p>
                      <p className="text-xs font-mono font-extrabold text-gray-800 mt-1 break-all select-all">{selectedCar.vin}</p>
                    </div>

                    <div className="p-3 bg-gray-50/75 border border-gray-100 rounded-xl" id="field-odometer">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-emerald-505" /> Mileage (km)
                      </p>
                      <p className="text-xs font-mono font-extrabold text-gray-800 mt-1">{selectedCar.mileage.toLocaleString()} km</p>
                    </div>
                  </div>

                  {/* Status switches */}
                  <div className="space-y-2 border-t border-gray-100 pt-4 text-left" id="fleet-operational-controls">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      Operational Status
                    </label>
                    <div className="grid grid-cols-4 gap-1.5" id="car-detail-status-strip">
                      {(['Available', 'Assigned', 'Maintenance', 'Out of Service'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => {
                            if (st === 'Assigned' && !selectedCarDriver) {
                              alert('Please assign a Driver from the selection below before updating operational status to Assigned.');
                              return;
                            }
                            updateCarStatus(selectedCar.id, st);
                          }}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            selectedCar.status === st
                              ? st === 'Available' ? 'bg-emerald-600 text-white shadow-3xs' :
                                st === 'Assigned' ? 'bg-indigo-600 text-white shadow-3xs' :
                                st === 'Maintenance' ? 'bg-amber-500 text-white shadow-3xs' :
                                'bg-rose-600 text-white shadow-3xs'
                              : 'bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 border border-transparent'
                          }`}
                          id={`detail-status-btn-${st.replace(/\s+/g, '-').toLowerCase()}`}
                        >
                          {st === 'Out of Service' ? 'OOS' : st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Driver Assignment details */}
                  <div className="border-t border-gray-100 pt-4 space-y-3 text-left" id="assigned-driver-section">
                    <div className="flex items-center justify-between" id="driver-hdr-sec">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Staff Operator Assignment
                      </label>
                      <div className="flex items-center gap-2">
                        {selectedCarDriver && (
                          <>
                            <button
                              onClick={() => onEditDriver(selectedCarDriver)}
                              className="text-[10px] text-indigo-650 hover:text-indigo-805 font-bold cursor-pointer py-0.5 px-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1"
                              id="btn-edit-driver-trigger"
                            >
                              Edit Profile
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleDirectDriverUnassign(selectedCar.id)}
                              className="text-[10px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer font-sans"
                              id="btn-unassign-driver"
                            >
                              Release Operator
                            </button>
                          </>
                        )}
                        <span className="text-gray-300">{selectedCarDriver ? '|' : ''}</span>
                        <button
                          onClick={onManageDrivers}
                          className="text-[10px] text-gray-500 hover:text-indigo-650 font-bold cursor-pointer font-sans"
                        >
                          Manage All Profiles
                        </button>
                      </div>
                    </div>

                    {selectedCarDriver ? (
                      <div className="p-3.5 bg-indigo-50/40 border border-indigo-100/60 rounded-xl flex items-start gap-3 justify-between" id="active-driver-badge">
                        <div className="flex items-start gap-2.5">
                          {selectedCarDriver.profilePicture ? (
                            <img src={selectedCarDriver.profilePicture} alt={selectedCarDriver.fullName} className="w-9 h-9 rounded-full object-cover shrink-0 border border-indigo-200 mt-0.5" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs mt-0.5 shrink-0">
                              {selectedCarDriver.fullName.split(' ').map(n=>n[0]).join('')}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-bold text-gray-950 font-sans">{selectedCarDriver.fullName}</p>
                            <div className="flex flex-col gap-0.5 mt-1 text-[10px] text-indigo-650 font-mono font-bold" id="driver-ids-detail">
                              <span className="flex items-center gap-1"><span className="text-gray-400 font-sans">Licence:</span> {selectedCarDriver.licenseNumber}</span>
                              <span className="flex items-center gap-1"><span className="text-gray-400 font-sans">NRC No:</span> {selectedCarDriver.nrcNumber || 'N/A'}</span>
                              <span className="flex items-center gap-1"><span className="text-gray-400 font-sans">Access Code:</span> <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase px-1.5 rounded text-[9px] font-mono tracking-wider">{selectedCarDriver.accessCode || 'N/A'}</span></span>
                            </div>
                            
                            <div className="flex flex-col gap-0.5 mt-1.5 text-[10px] text-gray-550" id="driver-contacts-detail">
                              <span>✉ {selectedCarDriver.email || 'No email registered'}</span>
                              <span>📞 {selectedCarDriver.phone || 'No phone registered'}</span>
                            </div>
                          </div>
                        </div>

                        <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase shrink-0">
                          {selectedCarDriver.status}
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50/70 border border-dashed border-gray-200 rounded-xl space-y-2 text-center" id="no-driver-badge">
                        <p className="text-xs text-gray-405 italic">No driver is currently scheduled. Map driver profile:</p>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleDirectDriverAssign(selectedCar.id, e.target.value);
                              e.target.value = ''; 
                            }
                          }}
                          className="mx-auto block text-xs bg-white border border-gray-200 px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-xs text-gray-750 font-bold"
                          id="select-driver-assignment"
                          defaultValue=""
                        >
                          <option value="" disabled>-- Choose Driver --</option>
                          {drivers
                            .filter(d => !d.assignedCarId)
                            .map(drv => (
                              <option key={drv.id} value={drv.id}>
                                {drv.fullName} ({drv.status})
                              </option>
                            ))}
                        </select>
                        {drivers.filter(d => !d.assignedCarId).length === 0 && (
                          <p className="text-[10px] text-amber-600 font-semibold" id="no-unassigned-staff-warn">
                            * All registered operator keys are currently assigned to vehicles.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tab Selector for Service vs Finance */}
                  <div className="border-t border-gray-100 pt-4" id="utility-tabs-segment">
                    <div className="flex border border-gray-205 p-1 bg-gray-50/70 rounded-xl gap-2 mb-4" id="tab-btns-con">
                      <button
                        type="button"
                        onClick={() => setActiveDetailTab('service')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          activeDetailTab === 'service'
                            ? 'bg-white text-indigo-700 shadow-3xs border border-gray-150'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                        id="tab-btn-service"
                      >
                        <Wrench className="w-3.5 h-3.5 text-indigo-500" />
                        Service logs ({selectedCar.serviceLogs.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDetailTab('finance')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          activeDetailTab === 'finance'
                            ? 'bg-white text-indigo-700 shadow-3xs border border-gray-150'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                        id="tab-btn-finance"
                      >
                        <Coins className="w-3.5 h-3.5 text-indigo-650" />
                        Cashings tracker ({(selectedCar.revenueLogs || []).filter(r => r.status !== 'Pending').length})
                      </button>
                    </div>

                    {/* Tab: Service logs */}
                    {activeDetailTab === 'service' && (
                      <div className="space-y-4 text-left" id="service-tab-panel">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-1 text-left">
                          Active Service history
                        </label>

                        <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1" id="service-timeline">
                          {selectedCar.serviceLogs.length > 0 ? (
                            selectedCar.serviceLogs.map((log) => (
                              <div
                                key={log.id}
                                className="relative pl-5 border-l-2 border-indigo-200 text-xs text-left group animate-fade-in p-3 rounded-xl transition-all bg-white border border-slate-100 shadow-4xs"
                                id={`log-item-${log.id}`}
                              >
                                <div className="absolute -left-1.5 top-4.5 w-3 h-3 bg-indigo-100 text-indigo-600 rounded-full border border-white flex items-center justify-center" id={`log-bullet-${log.id}`}>
                                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                                </div>
                                
                                <div className="flex items-center justify-between font-bold text-gray-800">
                                  <span>{log.category}</span>
                                  <span className="text-[9px] text-gray-450 font-mono italic">{log.date}</span>
                                </div>

                                <p className="text-gray-550 mt-1 leading-relaxed bg-gray-50/50 p-2 rounded-lg border border-gray-100/50 text-[11px]">
                                  {log.description}
                                </p>

                                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-gray-400 font-bold">
                                  <span className="flex items-center gap-0.5 bg-gray-100 py-0.5 px-2 rounded-full text-gray-650 leading-none">
                                    Cost: zmk {log.cost}
                                  </span>
                                  <span className="flex items-center gap-0.5 bg-gray-100 py-0.5 px-2 rounded-full text-gray-650 leading-none">
                                    <Gauge className="w-3 h-3" /> {log.mileage.toLocaleString()} km
                                  </span>
                                  {log.performedBy && (
                                    <span className="flex items-center gap-0.5 bg-indigo-50 text-indigo-700 py-0.5 px-2 rounded-full leading-none border border-indigo-100">
                                      👤 Driver: {log.performedBy}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-8 text-center border border-dashed border-gray-150 rounded-2xl bg-slate-50/20" id="empty-logs-slate">
                              <FileText className="w-6 h-6 text-gray-300 mx-auto animate-pulse" />
                              <p className="text-xs text-gray-400 italic mt-1.5">No logged service work recorded.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab: Capital analysis */}
                    {activeDetailTab === 'finance' && (() => {
                      const revenuesList = selectedCar.revenueLogs || [];
                      const filteredRevs = revenuesList.filter(r => {
                        const logDate = new Date(r.date);
                        if (isNaN(logDate.getTime())) return true;
                        
                        if (selectedFinancePeriod === '7d') {
                          const limit = new Date();
                          limit.setDate(limit.getDate() - 7);
                          return logDate >= limit;
                        }
                        if (selectedFinancePeriod === '30d') {
                          const limit = new Date();
                          limit.setDate(limit.getDate() - 30);
                          return logDate >= limit;
                        }
                        if (selectedFinancePeriod === 'this_month') {
                          const now = new Date();
                          return logDate.getFullYear() === now.getFullYear() && logDate.getMonth() === now.getMonth();
                        }
                        if (selectedFinancePeriod === 'last_month') {
                          const now = new Date();
                          let prevM = now.getMonth() - 1;
                          let prevY = now.getFullYear();
                          if (prevM < 0) {
                            prevM = 11;
                            prevY--;
                          }
                          return logDate.getFullYear() === prevY && logDate.getMonth() === prevM;
                        }
                        return true; 
                      });

                      const approvedRevs = filteredRevs.filter(r => r.status !== 'Pending');
                      const totalCashing = approvedRevs.reduce((sum, item) => sum + item.amount, 0);

                      return (
                        <div className="space-y-4 text-left" id="finance-tab-panel">
                          
                          {/* Period Filters */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 border border-gray-150 p-3 rounded-2xl text-left" id="finance-filter-header">
                            <div className="space-y-1.5 flex-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Cashing Analysis Period</span>
                              <div className="flex flex-wrap gap-1" id="finance-period-capsules">
                                {[
                                  { id: 'all', label: 'All-Time' },
                                  { id: '7d', label: '7 Days' },
                                  { id: '30d', label: '30 Days' },
                                  { id: 'this_month', label: 'This Month' },
                                  { id: 'last_month', label: 'Last Month' }
                                ].map(period => (
                                  <button
                                    key={period.id}
                                    type="button"
                                    onClick={() => setSelectedFinancePeriod(period.id as any)}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                                      selectedFinancePeriod === period.id
                                        ? 'bg-indigo-650 text-white shadow-3xs border border-indigo-650'
                                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-gray-200'
                                    }`}
                                    id={`btn-period-${period.id}`}
                                  >
                                    {period.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-left self-start sm:self-auto">
                              <button
                                type="button"
                                onClick={() => handlePrintSummary(selectedCar, approvedRevs, selectedFinancePeriod, totalCashing)}
                                className="text-[10px] bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 p-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-3xs"
                                id="btn-print-finance-summary"
                              >
                                <Printer className="w-3 h-3" /> Print
                              </button>
                              
                              <button
                                type="button"
                                disabled={isExportingPDF}
                                onClick={() => handleDownloadPDF(selectedCar, approvedRevs, selectedFinancePeriod, totalCashing)}
                                className="text-[10px] text-white font-bold p-2 bg-indigo-650 hover:bg-indigo-700 rounded-xl transition-all shadow-3xs flex items-center gap-1 cursor-pointer"
                                id="btn-download-finance-pdf"
                              >
                                <FileDown className="w-3 h-3" />
                                {isExportingPDF ? 'Wait...' : 'PDF'}
                              </button>
                            </div>
                          </div>

                          {/* Stat Metrics */}
                          <div className="grid grid-cols-2 gap-3" id="finance-stats-summary">
                            <div className="bg-emerald-50/45 p-3 rounded-xl border border-emerald-100 flex items-center justify-between text-left">
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800">Total Approved</span>
                                <p className="text-base font-black text-emerald-700 font-mono mt-0.5">
                                  zmk {totalCashing.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>

                            <div className="bg-indigo-50/45 p-3 rounded-xl border border-indigo-100 flex items-center justify-between text-left">
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-800">Audited Logs</span>
                                <p className="text-base font-black text-indigo-700 font-mono mt-0.5">
                                  {approvedRevs.length} events
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Record interactive actions */}
                          <div className="flex items-center justify-between pb-1 border-b border-gray-150" id="cashings-header-bar">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block text-left">Cashings Ledger</span>
                          </div>

                          {/* Ledger details list */}
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1" id="revenue-logs-list">
                            {filteredRevs.length > 0 ? (
                              filteredRevs.map((rev) => {
                                const isExpanded = expandedLogId === rev.id;
                                return (
                                  <div
                                    key={rev.id}
                                    onClick={(e) => {
                                      if ((e.target as HTMLElement).closest('button')) return;
                                      setExpandedLogId(isExpanded ? null : rev.id);
                                    }}
                                    className={`p-3 bg-white rounded-xl border flex flex-col gap-2 text-xs text-left group transition-all cursor-pointer ${
                                      isExpanded ? 'bg-emerald-50/20 border-emerald-205' : 'border-gray-150'
                                    }`}
                                    id={`rev-item-${rev.id}`}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex items-start gap-2 max-w-[70%]">
                                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${
                                          rev.category === 'Rental' ? 'bg-indigo-650' :
                                          rev.category === 'Fare' ? 'bg-emerald-500' :
                                          'bg-amber-500'
                                        }`} />
                                        <div>
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-bold text-gray-900">{rev.category}</span>
                                            <span className="text-[9px] text-gray-450 font-mono font-bold bg-gray-100 px-1 py-0.2 rounded">{rev.date}</span>
                                            {rev.status === 'Pending' ? (
                                              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded">
                                                Pending
                                              </span>
                                            ) : (
                                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 rounded animate-fade-in">
                                                Approved
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{rev.description}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 font-mono shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 py-0.5 px-1.5 rounded">
                                          +zmk {rev.amount.toLocaleString()}
                                        </span>
                                        {rev.status === 'Pending' && (
                                          <button
                                            type="button"
                                            onClick={() => handleApproveRevenueLog(selectedCar.id, rev.id)}
                                            className="bg-emerald-600 hover:bg-emerald-750 text-white font-bold py-1 px-2.5 rounded-md text-[9px] transition-colors cursor-pointer font-sans"
                                            id={`btn-approve-rev-${rev.id}`}
                                          >
                                            Approve
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteRevenueLog(selectedCar.id, rev.id)}
                                          className="text-gray-300 hover:text-red-500 p-1 rounded transition-colors cursor-pointer"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="py-6 text-center border border-dashed border-gray-150 rounded-2xl bg-gray-50/25" id="empty-revenue-slate">
                                <Coins className="w-6 h-6 text-gray-300 mx-auto" />
                                <p className="text-xs text-gray-400 italic mt-1.5">No logged cash receipts.</p>
                              </div>
                            )}
                          </div>

                        </div>
                      );
                    })()}

                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 p-12 rounded-2xl text-center shadow-3xs" id="empty-inspector-slate">
                <Car className="w-10 h-10 text-gray-300 mx-auto animate-bounce mb-3" />
                <h4 className="font-bold text-gray-805">Vehicle Information Panel</h4>
                <p className="text-xs text-gray-450 mt-1 max-w-sm mx-auto">Please select a transit vehicle card from the registry to view logs, ledgers, and assignments.</p>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}
