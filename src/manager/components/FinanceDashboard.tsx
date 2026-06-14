import React, { useState } from 'react';
import { Coins, Check, CheckCircle2, Clock, Car, Search, FileText, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CarAsset } from '../../types';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface FinanceDashboardProps {
  cars: CarAsset[];
  setCars: React.Dispatch<React.SetStateAction<CarAsset[]>>;
}

export default function FinanceDashboard({
  cars,
  setCars
}: FinanceDashboardProps) {
  // Encapsulated filter state
  const [financeTimeframe, setFinanceTimeframe] = useState<'all' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [financeAsset, setFinanceAsset] = useState<string>('all');
  const [financeCategory, setFinanceCategory] = useState<string>('all');
  const [financeStatus, setFinanceStatus] = useState<string>('all');
  const [financeSearch, setFinanceSearch] = useState<string>('');
  const [mobileSubTab, setMobileSubTab] = useState<'analytics' | 'ledger'>('ledger');
  const [plAssetFilter, setPlAssetFilter] = useState<string>('all');
  const [chartViewMode, setChartViewMode] = useState<'timeline' | 'asset'>('timeline');
  
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // States to make the Monthly Performance table collapsible and support custom fiscal years
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(new Date().getFullYear());
  const [isMonthlyTableExpanded, setIsMonthlyTableExpanded] = useState<boolean>(true);

  // Dynamically calculate which years have recorded entries to allow vintage switching
  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    cars.forEach(car => {
      (car.revenueLogs || []).forEach(r => {
        if (r.date) {
          const y = new Date(r.date).getFullYear();
          if (!isNaN(y)) years.add(y);
        }
      });
      (car.serviceLogs || []).forEach(e => {
        if (e.date) {
          const y = new Date(e.date).getFullYear();
          if (!isNaN(y)) years.add(y);
        }
      });
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [cars]);

  // Flatten all revenue logs across cars for the unified ledger
  const allRevenueLogs = cars.flatMap(car => 
    (car.revenueLogs || []).map(log => ({
      ...log,
      carId: car.id,
      carMake: car.make,
      carModel: car.model,
      carPlate: car.plateNumber,
    }))
  );

  // Filter logs dynamically
  const filteredRevenues = allRevenueLogs.filter(r => {
    // 1. Search filter
    if (financeSearch) {
      const q = financeSearch.toLowerCase();
      const descMatch = (r.description || '').toLowerCase().includes(q);
      const nameMatch = (r.driverName || '').toLowerCase().includes(q);
      const makerMatch = `${r.carMake} ${r.carModel} ${r.carPlate}`.toLowerCase().includes(q);
      const categoryMatch = (r.category || '').toLowerCase().includes(q);
      if (!descMatch && !nameMatch && !makerMatch && !categoryMatch) return false;
    }

    // 2. Specific Asset Filter
    if (financeAsset !== 'all' && r.carId !== financeAsset) return false;

    // 3. Category Filter
    if (financeCategory !== 'all' && r.category !== financeCategory) return false;

    // 4. Status Filter
    if (financeStatus !== 'all' && r.status !== financeStatus) return false;

    // 5. Date Timeframe Filter
    const logDate = new Date(r.date);
    if (!isNaN(logDate.getTime())) {
      if (financeTimeframe === '7d') {
        const limit = new Date();
        limit.setDate(limit.getDate() - 7);
        if (logDate < limit) return false;
      } else if (financeTimeframe === '30d') {
        const limit = new Date();
        limit.setDate(limit.getDate() - 30);
        if (logDate < limit) return false;
      } else if (financeTimeframe === 'this_month') {
        const now = new Date();
        const isCurrentMonth = logDate.getFullYear() === now.getFullYear() && logDate.getMonth() === now.getMonth();
        if (!isCurrentMonth) return false;
      } else if (financeTimeframe === 'last_month') {
        const now = new Date();
        let prevM = now.getMonth() - 1;
        let prevY = now.getFullYear();
        if (prevM < 0) {
          prevM = 11;
          prevY--;
        }
        const isLastMonth = logDate.getFullYear() === prevY && logDate.getMonth() === prevM;
        if (!isLastMonth) return false;
      } else if (financeTimeframe === 'custom') {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const currentLogDate = new Date(r.date);
          currentLogDate.setHours(0, 0, 0, 0);
          if (currentLogDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          const currentLogDate = new Date(r.date);
          currentLogDate.setHours(0, 0, 0, 0);
          if (currentLogDate > end) return false;
        }
      }
    }
    return true;
  });

  // Calculate historical net profit progression chart data
  const timelineChartData = React.useMemo(() => {
    const allRevenues = cars.flatMap(c => c.revenueLogs || []);
    const allExpenses = cars.flatMap(c => c.serviceLogs || []);
    
    const dateMap: { [date: string]: { Revenue: number; Expenditure: number } } = {};
    
    allRevenues.forEach(r => {
      const d = r.date || new Date().toISOString().split('T')[0] || '';
      if (!dateMap[d]) dateMap[d] = { Revenue: 0, Expenditure: 0 };
      const entry = dateMap[d];
      if (entry) {
        entry.Revenue += r.amount;
      }
    });
    
    allExpenses.forEach(e => {
      const d = e.date || new Date().toISOString().split('T')[0] || '';
      if (!dateMap[d]) dateMap[d] = { Revenue: 0, Expenditure: 0 };
      const entry = dateMap[d];
      if (entry) {
        entry.Expenditure += e.cost;
      }
    });
    
    const sortedDates = Object.keys(dateMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    let cumulativeNetProfit = 0;
    return sortedDates.map(d => {
      const entry = dateMap[d];
      if (!entry) return { date: d, Revenue: 0, Expenditure: 0, NetProfit: 0, CumulativeProfit: cumulativeNetProfit };
      
      const rev = entry.Revenue;
      const exp = entry.Expenditure;
      const net = rev - exp;
      cumulativeNetProfit += net;
      return {
        date: d,
        formattedDate: new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Revenue: rev,
        Expenditure: exp,
        'Net Profit': net,
        'Net Profit Trend': cumulativeNetProfit
      };
    });
  }, [cars]);

  // Calculate monthly performance breakdown for the selected fiscal year (Jan - Dec)
  const monthlyPerformanceData = React.useMemo(() => {
    const months = [
      { name: 'January', revenue: 0, maintenance: 0 },
      { name: 'February', revenue: 0, maintenance: 0 },
      { name: 'March', revenue: 0, maintenance: 0 },
      { name: 'April', revenue: 0, maintenance: 0 },
      { name: 'May', revenue: 0, maintenance: 0 },
      { name: 'June', revenue: 0, maintenance: 0 },
      { name: 'July', revenue: 0, maintenance: 0 },
      { name: 'August', revenue: 0, maintenance: 0 },
      { name: 'September', revenue: 0, maintenance: 0 },
      { name: 'October', revenue: 0, maintenance: 0 },
      { name: 'November', revenue: 0, maintenance: 0 },
      { name: 'December', revenue: 0, maintenance: 0 },
    ];

    cars.forEach(car => {
      (car.revenueLogs || []).forEach(r => {
        if (!r.date) return;
        const logDate = new Date(r.date);
        if (logDate.getFullYear() === selectedFiscalYear) {
          const m = logDate.getMonth();
          if (m >= 0 && m < 12) {
            const month = months[m];
            if (month) {
              month.revenue += r.amount;
            }
          }
        }
      });

      (car.serviceLogs || []).forEach(e => {
        if (!e.date) return;
        const logDate = new Date(e.date);
        if (logDate.getFullYear() === selectedFiscalYear) {
          const m = logDate.getMonth();
          if (m >= 0 && m < 12) {
            const month = months[m];
            if (month) {
              month.maintenance += e.cost;
            }
          }
        }
      });
    });

    return months;
  }, [cars, selectedFiscalYear]);

  // Calculate high-level financial parameters (unfiltered for KPI stats cards)
  const totalCollectedAll = allRevenueLogs.reduce((sum, r) => sum + r.amount, 0);
  const approvedCollectedAll = allRevenueLogs.filter(r => r.status === 'Approved').reduce((sum, r) => sum + r.amount, 0);
  const pendingCollectedAll = allRevenueLogs.filter(r => r.status === 'Pending').reduce((sum, r) => sum + r.amount, 0);
  const uniqueVehiclesCountAll = new Set(allRevenueLogs.map(r => r.carPlate)).size;

  // Calculate high-level financial parameters (filtered metrics for target elements)
  const pendingReviewCount = filteredRevenues.filter(r => r.status === 'Pending').length;
  const totalPendingCount = allRevenueLogs.filter(r => r.status === 'Pending').length;

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    const element = document.getElementById('finance-report-pdf-content');
    if (!element) {
      alert('Error: Printable template not found in DOM.');
      setIsExportingPDF(false);
      return;
    }

    // Capture original getComputedStyle to bypass html2canvas oklch parsing exception
    const originalGetComputedStyle = window.getComputedStyle;
    
    // Override with a robust Proxy wrapper that cleans oklch on-the-fly when requested by html2canvas
    window.getComputedStyle = function (elt, pseudoElt) {
      const style = originalGetComputedStyle(elt, pseudoElt);
      return new Proxy(style, {
        get(target, prop, receiver) {
          if (prop === 'getPropertyValue') {
            return function (propertyName: string) {
              const val = target.getPropertyValue(propertyName);
              if (typeof val === 'string' && val.includes('oklch')) {
                return val.replace(/oklch\([^)]*\)/g, 'rgb(79, 70, 229)'); // Safe, elegant indigo as fallback
              }
              return val;
            };
          }
          const value = Reflect.get(target, prop, receiver);
          if (typeof value === 'string' && value.includes('oklch')) {
            return value.replace(/oklch\([^)]*\)/g, 'rgb(79, 70, 229)');
          }
          return value;
        }
      });
    };

    const opt = {
      margin:       [0.4, 0.4, 0.4, 0.4] as [number, number, number, number],
      filename:     `Fleet_Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as const }
    };

    try {
      // @ts-ignore
      const pdfExporter = html2pdf.default || html2pdf;
      
      pdfExporter()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          setIsExportingPDF(false);
          window.getComputedStyle = originalGetComputedStyle;
        })
        .catch((err: any) => {
          console.error('PDF Generation Error:', err);
          setIsExportingPDF(false);
          window.getComputedStyle = originalGetComputedStyle;
          alert('Failed to generate PDF. Returning styles to original state.');
        });
    } catch (e) {
      console.error('PDF init error:', e);
      setIsExportingPDF(false);
      window.getComputedStyle = originalGetComputedStyle;
    }
  };

  // Gather all expenditures across all cars based on maintenance logs
  const allServiceLogs = cars.flatMap(car =>
    (car.serviceLogs || []).map(log => ({
      ...log,
      carId: car.id,
      carMake: car.make,
      carModel: car.model,
      carPlate: car.plateNumber,
    }))
  );
  const totalExpenditure = allServiceLogs.reduce((sum, log) => sum + log.cost, 0);

  // Chart data: Fleet Revenue vs Expenditure per Asset
  const fleetBenefitChart = cars.map(car => {
    const carRevenue = (car.revenueLogs || []).reduce((sum, r) => sum + r.amount, 0);
    const carExpenditure = (car.serviceLogs || []).reduce((sum, log) => sum + log.cost, 0);
    const netProfit = carRevenue - carExpenditure;
    return {
      name: `${car.make} ${car.model}`,
      fullName: `${car.make} ${car.model} (${car.plateNumber})`,
      Revenue: carRevenue,
      Expenditure: carExpenditure,
      'Net Profit': netProfit
    };
  });

  // Approve single pending item
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

  // Reject / Delete single item
  const handleDeleteRevenueLog = (carId: string, logId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete or reject this transaction log?')) return;
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

  // Bulk Approve pending matched items
  const approveAllPending = () => {
    if (pendingReviewCount === 0) return;
    if (!window.confirm(`Are you sure you want to bulk approve all ${pendingReviewCount} pending collection cash receipts matching your current filters?`)) return;
    setCars(prev => prev.map(car => ({
      ...car,
      revenueLogs: (car.revenueLogs || []).map(log => {
        const matched = filteredRevenues.some(fr => fr.id === log.id);
        if (matched && log.status === 'Pending') {
          return { ...log, status: 'Approved' };
        }
        return log;
      })
    })));
  };

  return (
    <div className="flex-1 bg-slate-50/50 py-6" id="finance-dashboard-wrapper">
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-6">
        
        {/* Dashboard Head */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" id="finance-dashboard-hero text-left">
          <div className="text-left">
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <Coins className="text-indigo-600 w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
              Financial Dynamics & Analytics
            </h2>
            <p className="text-xs text-gray-400 font-medium">Monitor active cashing logs, revenue streams, and verify driver submissions across the enterprise.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2" id="finance-header-actions">
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 font-sans disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700"
              id="btn-export-finance-report"
            >
              {isExportingPDF ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
              ) : (
                <FileText className="w-4 h-4 shrink-0" />
              )}
              {isExportingPDF ? 'Generating PDF...' : 'Export Report'}
            </button>
            {pendingReviewCount > 0 && (
              <button
                onClick={approveAllPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 font-sans"
                id="btn-bulk-approve-revenues"
              >
                <Check className="w-4 h-4 shrink-0" />
                Approve All Pending ({pendingReviewCount})
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 animate-fade-in" id="finance-kpis-grid">
          
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs text-left" id="kpi-total-collected">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block font-sans">Gross Sum Revenue</span>
            <span className="text-xl font-extrabold font-mono text-gray-900 block mt-1">zmk {totalCollectedAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500 font-sans">
              <span className="font-bold underline">{allRevenueLogs.length}</span> transactions logged
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs text-left animate-delay" id="kpi-approved">
            <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block font-sans">Verified & Approved</span>
            <span className="text-xl font-extrabold font-mono text-emerald-700 block mt-1">zmk {approvedCollectedAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full inline-flex font-sans border border-emerald-100">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>{allRevenueLogs.filter(r => r.status === 'Approved').length} clear logs</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border shadow-xs text-left transition-all ${allRevenueLogs.filter(r => r.status === 'Pending').length > 0 ? 'bg-amber-50/50 border-amber-200/80' : 'bg-white border-gray-200/80'}`} id="kpi-pending">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider block font-sans ${allRevenueLogs.filter(r => r.status === 'Pending').length > 0 ? 'text-amber-700' : 'text-gray-400'}`}>Pending Review</span>
            <span className={`text-xl font-extrabold font-mono block mt-1 ${allRevenueLogs.filter(r => r.status === 'Pending').length > 0 ? 'text-amber-800' : 'text-gray-900'}`}>zmk {pendingCollectedAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <div className={`flex items-center gap-1 mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex font-sans ${allRevenueLogs.filter(r => r.status === 'Pending').length > 0 ? 'bg-amber-100/50 text-amber-750 font-bold' : 'bg-gray-100 text-gray-500'}`}>
              <Clock className="w-3 h-3 shrink-0 animate-pulse" />
              <span>{allRevenueLogs.filter(r => r.status === 'Pending').length} logs awaiting review</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs text-left" id="kpi-total-expenditure">
            <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider block font-sans">Maintenance Cost</span>
            <span className="text-xl font-extrabold font-mono text-rose-600 block mt-1">zmk {totalExpenditure.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500 font-sans">
              <span className="font-bold underline">{allServiceLogs.length}</span> service events
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs text-left" id="kpi-assets">
            <span className="text-[10px] font-extrabold text-indigo-650 uppercase tracking-wider block font-sans">Contributing Assets</span>
            <span className="text-xl font-extrabold font-mono text-indigo-705 block mt-1">{uniqueVehiclesCountAll} Cars</span>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-full inline-flex font-sans">
              <Car className="w-3 h-3 shrink-0" />
              <span>out of {cars.length} cars</span>
            </div>
          </div>

        </div>



        {/* Mobile-only view tab switcher for Finance */}
        <div className="flex lg:hidden bg-slate-100 p-1 rounded-xl mb-4 border border-slate-250/20" id="finance-mobile-tab-bar">
          <button
            type="button"
            onClick={() => setMobileSubTab('ledger')}
            className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mobileSubTab === 'ledger'
                ? 'bg-white text-indigo-600 shadow-3xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="mobile-view-ledger-btn"
          >
            Ledger Queue ({filteredRevenues.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileSubTab('analytics')}
            className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mobileSubTab === 'analytics'
                ? 'bg-white text-indigo-600 shadow-3xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="mobile-view-analytics-btn"
          >
            Analytics Charts
          </button>
        </div>

        {/* Analytics Body Layout Grid split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="finance-grid-body">
          
          {/* LEFT: Charts Dashboard Column span 7 */}
          <div className={`lg:col-span-7 space-y-6 ${mobileSubTab === 'analytics' ? 'block' : 'hidden lg:block'}`} id="dashboard-graphics-col">
            
            {/* Fleet Revenue to Expenditure comparison Chart */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs animate-fade-in text-left" id="trend-chart-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 font-sans text-left">
                <div className="text-left animate-none">
                  <h3 className="text-xs font-extrabold text-gray-450 uppercase tracking-wider">Fleet Financial Performance Curve</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {chartViewMode === 'timeline' 
                      ? 'Historical chronological progression of revenue, expenses, and net profit trend line over time.' 
                      : 'Performance comparison showing total revenue, maintenance costs, and net margin per asset.'}
                  </p>
                </div>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 self-start sm:self-auto" id="chart-mode-toggles">
                  <button
                    type="button"
                    onClick={() => setChartViewMode('timeline')}
                    className={`py-1 px-3 text-[10px] font-black rounded-md transition-all uppercase tracking-wider cursor-pointer ${
                      chartViewMode === 'timeline'
                        ? 'bg-white text-indigo-650 shadow-xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Timeline Trend
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartViewMode('asset')}
                    className={`py-1 px-3 text-[10px] font-black rounded-md transition-all uppercase tracking-wider cursor-pointer ${
                      chartViewMode === 'asset'
                        ? 'bg-white text-indigo-650 shadow-xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Asset Split
                  </button>
                </div>
              </div>

              {chartViewMode === 'timeline' ? (
                timelineChartData.length > 0 ? (
                  <div className="h-64 pl-0" id="recharts-timeline-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={timelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={9} />
                        <YAxis stroke="#94a3b8" fontSize={9} />
                        <Tooltip 
                          formatter={(value: any, name?: string | number) => [`zmk ${Number(value).toLocaleString()}`, String(name || '')]}
                          contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Daily Revenue" barSize={16} />
                        <Bar dataKey="Expenditure" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Maintenance Exp" barSize={16} />
                        <Line type="monotone" dataKey="Net Profit Trend" stroke="#10b981" strokeWidth={3} name="Net Profit Trend" dot={{ r: 3, strokeWidth: 1 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-20 text-center border border-dashed border-gray-100 rounded-xl bg-gray-50/50" id="empty-timeline-slate">
                    <Coins className="w-10 h-10 text-gray-200 mx-auto animate-pulse" />
                    <p className="text-xs text-gray-400 italic mt-2 font-normal font-sans">No transaction entries found to construct a financial timeline.</p>
                  </div>
                )
              ) : (
                fleetBenefitChart.length > 0 ? (
                  <div className="h-64 pl-0" id="recharts-trend-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fleetBenefitChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                        <YAxis stroke="#94a3b8" fontSize={9} />
                        <Tooltip 
                          formatter={(value: any, name?: string | number) => [`zmk ${Number(value).toLocaleString()}`, String(name || '')]}
                          contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Total Revenue" />
                        <Bar dataKey="Expenditure" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Maintenance Exp" />
                        <Bar dataKey="Net Profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Net profit" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-20 text-center border border-dashed border-gray-100 rounded-xl bg-gray-50/50" id="empty-trend-slate">
                    <Coins className="w-10 h-10 text-gray-200 mx-auto animate-pulse" />
                    <p className="text-xs text-gray-400 italic mt-2 font-normal font-sans">No vehicle asset logs found to populate comparison reports.</p>
                  </div>
                )
              )}
            </div>

            {/* Monthly Performance Breakdown Data Table for the Current Fiscal Year */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs text-left animate-fade-in" id="monthly-performance-breakdown-card">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-150 pb-2.5 mb-3">
                <div 
                  className="flex-1 cursor-pointer select-none text-left"
                  onClick={() => setIsMonthlyTableExpanded(!isMonthlyTableExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-gray-905 uppercase tracking-wider flex items-center gap-1 hover:text-indigo-650 transition-colors">
                      {isMonthlyTableExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                      )}
                      Monthly Performance (FY {selectedFiscalYear})
                    </h3>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-sans uppercase">
                      {isMonthlyTableExpanded ? 'Expanded' : 'Collapsed'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">Chronological summary of fleet-wide generated collections, maintenance overheads, and net yields.</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Fiscal Year Switcher Dropdown */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider font-sans">Fiscal Year:</span>
                    <select
                      value={selectedFiscalYear}
                      onChange={(e) => setSelectedFiscalYear(Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()} // Prevent collapse trigger when clicking inside the selector
                      className="bg-slate-50 border border-gray-200 text-[10px] font-bold rounded-lg px-2 py-1 text-gray-755 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer font-sans"
                      id="filter-performance-year"
                    >
                      {availableYears.map(year => (
                        <option key={year} value={year}>FY {year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Collapsed State Summary row */}
              {!isMonthlyTableExpanded && (
                <div 
                  className="bg-slate-50/50 hover:bg-slate-50 border border-gray-100 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 cursor-pointer transition-all animate-fade-in"
                  onClick={() => setIsMonthlyTableExpanded(true)}
                >
                  <div className="flex items-center gap-4 text-[11px] font-sans">
                    <div>
                      <span className="text-[8px] font-bold uppercase text-gray-400">Total Year Revenue:</span>
                      <span className="ml-1 font-mono font-bold text-slate-700">
                        zmk {monthlyPerformanceData.reduce((s, m) => s + m.revenue, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="border-l border-gray-250/20 h-4" />
                    <div>
                      <span className="text-[8px] font-bold uppercase text-rose-500">Year Maintenance:</span>
                      <span className="ml-1 font-mono font-bold text-rose-500">
                        zmk {monthlyPerformanceData.reduce((s, m) => s + m.maintenance, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="border-l border-gray-250/20 h-4" />
                    <div>
                      {(() => {
                        const net = monthlyPerformanceData.reduce((s, m) => s + m.revenue - m.maintenance, 0);
                        return (
                          <>
                            <span className="text-[8px] font-bold uppercase text-gray-400">Year Net Profit:</span>
                            <span className={`ml-1 font-mono font-bold ${net >= 0 ? 'text-emerald-700' : 'text-rose-750 font-black'}`}>
                              zmk {net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <span className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-0.5">
                    Click to view details <ChevronDown className="w-3.5 h-3.5 inline animate-pulse" />
                  </span>
                </div>
              )}

              {/* Full Months Table - Visible only when expanded */}
              {isMonthlyTableExpanded && (
                <div className="overflow-x-auto transition-all animate-fade-in">
                  <table className="w-full text-left text-[11px] border-collapse" id="monthly-performance-table">
                    <thead>
                      <tr className="border-b border-gray-100 text-[9px] uppercase text-gray-455 font-extrabold tracking-wider bg-slate-50/50 select-none">
                        <th className="py-2 px-3 font-sans">Month</th>
                        <th className="py-2 px-2 text-right font-sans">Total Revenue</th>
                        <th className="py-2 px-2 text-right text-rose-600 font-sans">Maintenance Costs</th>
                        <th className="py-2 px-3 text-right font-sans">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 border-b border-gray-100">
                      {monthlyPerformanceData.map((m, idx) => {
                        const netProfit = m.revenue - m.maintenance;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/35 transition-colors">
                            <td className="py-2 px-3 font-bold text-gray-800 font-sans">{m.name}</td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-slate-700">
                              zmk {m.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-rose-500">
                              zmk {m.maintenance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700 font-black'}`}>
                              zmk {netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Asset Financial P&L Breakdown Table (Revenue vs. Maintenance Expenditure) */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs text-left" id="asset-financial-breakdown-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-150 pb-2.5 mb-3 gap-2">
                <div>
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Asset profit & loss breakdown</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Performance tracking model comparing generated collections vs. overhead costs per fleet vehicle.</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" id="pnl-asset-filter-wrapper">
                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider font-sans">Filter Asset:</span>
                  <select
                    value={plAssetFilter}
                    onChange={(e) => setPlAssetFilter(e.target.value)}
                    className="bg-slate-50 border border-gray-200 text-[10px] font-bold rounded-lg px-2 py-1 text-gray-750 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                    id="filter-pnl-asset-dropdown"
                  >
                    <option value="all">All Vehicles</option>
                    {cars.map(c => (
                      <option key={c.id} value={c.id}>{c.make} {c.model} ({c.plateNumber})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[9px] uppercase text-gray-400 font-extrabold tracking-wider bg-slate-50/50 select-none">
                      <th className="py-2 px-3">Vehicle Details</th>
                      <th className="py-2 px-2 text-right">Revenue</th>
                      <th className="py-2 px-2 text-right text-rose-600">Maintenance</th>
                      <th className="py-2 px-3 text-right">Net Yield</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 border-b border-gray-100">
                    {cars
                      .filter(car => plAssetFilter === 'all' || car.id === plAssetFilter)
                      .map(car => {
                        // Calculate total generated revenue
                        const carRevenue = (car.revenueLogs || []).reduce((sum, r) => sum + r.amount, 0);
                        // Calculate total maintenance expenditure
                        const carExpenditure = (car.serviceLogs || []).reduce((sum, log) => sum + log.cost, 0);
                        const netMargin = carRevenue - carExpenditure;

                      return (
                        <tr key={car.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="py-2 px-3">
                            <span className="font-extrabold text-gray-800 block truncate max-w-[130px] uppercase font-sans">{car.make} {car.model}</span>
                            <span className="font-mono text-[9px] text-gray-400 block mt-0.5">{car.plateNumber}</span>
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-slate-700">
                            zmk {carRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-rose-500">
                            zmk {carExpenditure.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`py-2 px-3 text-right font-mono font-bold ${netMargin >= 0 ? 'text-emerald-600' : 'text-rose-600 font-black'}`}>
                            zmk {netMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>



          </div>

          {/* RIGHT: Central Ledger / Approval Queue Column span 5 */}
          <div className={`lg:col-span-5 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex flex-col gap-4 text-left animate-fade-in ${mobileSubTab === 'ledger' ? 'block' : 'hidden lg:flex'}`} id="finance-ledger-col">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-2.5" id="ledger-headline">
              <div>
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-505 shrink-0 animate-pulse" />
                  Submissions Ledger Registry
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Showing {filteredRevenues.length} revenue logging entries matching filters</p>
              </div>

              {/* Status Filter Toggle Group */}
              <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 shrink-0 select-none" id="ledger-status-toggle">
                <button
                  type="button"
                  onClick={() => setFinanceStatus('all')}
                  className={`px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    financeStatus === 'all'
                      ? 'bg-white text-slate-800 shadow-3xs border border-slate-200/45 font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFinanceStatus('Pending')}
                  className={`px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                    financeStatus === 'Pending'
                      ? 'bg-amber-500 text-white shadow-3xs'
                      : 'text-slate-500 hover:text-amber-700'
                  }`}
                >
                  <span>Pending</span>
                  {totalPendingCount > 0 && (
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none shrink-0 ${
                      financeStatus === 'Pending' ? 'bg-white text-amber-600' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {totalPendingCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFinanceStatus('Approved')}
                  className={`px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    financeStatus === 'Approved'
                      ? 'bg-emerald-600 text-white shadow-3xs'
                      : 'text-slate-500 hover:text-emerald-700'
                  }`}
                >
                  Approved
                </button>
              </div>
            </div>

            {/* Integrated Filters Panel */}
            <div className="bg-slate-50 border border-gray-150 rounded-xl p-3 space-y-2.5 text-left" id="integrated-ledger-filters">
              {/* First Row: Search */}
              <div className="relative w-full" id="sec-search-rev">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Search ledger by driver, desc, plate..."
                  value={financeSearch}
                  onChange={(e) => setFinanceSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 bg-white text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-455 font-medium font-sans"
                  id="search-finance-ledger"
                />
                {financeSearch && (
                  <button
                    onClick={() => setFinanceSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-slate-200 text-gray-500 hover:text-gray-800 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer font-bold"
                    type="button"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Second Row: Filters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Asset Select */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-extrabold text-gray-450 uppercase tracking-wider font-sans">Asset</span>
                  <select
                    value={financeAsset}
                    onChange={(e) => setFinanceAsset(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-[10px] font-bold rounded-lg px-2 py-1 text-gray-750 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer font-sans"
                    id="filter-ledger-asset"
                  >
                    <option value="all">All Vehicles</option>
                    {cars.map(c => (
                      <option key={c.id} value={c.id}>{c.make} {c.model}</option>
                    ))}
                  </select>
                </div>

                {/* Category Select */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-extrabold text-gray-450 uppercase tracking-wider font-sans">Category</span>
                  <select
                    value={financeCategory}
                    onChange={(e) => setFinanceCategory(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-[10px] font-bold rounded-lg px-2 py-1 text-gray-750 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer font-sans"
                    id="filter-ledger-cat"
                  >
                    <option value="all">All Types</option>
                    <option value="Fare">Fare</option>
                    <option value="Rental">Rental Yield</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Timeframe Select */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-extrabold text-gray-450 uppercase tracking-wider font-sans">Timeframe</span>
                  <select
                    value={financeTimeframe}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setFinanceTimeframe(val);
                      if (val !== 'custom') {
                        setStartDate('');
                        setEndDate('');
                      }
                    }}
                    className="w-full bg-white border border-gray-200 text-[10px] font-bold rounded-lg px-2 py-1 text-gray-750 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer font-sans"
                    id="filter-ledger-time"
                  >
                    <option value="all">All Time</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
              </div>

              {/* Custom Date Range Panel */}
              {financeTimeframe === 'custom' && (
                <div className="flex items-center gap-2 bg-white border border-gray-200 p-2 rounded-lg text-xs" id="custom-date-range-panel">
                  <div className="flex-1 flex flex-col gap-0.5">
                    <span className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">Start</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent border-none text-[10px] font-bold text-gray-750 outline-none p-0 focus:ring-0 cursor-pointer h-5 w-full"
                      title="Start Date"
                    />
                  </div>
                  <span className="text-gray-300 font-bold text-[10px] self-end mb-1">-</span>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <span className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">End</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent border-none text-[10px] font-bold text-gray-750 outline-none p-0 focus:ring-0 cursor-pointer h-5 w-full"
                      title="End Date"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Ledger timeline overflow list */}
            <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1" id="ledger-timeline-list">
              {filteredRevenues.length > 0 ? (
                filteredRevenues.map((rev) => {
                  const isExpanded = expandedLogId === rev.id;
                  
                  return (
                    <div
                      key={rev.id}
                      className={`p-3 bg-white border rounded-xl flex flex-col gap-2 transition-all cursor-pointer ${
                        isExpanded ? 'bg-indigo-50/20 border-indigo-250 shadow-3xs' : 'border-gray-150 hover:bg-slate-50/30'
                      }`}
                      onClick={() => setExpandedLogId(isExpanded ? null : rev.id)}
                      id={`ledger-card-${rev.id}`}
                    >
                      <div className="flex items-center justify-between w-full text-left">
                        <div className="flex items-start gap-2.5 max-w-[70%]">
                          <div className="mt-1">
                            {rev.status === 'Pending' ? (
                              <span className="w-2 h-2 rounded-full bg-amber-400 block animate-ping" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 block" />
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-left">
                              <strong className="text-gray-900 font-extrabold">{rev.category}</strong>
                              <span className="text-[8px] text-gray-400 font-semibold font-mono bg-gray-150 px-1 py-0.5 rounded leading-none">{rev.date}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5 font-mono text-left">
                              Plate: <span className="text-indigo-600 font-bold">{rev.carPlate}</span> • {rev.carMake} {rev.carModel}
                            </p>
                            {rev.driverName && (
                              <p className="text-[10.5px] text-gray-500 font-semibold mt-0.5 flex items-center gap-1 leading-none text-left">
                                <span className="font-sans">Driver:</span>
                                <span className="font-extrabold text-slate-800 font-sans">{rev.driverName}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-emerald-700 font-extrabold text-xs bg-emerald-50 py-0.5 px-2 rounded-lg font-mono">
                              +zmk {rev.amount.toLocaleString()}
                            </span>
                            
                            {/* Inline verification controls */}
                            {rev.status === 'Pending' && (
                              <div className="flex items-center gap-1.5 mt-1" id="ledger-actions-panel">
                                <button
                                  type="button"
                                  onClick={() => handleApproveRevenueLog(rev.carId, rev.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-2.5 py-1 rounded-xl text-[10px] transition-all cursor-pointer font-sans shadow-3xs flex items-center gap-1 active:scale-95"
                                  id={`btn-approve-ledger-${rev.id}`}
                                >
                                  <Check className="w-3 h-3 shrink-0" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRevenueLog(rev.carId, rev.id)}
                                  className="bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white font-extrabold px-2.5 py-1 rounded-xl text-[10px] transition-all cursor-pointer border border-rose-200 hover:border-rose-600 shadow-3xs flex items-center gap-1 active:scale-95"
                                  id={`btn-reject-ledger-${rev.id}`}
                                  title="Reject or Delete log"
                                >
                                  Reject
                                </button>
                              </div>
                            )}

                            {rev.status === 'Approved' && (
                              <div className="flex items-center gap-1 text-emerald-600">
                                <span className="text-[9px] uppercase font-bold tracking-wider font-sans">Authorized</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRevenueLog(rev.carId, rev.id)}
                                  className="text-gray-300 hover:text-rose-500 p-0.5 rounded transition-colors cursor-pointer"
                                  title="Delete logged cash cashing entry"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expandable description block */}
                      {isExpanded && (
                        <div className="mt-2 text-[10px] bg-slate-50 border border-gray-150 p-2.5 rounded-xl space-y-1.5 cursor-default text-left" onClick={(e) => e.stopPropagation()}>
                          <div className="text-gray-500 leading-normal font-medium text-left">
                            <span className="font-bold text-gray-700 block mb-0.5 font-sans">Work Statement Notes / Description:</span>
                            {rev.description || <span className="italic font-sans font-normal">No description recorded for this collection.</span>}
                          </div>
                          <div className="text-[8px] uppercase font-bold text-gray-450 tracking-wider text-left font-mono">
                            Ref ID: {rev.id}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center border mr-1 border-dashed border-gray-150 rounded-2xl bg-gray-50/50" id="empty-ledger-slate">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto animate-pulse" />
                  <p className="text-xs text-gray-450 italic mt-3 font-sans font-normal">No matching revenues logs recorded.</p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Hidden printable financial report template for html2pdf */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '800px', pointerEvents: 'none' }}>
        <div id="finance-report-pdf-content" className="p-8 bg-white text-gray-900 w-[790px] font-sans">
          
          {/* Document Header */}
          <div className="border-b-2 border-gray-900 pb-4 mb-6">
            <div className="flex justify-between items-end">
              <div className="text-left animate-none">
                <h1 className="text-2xl font-black uppercase text-gray-900 tracking-tight">Fleet Financial Status Report</h1>
                <p className="text-xs text-gray-500 font-mono mt-1">Generated: {new Date().toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-indigo-600 uppercase tracking-wider font-sans">Enterprise Management System</p>
                <p className="text-[10px] text-gray-400 font-mono">Confidential Report</p>
              </div>
            </div>
          </div>

          {/* Section 1: Executive KPI Summary */}
          <div className="mb-6 text-left">
            <h2 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2.5 font-sans">1. Executive Summary</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="border border-gray-200 p-3 rounded-xl bg-slate-50/50">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block font-sans">Gross Revenue</span>
                <span className="text-sm font-black font-mono text-gray-950 block mt-1">zmk {totalCollectedAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border border-gray-200 p-3 rounded-xl bg-slate-50/50">
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block font-sans">Approved Cash</span>
                <span className="text-sm font-black font-mono text-emerald-700 block mt-1">zmk {approvedCollectedAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border border-gray-200 p-3 rounded-xl bg-slate-50/50">
                <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider block font-sans">Total Maintenance</span>
                <span className="text-sm font-black font-mono text-rose-600 block mt-1">zmk {totalExpenditure.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border border-gray-200 p-3 rounded-xl bg-slate-50/50">
                <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider block font-sans">Fleet Net Profit</span>
                <span className="text-sm font-black font-mono text-indigo-700 block mt-1">zmk {(totalCollectedAll - totalExpenditure).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Fleet Performance Matrix */}
          <div className="mb-6 text-left">
            <h2 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2.5 font-sans">2. Asset Profit & Loss Breakdown</h2>
            <table className="w-full text-left text-[11px] border-collapse border border-gray-200">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-255 text-[10px] uppercase text-gray-500 font-extrabold select-none">
                  <th className="py-2 px-3 border-r border-gray-200 text-left font-sans">Vehicle Details</th>
                  <th className="py-2 px-3 text-right border-r border-gray-200 font-sans">Revenue</th>
                  <th className="py-2 px-3 text-right border-r border-gray-200 text-rose-600 font-sans">Maintenance</th>
                  <th className="py-2 px-3 text-right font-sans">Net Yield</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cars.map(car => {
                  const carRevenue = (car.revenueLogs || []).reduce((sum, r) => sum + r.amount, 0);
                  const carExpenditure = (car.serviceLogs || []).reduce((sum, log) => sum + log.cost, 0);
                  const netMargin = carRevenue - carExpenditure;
                  return (
                    <tr key={car.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 border-r border-gray-200">
                        <span className="font-extrabold text-gray-900 block uppercase font-sans text-left">{car.make} {car.model}</span>
                        <span className="font-mono text-[9px] text-gray-450 block mt-0.5 text-left">{car.plateNumber}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-gray-850 border-r border-gray-200">
                        zmk {carRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 border-r border-gray-200">
                        zmk {carExpenditure.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono font-bold ${netMargin >= 0 ? 'text-emerald-700' : 'text-rose-700 font-extrabold'}`}>
                        zmk {netMargin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Section 3: Ledger Transactions Registry (Active Filter queue) */}
          <div className="text-left">
            <div className="flex justify-between items-center mb-2.5">
              <h2 className="text-xs font-black uppercase text-gray-400 tracking-wider font-sans">3. Ledger Transaction submissions</h2>
              <span className="text-[10px] text-gray-400 font-bold font-sans">Showing {filteredRevenues.length} filtered entries</span>
            </div>
            <table className="w-full text-left text-[10px] border-collapse border border-gray-200">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-255 text-[9px] uppercase text-gray-500 font-extrabold select-none">
                  <th className="py-1.5 px-2 border-r border-gray-200 text-left font-sans">Date</th>
                  <th className="py-1.5 px-2 border-r border-gray-200 text-left font-sans">Category</th>
                  <th className="py-1.5 px-2 border-r border-gray-200 text-left font-sans">Details</th>
                  <th className="py-1.5 px-2 border-r border-gray-200 text-right font-sans">Amount</th>
                  <th className="py-1.5 px-2 text-center font-sans">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-left">
                {filteredRevenues.map((rev) => (
                  <tr key={rev.id} className="hover:bg-slate-50/50">
                    <td className="py-1.5 px-2 font-mono border-r border-gray-200 text-left">{rev.date}</td>
                    <td className="py-1.5 px-2 font-bold border-r border-gray-200 text-left">{rev.category}</td>
                    <td className="py-1.5 px-2 border-r border-gray-200 text-left">
                      <div className="font-semibold text-gray-800 text-left font-sans">{rev.carMake} {rev.carModel} ({rev.carPlate})</div>
                      {rev.driverName && <div className="text-gray-400 text-[8px] text-left">Driver: {rev.driverName}</div>}
                      {rev.description && <div className="text-[8.5px] text-gray-500 italic mt-0.5 text-left leading-tight font-sans">{rev.description}</div>}
                    </td>
                    <td className="py-1.5 px-2 font-mono font-bold text-right text-emerald-700 border-r border-gray-200 font-mono">
                      zmk {rev.amount.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded ${
                        rev.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rev.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredRevenues.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400 italic font-sans">No transaction records matching current filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </div>
  );
}
