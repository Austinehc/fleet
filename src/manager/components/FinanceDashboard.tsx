import React, { useState } from 'react';
import { Coins, Check, CheckCircle2, Clock, Car, Search, FileText, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CarAsset } from '../../types';

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
    const allExpenses = cars.flatMap(c => [...(c.serviceLogs || []), ...(c.insuranceLogs || []).map(ins => ({
      date: ins.date,
      cost: ins.amount
    }))]);
    
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

      (car.insuranceLogs || []).forEach(ins => {
        if (!ins.date) return;
        const logDate = new Date(ins.date);
        if (logDate.getFullYear() === selectedFiscalYear) {
          const m = logDate.getMonth();
          if (m >= 0 && m < 12) {
            const month = months[m];
            if (month) {
              month.maintenance += ins.amount;
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

  // Calculate filtered vehicles for Asset Profit & Loss
  const filteredVehicles = React.useMemo(() => {
    return cars
      .filter(car => plAssetFilter === 'all' || car.id === plAssetFilter)
      .map(car => {
        // Calculate total generated revenue
        const carRevenue = (car.revenueLogs || []).reduce((sum, log) => sum + log.amount, 0);
        // Calculate maintenance expenditure
        const carMaintenance = (car.serviceLogs || []).reduce((sum, log) => sum + log.cost, 0);
        // Calculate insurance expenditure  
        const carInsurance = (car.insuranceLogs || []).reduce((sum, log) => sum + log.amount, 0);
        const carExpenditure = carMaintenance + carInsurance;
        
        return {
          id: car.id,
          make: car.make,
          model: car.model,
          plateNumber: car.plateNumber,
          totalRevenue: carRevenue,
          maintenanceCost: carMaintenance,
          insuranceCost: carInsurance,
          totalExpenses: carExpenditure,
        };
      });
  }, [cars, plAssetFilter]);

  // Export Monthly Performance as PDF
  const exportMonthlyPerformancePDF = async () => {
    setIsExportingPDF(true);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">
        <div style="text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #6366f1; margin: 0; font-size: 24px;">North Links Fleet Management</h1>
          <h2 style="color: #374151; margin: 10px 0 0 0; font-size: 18px;">Monthly Performance Report - FY ${selectedFiscalYear}</h2>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Performance Summary</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="background: #f0f9ff; padding: 10px; border-radius: 6px; border: 1px solid #bae6fd;">
              <div style="font-size: 18px; font-weight: bold; color: #0284c7;">ZMK ${monthlyPerformanceData.reduce((sum, month) => sum + month.revenue, 0).toLocaleString()}</div>
              <div style="font-size: 12px; color: #6b7280;">Total Annual Revenue</div>
            </div>
            <div style="background: #fff1f2; padding: 10px; border-radius: 6px; border: 1px solid #fecaca;">
              <div style="font-size: 18px; font-weight: bold; color: #dc2626;">ZMK ${monthlyPerformanceData.reduce((sum, month) => sum + month.maintenance, 0).toLocaleString()}</div>
              <div style="font-size: 12px; color: #6b7280;">Total Annual Expenses</div>
            </div>
            <div style="background: #f0fdf4; padding: 10px; border-radius: 6px; border: 1px solid #bbf7d0;">
              <div style="font-size: 18px; font-weight: bold; color: #16a34a;">ZMK ${monthlyPerformanceData.reduce((sum, month) => sum + (month.revenue - month.maintenance), 0).toLocaleString()}</div>
              <div style="font-size: 12px; color: #6b7280;">Net Profit</div>
            </div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 12px 8px; text-align: left; border: 1px solid #e2e8f0;">Month</th>
              <th style="padding: 12px 8px; text-align: right; border: 1px solid #e2e8f0;">Revenue (ZMK)</th>
              <th style="padding: 12px 8px; text-align: right; border: 1px solid #e2e8f0;">Expenses (ZMK)</th>
              <th style="padding: 12px 8px; text-align: right; border: 1px solid #e2e8f0;">Net Profit (ZMK)</th>
              <th style="padding: 12px 8px; text-align: right; border: 1px solid #e2e8f0;">Margin %</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyPerformanceData.map(month => `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">${month.name}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; font-family: monospace;">${month.revenue.toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; font-family: monospace;">${month.maintenance.toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; font-family: monospace; color: ${month.revenue - month.maintenance >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">${(month.revenue - month.maintenance).toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; font-family: monospace;">${month.revenue > 0 ? (((month.revenue - month.maintenance) / month.revenue) * 100).toFixed(1) + '%' : '0%'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Monthly Performance Report - Generated on ${new Date().toLocaleString()}</p>
          <p>North Links Fleet Management System</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(tempDiv);
    
    try {
      const html2pdf = (window as any).html2pdf;
      if (!html2pdf) {
        alert('PDF export library not loaded. Please refresh the page and try again.');
        return;
      }
      
      await html2pdf()
        .set({
          margin: [0.5, 0.5, 0.5, 0.5],
          filename: `Monthly_Performance_FY${selectedFiscalYear}_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        })
        .from(tempDiv)
        .save();
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExportingPDF(false);
      document.body.removeChild(tempDiv);
    }
  };

  // Export Submission Ledger as PDF
  const exportSubmissionLedgerPDF = async () => {
    setIsExportingPDF(true);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto;">
        <div style="text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #6366f1; margin: 0; font-size: 24px;">North Links Fleet Management</h1>
          <h2 style="color: #374151; margin: 10px 0 0 0; font-size: 18px;">Submissions Ledger Registry</h2>
        </div>
        
        <div style="margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px;">
          <h3 style="color: #374151; margin: 0 0 10px 0;">Ledger Summary</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">
            <div>
              <p><strong>Total Entries:</strong> ${filteredRevenues.length}</p>
              <p><strong>Total Amount:</strong> ZMK ${filteredRevenues.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</p>
            </div>
            <div>
              <p><strong>Approved:</strong> ${filteredRevenues.filter(r => r.status === 'Approved').length}</p>
              <p><strong>Pending:</strong> ${filteredRevenues.filter(r => r.status === 'Pending').length}</p>
            </div>
            <div>
              <p><strong>Active Vehicles:</strong> ${new Set(filteredRevenues.map(r => r.carPlate)).size}</p>
              <p><strong>Active Drivers:</strong> ${new Set(filteredRevenues.map(r => r.driverName)).size}</p>
            </div>
            <div>
              <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Filters Applied:</strong> ${financeSearch || financeAsset !== 'all' || financeCategory !== 'all' || financeStatus !== 'all' || financeTimeframe !== 'all' ? 'Yes' : 'None'}</p>
            </div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 8px 6px; text-align: left; border: 1px solid #e2e8f0;">Date</th>
              <th style="padding: 8px 6px; text-align: left; border: 1px solid #e2e8f0;">Driver</th>
              <th style="padding: 8px 6px; text-align: left; border: 1px solid #e2e8f0;">Vehicle</th>
              <th style="padding: 8px 6px; text-align: left; border: 1px solid #e2e8f0;">Category</th>
              <th style="padding: 8px 6px; text-align: left; border: 1px solid #e2e8f0;">Description</th>
              <th style="padding: 8px 6px; text-align: right; border: 1px solid #e2e8f0;">Amount (ZMK)</th>
              <th style="padding: 8px 6px; text-align: center; border: 1px solid #e2e8f0;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRevenues.map(rev => `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 6px; border: 1px solid #e5e7eb; font-family: monospace; font-size: 9px;">${new Date(rev.date).toLocaleDateString()}</td>
                <td style="padding: 6px; border: 1px solid #e5e7eb;">${rev.driverName || 'Unknown'}</td>
                <td style="padding: 6px; border: 1px solid #e5e7eb; font-family: monospace;">${rev.carMake} ${rev.carModel} (${rev.carPlate})</td>
                <td style="padding: 6px; border: 1px solid #e5e7eb;">
                  <span style="background: ${
                    rev.category === 'Fare' ? '#dbeafe' :
                    rev.category === 'Rental' ? '#dcfce7' :
                    rev.category === 'Delivery' ? '#fef3c7' :
                    rev.category === 'Contract' ? '#f3e8ff' :
                    '#f1f5f9'
                  }; color: ${
                    rev.category === 'Fare' ? '#1d4ed8' :
                    rev.category === 'Rental' ? '#16a34a' :
                    rev.category === 'Delivery' ? '#d97706' :
                    rev.category === 'Contract' ? '#9333ea' :
                    '#64748b'
                  }; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;">${rev.category}</span>
                </td>
                <td style="padding: 6px; border: 1px solid #e5e7eb; font-size: 9px;">${rev.description}</td>
                <td style="padding: 6px; border: 1px solid #e5e7eb; text-align: right; font-family: monospace; font-weight: bold;">${rev.amount.toLocaleString()}</td>
                <td style="padding: 6px; border: 1px solid #e5e7eb; text-align: center;">
                  <span style="color: ${rev.status === 'Approved' ? '#16a34a' : '#f59e0b'}; font-weight: bold; font-size: 9px;">${rev.status}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Submissions Ledger Registry - Generated on ${new Date().toLocaleString()}</p>
          <p>North Links Fleet Management System</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(tempDiv);
    
    try {
      const html2pdf = (window as any).html2pdf;
      if (!html2pdf) {
        alert('PDF export library not loaded. Please refresh the page and try again.');
        return;
      }
      
      await html2pdf()
        .set({
          margin: [0.4, 0.4, 0.4, 0.4],
          filename: `Submission_Ledger_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'in', format: 'legal', orientation: 'landscape' }
        })
        .from(tempDiv)
        .save();
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExportingPDF(false);
      document.body.removeChild(tempDiv);
    }
  };

  // Export Asset Profit & Loss as PDF  
  const exportAssetProfitLossPDF = async () => {
    setIsExportingPDF(true);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto;">
        <div style="text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #6366f1; margin: 0; font-size: 24px;">North Links Fleet Management</h1>
          <h2 style="color: #374151; margin: 10px 0 0 0; font-size: 18px;">Asset Profit & Loss Breakdown</h2>
        </div>
        
        <div style="margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px;">
          <h3 style="color: #374151; margin: 0 0 10px 0;">Fleet Performance Overview</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
            <div>
              <p><strong>Total Fleet Revenue:</strong> ZMK ${filteredVehicles.reduce((sum, vehicle) => sum + vehicle.totalRevenue, 0).toLocaleString()}</p>
              <p><strong>Total Fleet Expenses:</strong> ZMK ${filteredVehicles.reduce((sum, vehicle) => sum + vehicle.totalExpenses, 0).toLocaleString()}</p>
            </div>
            <div>
              <p><strong>Net Fleet Profit:</strong> ZMK ${filteredVehicles.reduce((sum, vehicle) => sum + (vehicle.totalRevenue - vehicle.totalExpenses), 0).toLocaleString()}</p>
              <p><strong>Active Vehicles:</strong> ${filteredVehicles.length}</p>
            </div>
            <div>
              <p><strong>Profitable Vehicles:</strong> ${filteredVehicles.filter(v => v.totalRevenue > v.totalExpenses).length}</p>
              <p><strong>Loss-Making Vehicles:</strong> ${filteredVehicles.filter(v => v.totalRevenue < v.totalExpenses).length}</p>
            </div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 10px 8px; text-align: left; border: 1px solid #e2e8f0;">Vehicle</th>
              <th style="padding: 10px 8px; text-align: right; border: 1px solid #e2e8f0;">Revenue (ZMK)</th>
              <th style="padding: 10px 8px; text-align: right; border: 1px solid #e2e8f0;">Maintenance (ZMK)</th>
              <th style="padding: 10px 8px; text-align: right; border: 1px solid #e2e8f0;">Insurance (ZMK)</th>
              <th style="padding: 10px 8px; text-align: right; border: 1px solid #e2e8f0;">Total Expenses (ZMK)</th>
              <th style="padding: 10px 8px; text-align: right; border: 1px solid #e2e8f0;">Net Profit (ZMK)</th>
              <th style="padding: 10px 8px; text-align: right; border: 1px solid #e2e8f0;">Margin %</th>
            </tr>
          </thead>
          <tbody>
            ${filteredVehicles.map(vehicle => `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px; border: 1px solid #e5e7eb;">
                  <div style="font-weight: bold;">${vehicle.make} ${vehicle.model}</div>
                  <div style="font-size: 9px; color: #6b7280; font-family: monospace;">${vehicle.plateNumber}</div>
                </td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; font-family: monospace; color: #059669; font-weight: bold;">${vehicle.totalRevenue.toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; font-family: monospace; color: #ea580c;">${vehicle.maintenanceCost.toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; font-family: monospace; color: #dc2626;">${vehicle.insuranceCost.toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; font-family: monospace; color: #dc2626; font-weight: bold;">${vehicle.totalExpenses.toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; font-family: monospace; color: ${vehicle.totalRevenue - vehicle.totalExpenses >= 0 ? '#059669' : '#dc2626'}; font-weight: bold;">${(vehicle.totalRevenue - vehicle.totalExpenses).toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; font-family: monospace;">${vehicle.totalRevenue > 0 ? (((vehicle.totalRevenue - vehicle.totalExpenses) / vehicle.totalRevenue) * 100).toFixed(1) + '%' : '0%'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Asset Profit & Loss Breakdown - Generated on ${new Date().toLocaleString()}</p>
          <p>North Links Fleet Management System</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(tempDiv);
    
    try {
      const html2pdf = (window as any).html2pdf;
      if (!html2pdf) {
        alert('PDF export library not loaded. Please refresh the page and try again.');
        return;
      }
      
      await html2pdf()
        .set({
          margin: [0.4, 0.4, 0.4, 0.4],
          filename: `Asset_Profit_Loss_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'in', format: 'legal', orientation: 'landscape' }
        })
        .from(tempDiv)
        .save();
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExportingPDF(false);
      document.body.removeChild(tempDiv);
    }
  };

  // Gather all expenditures across all cars based on maintenance logs AND insurance logs
  const allServiceLogs = cars.flatMap(car =>
    (car.serviceLogs || []).map(log => ({
      ...log,
      carId: car.id,
      carMake: car.make,
      carModel: car.model,
      carPlate: car.plateNumber,
    }))
  );

  const allInsuranceLogs = cars.flatMap(car =>
    (car.insuranceLogs || []).map(log => ({
      ...log,
      carId: car.id,
      carMake: car.make,
      carModel: car.model,
      carPlate: car.plateNumber,
    }))
  );

  const totalMaintenanceExpenditure = allServiceLogs.reduce((sum, log) => sum + log.cost, 0);
  const totalInsuranceExpenditure = allInsuranceLogs.reduce((sum, log) => sum + log.amount, 0);
  const totalExpenditure = totalMaintenanceExpenditure + totalInsuranceExpenditure;

  // Chart data: Fleet Revenue vs Expenditure per Asset
  const fleetBenefitChart = cars.map(car => {
    const carRevenue = (car.revenueLogs || []).reduce((sum, r) => sum + r.amount, 0);
    const carMaintenance = (car.serviceLogs || []).reduce((sum, log) => sum + log.cost, 0);
    const carInsurance = (car.insuranceLogs || []).reduce((sum, log) => sum + log.amount, 0);
    const carExpenditure = carMaintenance + carInsurance;
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left" id="finance-dashboard-hero">
          <div className="text-left">
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <Coins className="text-indigo-600 w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
              Financial Dynamics & Analytics
            </h2>
            <p className="text-xs text-gray-400 font-medium">Monitor active cashing logs, revenue streams, and verify driver submissions across the enterprise.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2" id="finance-header-actions">
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
            <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider block font-sans">Total Expenditure</span>
            <span className="text-xl font-extrabold font-mono text-rose-600 block mt-1">zmk {totalExpenditure.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500 font-sans">
              <span className="font-bold underline">{allServiceLogs.length + allInsuranceLogs.length}</span> expense events
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs text-left" id="kpi-assets">
            <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block font-sans">Contributing Assets</span>
            <span className="text-xl font-extrabold font-mono text-indigo-700 block mt-1">{uniqueVehiclesCountAll} Cars</span>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-flex font-sans">
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
                        ? 'bg-white text-indigo-600 shadow-xs'
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
                        ? 'bg-white text-indigo-600 shadow-xs'
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
                    <h3 className="text-xs font-black text-gray-905 uppercase tracking-wider flex items-center gap-1 hover:text-indigo-600 transition-colors">
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
                  {/* Export Monthly Performance Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportMonthlyPerformancePDF();
                    }}
                    disabled={isExportingPDF}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-[9px] font-bold transition-all cursor-pointer font-sans shadow-sm flex items-center gap-1"
                    title="Export Monthly Performance as PDF"
                  >
                    <FileText className="w-3 h-3" />
                    {isExportingPDF ? 'Exporting...' : 'Export PDF'}
                  </button>

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
                  {/* Export Asset P&L Button */}
                  <button
                    onClick={exportAssetProfitLossPDF}
                    disabled={isExportingPDF}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-[9px] font-bold transition-all cursor-pointer font-sans shadow-sm flex items-center gap-1"
                    title="Export Asset P&L as PDF"
                  >
                    <FileText className="w-3 h-3" />
                    {isExportingPDF ? 'Exporting...' : 'Export PDF'}
                  </button>

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
                      <th className="py-2 px-2 text-right text-orange-600">Maintenance</th>
                      <th className="py-2 px-2 text-right text-rose-600">Insurance</th>
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
                        const carMaintenance = (car.serviceLogs || []).reduce((sum, log) => sum + log.cost, 0);
                        // Calculate total insurance expenditure
                        const carInsurance = (car.insuranceLogs || []).reduce((sum, log) => sum + log.amount, 0);
                        // Total expenditure (maintenance + insurance)
                        const carExpenditure = carMaintenance + carInsurance;
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
                          <td className="py-2 px-2 text-right font-mono font-bold text-orange-500">
                            zmk {carMaintenance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-rose-500">
                            zmk {carInsurance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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

              <div className="flex items-center gap-2">
                {/* Export Submission Ledger Button */}
                <button
                  onClick={exportSubmissionLedgerPDF}
                  disabled={isExportingPDF}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg text-[9px] font-bold transition-all cursor-pointer font-sans shadow-sm flex items-center gap-1"
                  title="Export Submission Ledger as PDF"
                >
                  <FileText className="w-3 h-3" />
                  {isExportingPDF ? 'Exporting...' : 'Export PDF'}
                </button>

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
                  <th className="py-2 px-3 text-right border-r border-gray-200 text-orange-600 font-sans">Maintenance</th>
                  <th className="py-2 px-3 text-right border-r border-gray-200 text-rose-600 font-sans">Insurance</th>
                  <th className="py-2 px-3 text-right font-sans">Net Yield</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cars.map(car => {
                  const carRevenue = (car.revenueLogs || []).reduce((sum, r) => sum + r.amount, 0);
                  const carMaintenance = (car.serviceLogs || []).reduce((sum, log) => sum + log.cost, 0);
                  const carInsurance = (car.insuranceLogs || []).reduce((sum, log) => sum + log.amount, 0);
                  const carExpenditure = carMaintenance + carInsurance;
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
                      <td className="py-2 px-3 text-right font-mono font-bold text-orange-600 border-r border-gray-200">
                        zmk {carMaintenance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 border-r border-gray-200">
                        zmk {carInsurance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
