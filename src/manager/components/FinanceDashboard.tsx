import React, { useState } from 'react';
import { Coins, Check, CheckCircle2, Clock, Car, Search, FileText, Trash2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { CarAsset, RevenueLog } from '../../types';

interface FinanceDashboardProps {
  cars: CarAsset[];
  setCars: React.Dispatch<React.SetStateAction<CarAsset[]>>;
}

export default function FinanceDashboard({
  cars,
  setCars
}: FinanceDashboardProps) {
  // Encapsulated filter state
  const [financeTimeframe, setFinanceTimeframe] = useState<'all' | '7d' | '30d' | 'this_month' | 'last_month'>('all');
  const [financeAsset, setFinanceAsset] = useState<string>('all');
  const [financeCategory, setFinanceCategory] = useState<string>('all');
  const [financeStatus, setFinanceStatus] = useState<string>('all');
  const [financeSearch, setFinanceSearch] = useState<string>('');
  
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

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
    if (isNaN(logDate.getTime())) return true;
    
    if (financeTimeframe === '7d') {
      const limit = new Date();
      limit.setDate(limit.getDate() - 7);
      return logDate >= limit;
    }
    if (financeTimeframe === '30d') {
      const limit = new Date();
      limit.setDate(limit.getDate() - 30);
      return logDate >= limit;
    }
    if (financeTimeframe === 'this_month') {
      const now = new Date();
      return logDate.getFullYear() === now.getFullYear() && logDate.getMonth() === now.getMonth();
    }
    if (financeTimeframe === 'last_month') {
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

  // Calculate high-level financial parameters
  const totalCollected = filteredRevenues.reduce((sum, r) => sum + r.amount, 0);
  const approvedCollected = filteredRevenues.filter(r => r.status === 'Approved').reduce((sum, r) => sum + r.amount, 0);
  const pendingCollected = filteredRevenues.filter(r => r.status === 'Pending').reduce((sum, r) => sum + r.amount, 0);
  const pendingReviewCount = filteredRevenues.filter(r => r.status === 'Pending').length;
  const uniqueVehiclesCount = new Set(filteredRevenues.map(r => r.carPlate)).size;
  const totalPendingCount = allRevenueLogs.filter(r => r.status === 'Pending').length;

  // Chart data 1: Timeline Growth Trend
  const dateMap: Record<string, number> = {};
  filteredRevenues.forEach(r => {
    dateMap[r.date] = (dateMap[r.date] || 0) + r.amount;
  });
  const trendChart = Object.entries(dateMap)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Chart data 2: Revenue distribution by Asset Bar
  const carMap: Record<string, number> = {};
  filteredRevenues.forEach(r => {
    const label = `${r.carMake} (${r.carPlate})`;
    carMap[label] = (carMap[label] || 0) + r.amount;
  });
  const assetChart = Object.entries(carMap).map(([name, amount]) => ({ name, amount }));

  // Chart data 3: Revenue split by Category Donut
  const catMap: Record<string, number> = {};
  filteredRevenues.forEach(r => {
    catMap[r.category] = (catMap[r.category] || 0) + r.amount;
  });
  const categoryChart = Object.entries(catMap).map(([name, value]) => ({ name, value }));
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

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

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" id="finance-kpis-grid">
          
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs text-left" id="kpi-total-collected">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block font-sans">Gross Sum Revenue</span>
            <span className="text-xl font-extrabold font-mono text-gray-900 block mt-1">zmk {totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500 font-sans">
              <span className="font-bold underline">{filteredRevenues.length}</span> transactions logged
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs text-left animate-delay" id="kpi-approved">
            <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block font-sans">Verified & Approved</span>
            <span className="text-xl font-extrabold font-mono text-emerald-700 block mt-1">zmk {approvedCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full inline-flex font-sans border border-emerald-100">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>{filteredRevenues.filter(r => r.status === 'Approved').length} clear logs</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border shadow-xs text-left transition-all ${pendingReviewCount > 0 ? 'bg-amber-50/50 border-amber-200/80' : 'bg-white border-gray-200/80'}`} id="kpi-pending">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider block font-sans ${pendingReviewCount > 0 ? 'text-amber-700' : 'text-gray-400'}`}>Pending Review</span>
            <span className={`text-xl font-extrabold font-mono block mt-1 ${pendingReviewCount > 0 ? 'text-amber-800' : 'text-gray-900'}`}>zmk {pendingCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <div className={`flex items-center gap-1 mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex font-sans ${pendingReviewCount > 0 ? 'bg-amber-100/50 text-amber-750 font-bold' : 'bg-gray-100 text-gray-500'}`}>
              <Clock className="w-3 h-3 shrink-0 animate-pulse" />
              <span>{pendingReviewCount} logs awaiting review</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs text-left" id="kpi-assets">
            <span className="text-[10px] font-extrabold text-indigo-650 uppercase tracking-wider block font-sans">Contributing Assets</span>
            <span className="text-xl font-extrabold font-mono text-indigo-705 block mt-1">{uniqueVehiclesCount} Cars</span>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-full inline-flex font-sans">
              <Car className="w-3 h-3 shrink-0" />
              <span>out of {cars.length} cars</span>
            </div>
          </div>

        </div>

        {/* Filters Dashboard Panel */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200/75 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between" id="finance-filters-bar">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm" id="sec-search-rev">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search ledger by driver, desc, plate..."
              value={financeSearch}
              onChange={(e) => setFinanceSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-medium"
              id="search-finance-ledger"
            />
            {financeSearch && (
              <button
                onClick={() => setFinanceSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-gray-200 font-bold text-gray-600 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Select Slates */}
          <div className="flex flex-wrap items-center gap-2" id="ledger-filters-selections text-left">
            
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider font-sans">Asset:</span>
              <select
                value={financeAsset}
                onChange={(e) => setFinanceAsset(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-lg px-2 py-1 text-gray-750 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                id="filter-ledger-asset"
              >
                <option value="all">All Vehicles</option>
                {cars.map(c => (
                  <option key={c.id} value={c.id}>{c.make} {c.model} ({c.plateNumber})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider font-sans">Timeframe:</span>
              <select
                value={financeTimeframe}
                onChange={(e) => setFinanceTimeframe(e.target.value as any)}
                className="bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-lg px-2 py-1 text-gray-750 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                id="filter-ledger-time"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider font-sans">Type:</span>
              <select
                value={financeCategory}
                onChange={(e) => setFinanceCategory(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-lg px-2 py-1 text-gray-750 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer animate-fade-in"
                id="filter-ledger-cat"
              >
                <option value="all">All Categories</option>
                <option value="Fare">Fare / Passenger</option>
                <option value="Rental">Rental Yield</option>
                <option value="Delivery">Delivery</option>
                <option value="Contract">Trip Contract</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider font-sans">Status:</span>
              <select
                value={financeStatus}
                onChange={(e) => setFinanceStatus(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-lg px-2 py-1 text-gray-750 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                id="filter-ledger-status"
              >
                <option value="all">All Statuses</option>
                <option value="Approved">Approved Only</option>
                <option value="Pending">Pending Only</option>
              </select>
            </div>

          </div>

        </div>

        {/* Analytics Body Layout Grid split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="finance-grid-body">
          
          {/* LEFT: Charts Dashboard Column span 7 */}
          <div className="lg:col-span-7 space-y-6" id="dashboard-graphics-col">
            
            {/* Income Over Time Area Chart */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs animate-fade-in" id="trend-chart-card">
              <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-4 text-left font-sans">Daily Collection Timeline Growth</h3>
              {trendChart.length > 0 ? (
                <div className="h-64 pl-0" id="recharts-trend-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAmt2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} fontStyle="italic" />
                      <YAxis stroke="#94a3b8" fontSize={9} />
                      <Tooltip 
                        formatter={(value: any) => [`zmk ${Number(value).toLocaleString()}`, 'Total Collected']}
                        contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorAmt2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-20 text-center border border-dashed border-gray-100 rounded-xl bg-gray-50/50" id="empty-trend-slate">
                  <Coins className="w-10 h-10 text-gray-200 mx-auto animate-pulse" />
                  <p className="text-xs text-gray-400 italic mt-2 font-normal font-sans">No transaction data generated for the current filtered date range.</p>
                </div>
              )}
            </div>

            {/* Grid of Distribution by Category and Asset Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="distribution-graphics-subgrid">
              
              {/* Asset Revenue Bar chart */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs" id="asset-chart-card">
                <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3 text-left font-sans">Revenue by Fleet Asset</h3>
                {assetChart.length > 0 ? (
                  <div className="h-48" id="recharts-asset-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={assetChart} margin={{ top: 0, right: 5, left: -30, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={7} stroke="#94a3b8" />
                        <YAxis fontSize={8} stroke="#94a3b8" />
                        <Tooltip
                          formatter={(value: any) => [`zmk ${Number(value).toLocaleString()}`, 'Revenue']}
                          contentStyle={{ backgroundColor: 'white', borderRadius: '8px', fontSize: '10px' }}
                        />
                        <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-12 text-center" id="empty-asset-slate">
                    <Car className="w-8 h-8 text-gray-200 mx-auto" />
                    <p className="text-[10px] text-gray-400 italic mt-1.5 font-sans font-normal">No vehicle metric distribution available.</p>
                  </div>
                )}
              </div>

              {/* Category Share Distribution donut gauge */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between" id="category-chart-card">
                <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2 text-left font-sans">Collections by Stream Category</h3>
                {categoryChart.length > 0 ? (
                  <div className="flex items-center justify-between gap-2" id="recharts-cat-container-sub">
                    
                    <div className="w-24 h-24 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryChart}
                            innerRadius={28}
                            outerRadius={45}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {categoryChart.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => `zmk ${Number(value).toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex-1 space-y-1.5 text-left text-[10px]" id="cat-donut-labels">
                      {categoryChart.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between border-b border-gray-50 pb-0.5">
                          <span className="flex items-center gap-1.5 text-gray-505 font-bold font-sans">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            {item.name}
                          </span>
                          <span className="font-mono font-bold text-gray-800">zmk {item.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>

                  </div>
                ) : (
                  <div className="py-12 text-center" id="empty-cat-slate text-center">
                    <div className="text-center w-full">
                      <Coins className="w-8 h-8 text-gray-200 mx-auto" />
                      <p className="text-[10px] text-gray-400 italic mt-1.5 font-sans font-normal">No category split metrics recorded.</p>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* RIGHT: Central Ledger / Approval Queue Column span 5 */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex flex-col gap-4 text-left animate-fade-in" id="finance-ledger-col">
            
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
                                <span className="font-sans">👤 Driver:</span>
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
    </div>
  );
}
