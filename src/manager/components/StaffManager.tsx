import { useState } from 'react';
import { User, Edit, Trash2, Key, RefreshCw, Search, Phone, Mail, Check, Car, FileText } from 'lucide-react';
import { Driver, CarAsset } from '../../types';
import { formatDate } from '../../lib/dateFormat';

interface StaffManagerProps {
  drivers: Driver[];
  cars: CarAsset[];
  onEditDriver: (driver: Driver) => void;
  onDeleteDriver: (driverId: string) => void;
  onUpdateDriver: (updatedDriver: Driver) => void;
  onRegisterDriverClick: () => void;
}

export default function StaffManager({
  drivers,
  cars,
  onEditDriver,
  onDeleteDriver,
  onUpdateDriver,
  onRegisterDriverClick
}: StaffManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'On Leave' | 'Suspended' | 'Inactive'>('All');
  const [justRegeneratedCode, setJustRegeneratedCode] = useState<{ [key: string]: boolean }>({});
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleRegenerateCode = (driver: Driver) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Update the driver through proxy
    onUpdateDriver({
      ...driver,
      accessCode: code
    });

    // Provide temporary visual checkmark indicator
    setJustRegeneratedCode(prev => ({ ...prev, [driver.id]: true }));
    setTimeout(() => {
      setJustRegeneratedCode(prev => ({ ...prev, [driver.id]: false }));
    }, 2000);
  };

  // Export individual driver PDF
  const exportDriverPDF = async (driver: Driver) => {
    setIsExportingPDF(true);
    const assignedCar = cars.find(c => c.id === driver.assignedCarId);
    
    // Create a temporary DOM element for PDF generation
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = `
      <div style="padding: 0.4in 0.3in; font-family: Arial, sans-serif; line-height: 1.5; width: 100%; max-width: 720px; margin: 0 auto; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 0.3in; margin-bottom: 0.3in;">
          <h1 style="color: #6366f1; margin: 0; font-size: 26px; font-weight: bold;">North Links Fleet Management</h1>
          <h2 style="color: #374151; margin: 0.15in 0 0 0; font-size: 18px;">Driver Profile Report</h2>
          <p style="color: #6b7280; margin: 0.1in 0 0 0; font-size: 11px;">Generated on ${formatDate(new Date())}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.2in; margin-bottom: 0.3in;">
          <div style="background: #f8fafc; padding: 0.2in; border-radius: 6px; border: 1px solid #e2e8f0;">
            <h4 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.08in; margin: 0 0 0.15in 0; font-size: 13px; font-weight: bold;">Driver Information</h4>
            <p style="margin: 0.08in 0; font-size: 11px;"><strong>Name:</strong> ${driver.fullName}</p>
            <p style="margin: 0.08in 0; font-size: 11px;"><strong>License:</strong> ${driver.licenseNumber}</p>
            <p style="margin: 0.08in 0; font-size: 11px;"><strong>NRC:</strong> ${driver.nrcNumber}</p>
            <p style="margin: 0.08in 0; font-size: 11px;"><strong>Email:</strong> ${driver.email || 'Not provided'}</p>
            <p style="margin: 0.08in 0; font-size: 11px;"><strong>Phone:</strong> ${driver.phone || 'Not provided'}</p>
            <p style="margin: 0.08in 0; font-size: 11px;"><strong>Status:</strong> <span style="color: ${driver.status === 'Active' ? '#059669' : '#dc2626'}; font-weight: bold;">${driver.status}</span></p>
            <p style="margin: 0.08in 0; font-size: 11px;"><strong>Code:</strong> <span style="background: #f1f5f9; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-weight: bold;">${driver.accessCode || 'N/A'}</span></p>
          </div>
          
          <div style="background: #f0f9ff; padding: 0.2in; border-radius: 6px; border: 1px solid #bae6fd;">
            <h4 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.08in; margin: 0 0 0.15in 0; font-size: 13px; font-weight: bold;">Assigned Vehicle</h4>
            ${assignedCar ? `
              <p style="margin: 0.08in 0; font-size: 11px;"><strong>Vehicle:</strong> ${assignedCar.make} ${assignedCar.model} (${assignedCar.year})</p>
              <p style="margin: 0.08in 0; font-size: 11px;"><strong>Plate:</strong> <span style="background: #1e40af; color: white; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-weight: bold;">${assignedCar.plateNumber}</span></p>
              <p style="margin: 0.08in 0; font-size: 11px;"><strong>Color:</strong> ${assignedCar.color}</p>
              <p style="margin: 0.08in 0; font-size: 11px;"><strong>Mileage:</strong> ${assignedCar.mileage.toLocaleString()} km</p>
              <p style="margin: 0.08in 0; font-size: 11px;"><strong>Status:</strong> <span style="color: ${assignedCar.status === 'Available' ? '#059669' : '#6366f1'}; font-weight: bold;">${assignedCar.status}</span></p>
            ` : '<p style="color: #6b7280; font-style: italic; font-size: 11px;">No vehicle assigned</p>'}
          </div>
        </div>
        
        ${assignedCar && (assignedCar.serviceLogs?.length || 0) > 0 ? `
        <div style="page-break-before: always; break-before: page; padding: 0.4in 0; width: 100%; box-sizing: border-box; page-break-inside: avoid; break-inside: avoid;">
          <h3 style="color: #374151; border-bottom: 2px solid #6366f1; padding-bottom: 0.1in; margin: 0 0 0.2in 0; font-size: 14px; font-weight: bold;">Service History</h3>
          ${(assignedCar.serviceLogs || []).map(log => `
            <div style="border-left: 3px solid #f97316; padding-left: 0.15in; margin-bottom: 0.15in; background: #fffaf0; padding: 0.15in; border-radius: 4px;">
              <p style="margin: 0.05in 0; font-size: 11px;"><strong>${formatDate(log.date)}</strong> - <span style="color: #ea580c; font-weight: bold;">${log.category}</span></p>
              <p style="margin: 0.05in 0; font-size: 10px; color: #374151;">${log.description}</p>
              <p style="margin: 0.05in 0; font-size: 10px;"><strong>Cost:</strong> ZMK ${log.cost.toLocaleString()} | <strong>Mileage:</strong> ${log.mileage.toLocaleString()} km | <strong>By:</strong> ${log.performedBy}</p>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        <div style="margin-top: 0.3in; padding-top: 0.2in; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 10px;">
          <p style="margin: 0.05in 0;">Driver Profile Report</p>
          <p style="margin: 0.05in 0;">North Links Fleet Management System</p>
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
          filename: `Driver_${driver.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['tr'] }
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

  // Export all drivers PDF
  const exportAllDriversPDF = async () => {
    setIsExportingPDF(true);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = `
      <div style="padding: 0.4in 0.3in; font-family: Arial, sans-serif; width: 100%; max-width: 720px; margin: 0 auto; box-sizing: border-box; overflow: visible;">
        <div style="text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 0.2in; margin-bottom: 0.3in;">
          <h1 style="color: #6366f1; margin: 0; font-size: 26px; font-weight: bold;">North Links Fleet Management</h1>
          <h2 style="color: #374151; margin: 0.15in 0 0 0; font-size: 18px;">Complete Driver Registry</h2>
          <p style="color: #6b7280; margin: 0.1in 0 0 0; font-size: 11px;">Generated on ${formatDate(new Date())}</p>
        </div>

        ${drivers.map((driver, index) => {
          const assignedCar = cars.find(c => c.id === driver.assignedCarId);
          return `
            <div style="margin-bottom: 0.2in; padding: 0.15in; border: 1px solid #e2e8f0; border-radius: 6px; background: #ffffff; ${index > 0 ? 'page-break-before: always; break-before: page; padding-top: 0.5in;' : ''}; page-break-inside: avoid; break-inside: avoid; overflow: visible;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.15in;">
                <div style="flex: 1;">
                  <h3 style="margin: 0; font-size: 14px; color: #111827; font-weight: bold;">${driver.fullName}</h3>
                  <p style="margin: 0.05in 0 0 0; font-size: 11px; color: #6b7280;"><strong>License:</strong> ${driver.licenseNumber} | <strong>NRC:</strong> ${driver.nrcNumber}</p>
                </div>
                <span style="color: ${driver.status === 'Active' ? '#059669' : driver.status === 'Suspended' ? '#dc2626' : '#6b7280'}; font-weight: bold; font-size: 11px; background: ${driver.status === 'Active' ? '#ecfdf5' : driver.status === 'Suspended' ? '#fef2f2' : '#f3f4f6'}; padding: 0.05in 0.1in; border-radius: 3px;">${driver.status}</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.15in; font-size: 11px; color: #374151;">
                <div style="background: #f8fafc; padding: 0.1in; border-radius: 4px;">
                  <p style="margin: 0.05in 0;"><strong>Email:</strong> ${driver.email || 'Not provided'}</p>
                  <p style="margin: 0.05in 0;"><strong>Phone:</strong> ${driver.phone || 'Not provided'}</p>
                  <p style="margin: 0.05in 0;"><strong>Code:</strong> <span style="font-family: monospace;">${driver.accessCode || 'N/A'}</span></p>
                </div>
                <div style="background: #f0f9ff; padding: 0.1in; border-radius: 4px;">
                  <p style="margin: 0.05in 0;"><strong>Vehicle:</strong> ${assignedCar ? `${assignedCar.make} ${assignedCar.model}` : 'Unassigned'}</p>
                  <p style="margin: 0.05in 0;"><strong>Plate:</strong> ${assignedCar ? `<span style=\"font-family: monospace;\">${assignedCar.plateNumber}</span>` : '—'}</p>
                  <p style="margin: 0.05in 0;"><strong>Mileage:</strong> ${assignedCar ? `${assignedCar.mileage.toLocaleString()} km` : '—'}</p>
                </div>
              </div>
            </div>
          `;
        }).join('')}
        
        <div style="margin-top: 0.3in; padding-top: 0.2in; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 10px;">
          <p style="margin: 0.05in 0;">Driver Registry Report — ${drivers.length} total drivers</p>
          <p style="margin: 0.05in 0;">North Links Fleet Management System</p>
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
          filename: `Fleet_Driver_Registry_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['tr'] }
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

  const filteredDrivers = drivers.filter(drv => {
    const matchesSearch =
      drv.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drv.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drv.nrcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (drv.email && drv.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (drv.phone && drv.phone.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || drv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6 text-left w-full" id="driver-management-tab-view">
      
      {/* Overview stats block / Top row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="staff-performance-metric-grid">
        <div className="bg-white border border-gray-200/80 p-4 rounded-2xl shadow-3xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Active Drivers</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{drivers.filter(d => d.status === 'Active').length}</p>
        </div>
        <div className="bg-white border border-gray-200/80 p-4 rounded-2xl shadow-3xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">On Leave</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{drivers.filter(d => d.status === 'On Leave').length}</p>
        </div>
        <div className="bg-white border border-gray-200/80 p-4 rounded-2xl shadow-3xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Suspended Access</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{drivers.filter(d => d.status === 'Suspended').length}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-3xs" id="driver-filters-panel">
        
        {/* Left Side: Search input */}
        <div className="relative w-full md:max-w-md" id="search-input-field-wrapper">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, licence, phone, email, NRC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-gray-200 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-gray-450 focus:outline-none transition-colors"
            id="driver-search-text-input"
          />
        </div>

        {/* Right Side: Status Filters switcher */}
        <div className="flex flex-wrap items-center gap-1.5 self-stretch md:self-auto justify-start md:justify-end" id="status-pill-list">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mr-2 font-sans self-center">Filter:</span>
          {(['All', 'Active', 'On Leave', 'Suspended', 'Inactive'] as const).map(pill_status => (
            <button
              key={pill_status}
              onClick={() => setStatusFilter(pill_status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans border ${
                statusFilter === pill_status
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {pill_status}
            </button>
          ))}
          
          {/* Export All Drivers Button */}
          <div className="ml-3 border-l border-gray-200 pl-3">
            <button
              onClick={exportAllDriversPDF}
              disabled={isExportingPDF}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all cursor-pointer font-sans shadow-3xs flex items-center gap-1.5"
              title="Export Complete Driver Registry as PDF"
              id="btn-export-all-drivers"
            >
              {isExportingPDF ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  Export All
                </>
              )}
            </button>
          </div>
        </div>

      </div>



      {/* Main Drivers List / Desk Cards */}
      {filteredDrivers.length === 0 ? (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-16 text-center shadow-3xs" id="empty-drivers-slate">
          <User className="w-12 h-12 text-slate-300 mx-auto animate-pulse mb-3" />
          <h4 className="font-bold text-slate-800 text-base">No Matching Staff Profiles</h4>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto leading-relaxed">
            There are no registered drivers that meet your current search query or status filter parameters. Adjust filters or register a new driver.
          </p>
          <button
            onClick={onRegisterDriverClick}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow cursor-pointer font-sans"
            id="btn-register-drv-empty-trigger"
          >
            Register Driver Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="drivers-managed-cards-grid">
          {filteredDrivers.map(drv => {
            const assignedCar = cars.find(c => c.id === drv.assignedCarId);
            
            return (
              <div
                key={drv.id}
                className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-3xs transition-transform hover:-translate-y-0.5 flex flex-col justify-between"
                id={`driver-card-${drv.id}`}
              >
                {/* Header Profile Section */}
                <div className="p-5 border-b border-gray-100 bg-gradient-to-b from-slate-50/60 to-white">
                  <div className="flex items-start gap-3.5">
                    
                    {drv.profilePicture ? (
                      <img
                        src={drv.profilePicture}
                        alt={drv.fullName}
                        className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-150 shadow-3xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-600 font-extrabold rounded-full flex items-center justify-center text-sm shrink-0 font-sans">
                        {drv.fullName.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}

                    <div className="flex-1 space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 justify-between">
                        <h4 className="font-bold text-slate-900 text-sm truncate font-sans">{drv.fullName}</h4>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-sans shrink-0 ${
                          drv.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          drv.status === 'On Leave' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          drv.status === 'Suspended' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                          'bg-gray-150 text-gray-700 border border-gray-200'
                        }`}>
                          {drv.status}
                        </span>
                      </div>
                      
                      {/* Sub-details */}
                      {assignedCar ? (
                        <div className="text-[10px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded inline-flex items-center gap-1 uppercase tracking-wide">
                          <Car className="w-3 h-3 text-indigo-500" />
                          <span>{assignedCar.plateNumber} ({assignedCar.make})</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic font-medium block">
                          No Vehicle Co-assigned
                        </span>
                      )}
                    </div>

                  </div>
                </div>

                {/* Information Parameters List */}
                <div className="p-5 space-y-3.5 text-xs text-gray-600 flex-1">
                  
                  {/* License & Identification */}
                  <div className="grid grid-cols-2 gap-2 border-b border-gray-100 pb-3 font-mono">
                    <div>
                      <span className="text-[9px] font-sans font-bold text-gray-400 uppercase block tracking-wider">Licence Number</span>
                      <span className="text-[11px] font-semibold text-slate-800 uppercase block mt-0.5 truncate">{drv.licenseNumber}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-sans font-bold text-gray-400 uppercase block tracking-wider">NRC Number</span>
                      <span className="text-[11px] font-semibold text-slate-800 uppercase block mt-0.5 truncate">{drv.nrcNumber || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="space-y-1.5 py-1">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-xs truncate">{drv.phone || 'No phone number provided'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-xs truncate">{drv.email || 'No email provided'}</span>
                    </div>
                  </div>

                  {/* Access Credentials Segment - Crucial for driver codes */}
                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-2 mt-4" id={`driver-creds-${drv.id}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1 font-sans">
                        <Key className="w-3 h-3 text-indigo-500" /> Secure Pin Code
                      </span>
                      <span className="text-[9px] text-gray-400 font-sans font-medium">6-character Key</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white border border-slate-205 py-2.5 px-3 rounded-lg text-center font-mono font-extrabold uppercase tracking-widest text-slate-855 text-sm shadow-3xs" id={`access-code-box-${drv.id}`}>
                        {drv.accessCode || 'CODE_ERR'}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleRegenerateCode(drv)}
                        className={`p-2.5 border rounded-lg transition-all text-center flex items-center justify-center shrink-0 cursor-pointer ${
                          justRegeneratedCode[drv.id]
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm'
                            : 'bg-white hover:bg-slate-100 border-slate-205 text-indigo-600 hover:text-indigo-700 hover:shadow-xs'
                        }`}
                        title="Regenerate New Access PIN Code"
                        id={`btn-regenerate-code-${drv.id}`}
                      >
                        {justRegeneratedCode[drv.id] ? (
                          <Check className="w-4 h-4 animate-scale" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 font-sans leading-normal">
                      Instruct driver to authenticate with the above code.
                    </p>
                  </div>

                </div>

                {/* Footer Controls Segment */}
                <div className="p-4 border-t border-gray-100 bg-slate-50/50 flex items-center justify-between gap-2 shrink-0">
                  <div className="text-[10px] text-slate-400 font-medium">
                    Added: {formatDate(drv.createdAt || '')}
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => exportDriverPDF(drv)}
                      disabled={isExportingPDF}
                      className="p-2 border border-slate-200 hover:bg-green-50/40 disabled:bg-gray-50 text-slate-600 hover:text-green-600 disabled:text-gray-400 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer"
                      title="Export Driver PDF Report"
                      id={`btn-export-pdf-${drv.id}`}
                    >
                      {isExportingPDF ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => onEditDriver(drv)}
                      className="p-2 border border-slate-200 hover:bg-indigo-50/40 text-slate-600 hover:text-indigo-600 rounded-xl transition-all cursor-pointer"
                      title="Edit Profile details"
                      id={`btn-edit-drv-${drv.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`WARNING: Are you sure you want to delete the driver log file and access keys for ${drv.fullName}?\n\nThis action cannot be undone.`)) {
                          onDeleteDriver(drv.id);
                        }
                      }}
                      className="p-2 border border-slate-250 hover:bg-rose-50 text-slate-650 hover:text-rose-650 rounded-xl transition-all cursor-pointer"
                      title="Delete Pilot account"
                      id={`btn-delete-drv-${drv.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
