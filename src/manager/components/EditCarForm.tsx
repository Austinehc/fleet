import { useState } from 'react';
import { CarAsset, Driver, InsuranceLog } from '../../types';

const downloadCsvReport = (filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) => {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map((value) => {
      const normalized = value === null || value === undefined ? '' : String(value);
      if (normalized.includes(',') || normalized.includes('"') || normalized.includes('\n')) {
        return `"${normalized.replace(/"/g, '""')}"`;
      }
      return normalized;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
import { formatDate } from '../../lib/dateFormat';
import { 
  Wrench, 
  User, 
  Settings, 
  Mail, 
  Phone, 
  Plus, 
  ShieldCheck, 
  Gauge, 
  Check, 
  Upload,
  Camera,
  FileText
} from 'lucide-react';
import { validatePlateNumber } from '../../lib/validation';

interface EditCarFormProps {
  car: CarAsset;
  drivers: Driver[];
  onSave: (updatedCar: CarAsset, newAssignedDriverId: string | null) => void;
  onClose: () => void;
}

export default function EditCarForm({
  car,
  drivers,
  onSave,
  onClose
}: EditCarFormProps) {
  // Navigation tabs for the asset detailed modal
  const [activeTab, setActiveTab] = useState<'specs_driver' | 'maintenance' | 'edit_props'>('specs_driver');
  
  // Sub-tabs for maintenance section
  const [maintenanceSubTab, setMaintenanceSubTab] = useState<'maintenance' | 'insurance'>('maintenance');

  // Specs attributes editing state
  const [editCarMake, setEditCarMake] = useState(car.make);
  const [editCarModel, setEditCarModel] = useState(car.model);
  const [editCarYear, setEditCarYear] = useState(car.year);
  const [editCarPlate, setEditCarPlate] = useState(car.plateNumber);
  const [editCarColor, setEditCarColor] = useState(car.color);
  const [editCarMileage, setEditCarMileage] = useState(car.mileage);
  const [editCarStatus, setEditCarStatus] = useState<CarAsset['status']>(car.status);

  // Picture state
  const [editCarPhoto, setEditCarPhoto] = useState<string>(car.photos?.[0] || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [receiptModalUrl, setReceiptModalUrl] = useState<string>('');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  
  // Export loading state
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Assigned driver
  const currentAssignedDriver = drivers.find(d => d.assignedCarId === car.id);
  const [editAssignedDriverId, setEditAssignedDriverId] = useState<string | null>(currentAssignedDriver?.id || null);

  // Mini new insurance log form inside modal
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [logCategory, setLogCategory] = useState<InsuranceLog['type']>('Road Tax');
  const [logDescription, setLogDescription] = useState('');
  const [logCost, setLogCost] = useState<number>(0);
  const [logExpiryDate, setLogExpiryDate] = useState<string>('');
  const [logPerformedBy, setLogPerformedBy] = useState(currentAssignedDriver?.fullName || 'Manager Admin');

  // Handle vehicle asset picture file reader
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds the 5MB safety limit.');
        return;
      }
      setIsUploadingPhoto(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const { uploadToCloudinary, isCloudinaryConfigured } = await import('../../lib/cloudinary');
          if (isCloudinaryConfigured()) {
            const uploadedUrl = await uploadToCloudinary(base64);
            setEditCarPhoto(uploadedUrl);
          } else {
            setEditCarPhoto(base64);
          }
        } catch (err) {
          console.error(err);
          setEditCarPhoto(base64); // Fallback to raw base64
        } finally {
          setIsUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Log new insurance event
  const handleAddMaintenanceLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logDescription.trim() || logCost <= 0 || !logExpiryDate) {
      alert('Please fill out all required fields including expiry date.');
      return;
    }

    const newLog: InsuranceLog = {
      id: `ins-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: new Date().toISOString().split('T')[0] || '',
      type: logCategory,
      amount: Number(logCost),
      expiryDate: logExpiryDate,
      description: logDescription.trim(),
      performedBy: logPerformedBy.trim()
    };

    const updatedLogs = [newLog, ...(car.insuranceLogs || [])];

    // Build the updated car model
    const updatedCar: CarAsset = {
      ...car,
      insuranceLogs: updatedLogs
    };

    onSave(updatedCar, editAssignedDriverId);
    setLogDescription('');
    setLogCost(0);
    setLogExpiryDate('');
    setIsAddingLog(false);
  };

  // Master Save Form Trigger
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCarMake.trim() || !editCarModel.trim() || !editCarPlate.trim() || !editCarColor.trim()) {
      alert('Please fill out all mandatory fields tagged with an asterisk.');
      return;
    }

    const plateValidation = validatePlateNumber(editCarPlate);
    if (!plateValidation.valid) {
      alert(plateValidation.error!);
      return;
    }

    const updatedCar: CarAsset = {
      ...car,
      make: editCarMake.trim(),
      model: editCarModel.trim(),
      year: Number(editCarYear),
      plateNumber: plateValidation.value!,
      color: editCarColor.trim(),
      mileage: Number(editCarMileage) || 0,
      status: editCarStatus,
      photos: editCarPhoto ? [editCarPhoto] : []
    };

    onSave(updatedCar, editAssignedDriverId);
  };

  const exportMaintenanceLogsCSV = async (car: CarAsset) => {
    setIsExportingPDF(true);
    try {
      const rows = (car.serviceLogs || []).map(log => [
        formatDate(log.date),
        log.category,
        log.description,
        log.mileage.toLocaleString(),
        log.performedBy,
        log.cost.toFixed(2)
      ]);

      downloadCsvReport(
        `${car.plateNumber}_Maintenance_History_${new Date().toISOString().split('T')[0]}.csv`,
        ['Date', 'Category', 'Description', 'Mileage', 'Performed By', 'Cost (ZMK)'],
        rows
      );
    } catch (error) {
      console.error('CSV export error:', error);
      alert('Failed to export maintenance history. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in" id="edit-car-modal">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-gray-150 overflow-hidden shadow-2xl flex flex-col md:flex-row h-auto md:h-[min(600px,88vh)] max-h-[90vh]" id="edit-car-modal-box">
        
        {/* Left Info Panel Bar & tabs list */}
        <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-gray-150 flex flex-col justify-between" id="modal-side-bar">
          <div className="p-5 flex-1 flex flex-col justify-between">
            <div className="text-left">
              <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg inline-block">
                Fleet Asset Inspector
              </span>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mt-2">{car.make} {car.model}</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{car.plateNumber}</p>

              {/* Picture Segment */}
              <div className="my-4 relative group border border-slate-200 rounded-xl overflow-hidden shadow-2xs h-32 bg-slate-100">
                {editCarPhoto ? (
                  <img src={editCarPhoto} alt="Snapshot Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-[10px]">
                    <Camera className="w-6 h-6 text-slate-300" />
                    <span className="mt-1 uppercase tracking-wider font-extrabold text-[8px]">No Photo Ready</span>
                  </div>
                )}
                <label className="absolute inset-0 bg-black/45 backdrop-blur-3xs flex flex-col items-center justify-center text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer select-none">
                  <Upload className="w-4 h-4 mb-1 animate-bounce" />
                  <span>{isUploadingPhoto ? 'Uploading...' : 'Replace Photo'}</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Vertical Tab switches */}
            <div className="space-y-1.5" id="inspector-tabs-switch text-left">
              <button
                type="button"
                onClick={() => setActiveTab('specs_driver')}
                className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all text-left ${
                  activeTab === 'specs_driver' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-505/10' 
                    : 'text-gray-500 hover:bg-slate-100/80 hover:text-gray-800'
                }`}
              >
                <span>Specs & Assigned Driver</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('maintenance')}
                className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all text-left ${
                  activeTab === 'maintenance' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-505/10' 
                    : 'text-gray-500 hover:bg-slate-100/80 hover:text-gray-800'
                }`}
              >
                <Wrench className="w-4 h-4 shrink-0" />
                <span>Maintenance & Insurance</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('edit_props')}
                className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all text-left ${
                  activeTab === 'edit_props' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-505/10' 
                    : 'text-gray-500 hover:bg-slate-100/80 hover:text-gray-800'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Edit Properties</span>
              </button>
            </div>
          </div>

          <div className="p-4 border-t border-gray-150 text-[9px] text-slate-400 select-none text-left bg-slate-100/50">
            Inspector Session: <span className="font-mono text-indigo-600 font-bold">ACTIVE</span>
          </div>
        </div>

        {/* Dynamic Panel Content Area */}
        <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden" id="inspector-workspace-sub">
          
          <div className="p-4.5 border-b border-gray-150 flex items-center justify-between" id="inspector-body-hdr">
            <div className="text-left">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Active View</span>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mt-0.5">
                {activeTab === 'specs_driver' && 'Vehicle Specs & Staff Driver'}
                {activeTab === 'maintenance' && 'Maintenance & Insurance Records'}
                {activeTab === 'edit_props' && 'Edit Asset Registration & Parameters'}
              </h4>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-2 rounded-xl text-xs font-bold border border-transparent hover:border-gray-150 transition-colors cursor-pointer"
              id="btn-close-edit-car-modal-inspect"
            >
              ✕ Close
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto" id="inspect-dynamic-container">
            
            {/* TAB 1: Specs & Driver */}
            {activeTab === 'specs_driver' && (
              <div className="space-y-6 text-left animate-fade-in" id="panel-specs-driver">
                
                {/* Visual Specifications Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5" id="specs-visual-metrics">
                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Manufacturing Year</span>
                    <span className="text-xs font-mono font-bold text-slate-800 block mt-1">{car.year} Year</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Odometer</span>
                    <span className="text-xs font-mono font-bold text-slate-800 block mt-1 flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-indigo-505 shrink-0" />
                      {car.mileage.toLocaleString()} km
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Body Color</span>
                    <span className="text-xs font-bold text-slate-800 block mt-1 uppercase">{car.color}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Operational Status</span>
                    <span className="mt-1 block">
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        car.status === 'Available' ? 'bg-emerald-100 text-emerald-800' :
                        car.status === 'Assigned' ? 'bg-indigo-100 text-indigo-800' :
                        car.status === 'Maintenance' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {car.status}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Assigned Driver detailed section */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5" id="assigned-driver-view">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5 font-sans select-none">
                    <User className="w-4 h-4 text-indigo-600" />
                    Staff Driver Assignment Details
                  </h4>

                  {currentAssignedDriver ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" id="driver-details-inspector">
                      <div className="flex items-center gap-3.5">
                        {currentAssignedDriver.profilePicture ? (
                          <img
                            src={currentAssignedDriver.profilePicture}
                            alt={currentAssignedDriver.fullName}
                            className="w-14 h-14 rounded-full border border-gray-200 object-cover shrink-0 block"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-550 border border-indigo-150 font-bold text-sm uppercase shrink-0">
                            {currentAssignedDriver.fullName.substring(0, 2)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-slate-900 text-xs sm:text-sm font-sans">{currentAssignedDriver.fullName}</h5>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                              currentAssignedDriver.status === 'Active' ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'
                            }`}>
                              {currentAssignedDriver.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium font-sans flex items-center mt-1 flex-wrap gap-x-2 gap-y-0.5">
                            <span className="bg-indigo-50 border border-indigo-10/50 text-[9px] font-mono px-1.5 py-0.5 rounded text-indigo-700">Lic: {currentAssignedDriver.licenseNumber}</span>
                            <span className="bg-slate-100 border border-slate-15/50 text-[9px] font-mono px-1.5.5 rounded text-slate-600">NRC: {currentAssignedDriver.nrcNumber}</span>
                          </div>
                        </div>
                      </div>

                      {/* Contact metadata */}
                      <div className="text-[10px] space-y-1 bg-white border border-slate-200 p-3 rounded-xl sm:min-w-[180px] text-left" id="driver-contact-meta">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-700 font-medium truncate max-w-[160px]">{currentAssignedDriver.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-705 font-mono font-bold">{currentAssignedDriver.phone}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-white border border-dashed border-gray-150 rounded-xl" id="driver-unassigned-placeholder">
                      <User className="w-8 h-8 text-gray-200 mx-auto" />
                      <p className="text-[10px] text-gray-400 italic mt-1.5">No staff driver is currently assigned as operator for this vehicle asset.</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('edit_props')}
                        className="mt-3.5 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-120 text-indigo-700 font-bold rounded-lg text-[9px] transition-colors cursor-pointer uppercase tracking-wider font-sans select-none"
                      >
                        Assign Driver Now
                      </button>
                    </div>
                  )}
                </div>

                {/* System Registry Log metadata */}
                <div className="border border-slate-100 p-4 rounded-xl flex items-center justify-between text-left text-[10px]" id="sys-metadata-row">
                  <span className="text-slate-400 flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Internal Registry Compliance Verified</span>
                  <span className="text-slate-400">Created: <b className="font-mono text-slate-650">{formatDate(car.createdAt)}</b></span>
                </div>

              </div>
            )}

            {/* TAB 2: Maintenance & Insurance Logs */}
            {activeTab === 'maintenance' && (
              <div className="space-y-6 text-left animate-fade-in" id="panel-maintenance">
                
                {/* Sub-tabs for Maintenance and Insurance */}
                <div className="border-b border-gray-150">
                  <div className="flex space-x-8" id="maintenance-sub-tabs">
                    <button
                      type="button"
                      onClick={() => setMaintenanceSubTab('maintenance')}
                      className={`py-3 px-1 text-sm font-bold border-b-2 transition-all ${
                        maintenanceSubTab === 'maintenance'
                          ? 'text-indigo-600 border-indigo-600'
                          : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        Maintenance History
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaintenanceSubTab('insurance')}
                      className={`py-3 px-1 text-sm font-bold border-b-2 transition-all ${
                        maintenanceSubTab === 'insurance'
                          ? 'text-indigo-600 border-indigo-600'
                          : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        Insurance & Compliance
                      </div>
                    </button>
                  </div>
                </div>

                {/* Maintenance Sub-tab Content */}
                {maintenanceSubTab === 'maintenance' && (
                  <div className="space-y-6" id="maintenance-content">
                    {/* Maintenance Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="maintenance-summary-widgets">
                      <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl">
                        <span className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider">Total Maintenance Cost</span>
                        <span className="text-lg font-black font-mono text-orange-600 block mt-1">zmk {(car.serviceLogs || []).reduce((sum, log) => sum + log.cost, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl">
                        <span className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider">Total Records</span>
                        <span className="text-lg font-black font-mono text-indigo-600 block mt-1">{(car.serviceLogs || []).length} Records</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl">
                        <span className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider">Last Service</span>
                        <span className="text-sm font-black font-mono text-slate-600 block mt-1">
                          {(() => {
                            const logs = car.serviceLogs || [];
                            return logs.length > 0 && logs[0] 
                              ? formatDate(logs[0].date)
                              : 'No services';
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Maintenance History */}
                    <div className="space-y-3" id="maintenance-logs-registry-box">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">Maintenance History ({(car.serviceLogs || []).length})</h4>
                        {(car.serviceLogs || []).length > 0 && (
                          <button
                            onClick={() => exportMaintenanceLogsCSV(car)}
                            disabled={isExportingPDF}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-[9px] font-bold transition-all cursor-pointer uppercase flex items-center gap-1 shadow-sm select-none"
                            title="Export Maintenance Logs as CSV"
                          >
                            {isExportingPDF ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Exporting...
                              </>
                            ) : (
                              <>
                                <FileText className="w-3 h-3" />
                                Export CSV
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      
                      {(car.serviceLogs || []).length > 0 ? (
                        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto border border-slate-150 rounded-xl px-4 bg-white" id="maintenance-logs-sub-ledger">
                          {(car.serviceLogs || []).slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log) => (
                            <div key={log.id} className="py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b last:border-b-0 gap-2.5" id={`maintenance-item-${log.id}`}>
                              <div className="text-left font-sans flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded leading-none ${
                                      log.category === 'Maintenance' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                      log.category === 'Repair' ? 'bg-red-50 text-red-700 border border-red-100' :
                                      log.category === 'Inspection' ? 'bg-green-50 text-green-700 border border-green-100' :
                                      log.category === 'Tire Service' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                      log.category === 'Oil Change' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                      'bg-gray-50 text-gray-700 border border-gray-100'
                                    }`}>
                                      {log.category}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReceiptModalUrl(log.receiptUrl || '');
                                        setIsReceiptModalOpen(true);
                                      }}
                                      className="text-[8px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                    >
                                      View receipt
                                    </button>
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-400 font-bold">{formatDate(log.date)}</span>
                                </div>
                                <p className="text-xs font-bold text-slate-800 mt-1.5 line-clamp-2">{log.description}</p>
                                <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-1 font-sans">
                                  <span>Mileage: <b className="font-mono text-slate-605">{log.mileage.toLocaleString()} km</b></span>
                                  <span>|</span>
                                  <span>By: <b className="text-slate-605">{log.performedBy || 'Unknown'}</b></span>
                                </div>
                                {/* Only 'View receipt' button is shown; inline 'Receipt attached' badge removed */}
                              </div>

                              <div className="text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-dashed border-gray-100 pt-2 sm:pt-0">
                                <span className="text-[9px] uppercase font-bold text-slate-400 sm:hidden">Cost:</span>
                                <span className="text-xs font-mono font-black text-orange-605 bg-orange-50 border border-orange-100 px-2 py-1 rounded-lg">
                                  zmk {log.cost.toLocaleString('en-US', { minimumFractionDigits: 1 })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-12 text-center bg-slate-50 border border-dashed border-gray-150 rounded-xl" id="maintenance-empty-slate">
                          <Wrench className="w-10 h-10 text-gray-200 mx-auto" />
                          <p className="text-xs text-gray-400 italic mt-2">No maintenance records have been logged for this vehicle.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Insurance Sub-tab Content */}
                {maintenanceSubTab === 'insurance' && (
                  <div className="space-y-6" id="insurance-content">
                    {/* Insurance Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="insurance-summary-widgets">
                      <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl">
                        <span className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider">Total Insurance </span>
                        <span className="text-lg font-black font-mono text-rose-600 block mt-1">zmk {(car.insuranceLogs || []).reduce((sum, log) => sum + log.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl">
                        <span className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider">Insurance Records</span>
                        <span className="text-lg font-black font-mono text-indigo-600 block mt-1">{(car.insuranceLogs || []).length} Records</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl">
                        <span className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider">Next Expiry</span>
                        <span className="text-sm font-black font-mono text-amber-600 block mt-1">
                          {(() => {
                            const nextExpiry = (car.insuranceLogs || [])
                              .map(log => new Date(log.expiryDate))
                              .filter(date => date > new Date())
                              .sort((a, b) => a.getTime() - b.getTime())[0];
                            return nextExpiry ? formatDate(nextExpiry) : 'No upcoming';
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Interactive log new insurance/compliance event */}
                    <div className="border border-indigo-150 bg-indigo-50/20 rounded-2xl p-4.5" id="quick-service-log">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-[10px] uppercase font-black tracking-wider text-indigo-700">Add Insurance</h5>
                          <p className="text-[10px] text-slate-400 mt-0.5">Record insurance payments, road tax, fitness certificates, and compliance documents.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddingLog(!isAddingLog)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[9px] transition-colors cursor-pointer uppercase flex items-center gap-1 shadow-sm select-none"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {isAddingLog ? 'Collapse Form' : 'Log Compliance'}
                        </button>
                      </div>

                      {isAddingLog && (
                        <form onSubmit={handleAddMaintenanceLog} className="mt-4 pt-4 border-t border-indigo-10/40 grid grid-cols-1 md:grid-cols-2 gap-3.5 text-left animate-fade-in" id="inspect-maint-form">
                          <div>
                            <label className="block text-[9px] font-extrabold text-slate-450 uppercase mb-1">Insurance/Compliance Type</label>
                            <select
                              value={logCategory}
                              onChange={(e) => setLogCategory(e.target.value as any)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                            >
                              <option value="Road Tax">Road Tax</option>
                              <option value="Insurance">Vehicle Insurance</option>
                              <option value="Fitness">Fitness Certificate</option>
                              <option value="Identity">Vehicle Identity/Registration</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-extrabold text-slate-450 uppercase mb-1">Expiry Date</label>
                            <input
                              type="date"
                              required
                              value={logExpiryDate}
                              onChange={(e) => setLogExpiryDate(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-705 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-extrabold text-slate-450 uppercase mb-1">Payment Amount (zmk)</label>
                            <input
                              type="number"
                              required
                              min="0"
                              placeholder="e.g. 1500"
                              value={logCost === 0 ? '' : logCost}
                              onChange={(e) => setLogCost(Number(e.target.value))}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-705 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-extrabold text-slate-450 uppercase mb-1">Processed By</label>
                            <input
                              type="text"
                              required
                              value={logPerformedBy}
                              onChange={(e) => setLogPerformedBy(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[9px] font-extrabold text-slate-450 uppercase mb-1">Description / Notes</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Annual insurance renewal - comprehensive coverage"
                              value={logDescription}
                              onChange={(e) => setLogDescription(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-505"
                            />
                          </div>
                          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                            <button
                              type="submit"
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[9px] transition-colors cursor-pointer uppercase shadow-xs flex items-center gap-1 select-none"
                            >
                              <Check className="w-3.5 h-3.5" /> Log Compliance Record
                            </button>
                          </div>
                        </form>
                      )}
                        </div>

                    {/* Insurance & Compliance Records */}
                    <div className="space-y-3" id="insurance-logs-registry-box">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">Insurance & Compliance Registry ({(car.insuranceLogs || []).length})</h4>
                      
                      {(car.insuranceLogs || []).length > 0 ? (
                        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto border border-slate-150 rounded-xl px-4 bg-white" id="insurance-logs-sub-ledger">
                          {(car.insuranceLogs || []).slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log) => (
                            <div key={log.id} className="py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b last:border-b-0 gap-2.5" id={`insurance-item-${log.id}`}>
                              <div className="text-left font-sans flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded leading-none ${
                                    log.type === 'Insurance' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                    log.type === 'Road Tax' ? 'bg-green-50 text-green-700 border border-green-100' :
                                    log.type === 'Fitness' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                    'bg-purple-50 text-purple-700 border border-purple-100'
                                  }`}>
                                    {log.type}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400 font-bold">{formatDate(log.date)}</span>
                                </div>
                                <p className="text-xs font-bold text-slate-800 mt-1.5 line-clamp-2">{log.description}</p>
                                <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-1 font-sans">
                                  <span>Expires: <b className={`font-mono ${new Date(log.expiryDate) < new Date() ? 'text-red-600' : new Date(log.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-amber-600' : 'text-green-600'}`}>
                                    {formatDate(log.expiryDate)}
                                  </b></span>
                                  <span>|</span>
                                  <span>By: <b className="text-slate-605">{log.performedBy || 'Unknown'}</b></span>
                                </div>
                              </div>

                              <div className="text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-dashed border-gray-100 pt-2 sm:pt-0">
                                <span className="text-[9px] uppercase font-bold text-slate-400 sm:hidden">Cost:</span>
                                <span className="text-xs font-mono font-black text-rose-605 bg-rose-50 border border-rose-100 px-2 py-1 rounded-lg">
                                  zmk {log.amount.toLocaleString('en-US', { minimumFractionDigits: 1 })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-12 text-center bg-slate-50 border border-dashed border-gray-150 rounded-xl" id="insurance-empty-slate">
                          <ShieldCheck className="w-10 h-10 text-gray-200 mx-auto" />
                          <p className="text-xs text-gray-400 italic mt-2">No insurance or compliance records have been logged for this vehicle.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB 3: Edit Form Fields */}
            {activeTab === 'edit_props' && (
              <form onSubmit={handleSubmit} className="space-y-4 text-left animate-fade-in" id="panel-form-fields">
                <div className="grid grid-cols-2 gap-4" id="edit-car-specs-grid">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Vehicle Make*</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ford"
                      value={editCarMake}
                      onChange={(e) => setEditCarMake(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 font-medium"
                      id="edit-input-car-make"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Vehicle Model*</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. F-150 Lightning"
                      value={editCarModel}
                      onChange={(e) => setEditCarModel(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 font-medium"
                      id="edit-input-car-model"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Manufacturing Year*</label>
                    <input
                      type="number"
                      required
                      min="1990"
                      max={new Date().getFullYear() + 1}
                      value={editCarYear}
                      onChange={(e) => setEditCarYear(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 font-medium"
                      id="edit-input-car-year"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">License Plate Number*</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. NY-44X8"
                      value={editCarPlate}
                      onChange={(e) => {
                        const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
                        const compact = cleaned.replace(/\s/g, '').slice(0, 7);
                        setEditCarPlate(compact.length > 3 ? `${compact.slice(0, 3)} ${compact.slice(3)}` : compact);
                      }}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-gray-900 font-medium uppercase text-center"
                      id="edit-input-car-plate"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Body Exterior Color*</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pearl Silver"
                      value={editCarColor}
                      onChange={(e) => setEditCarColor(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 font-medium"
                      id="edit-input-car-color"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Odometer (km)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 12000"
                      value={editCarMileage || ''}
                      onChange={(e) => {
                        const newMileage = Number(e.target.value);
                        if (newMileage < car.mileage) {
                          alert(`Odometer cannot be less than current value (${car.mileage.toLocaleString()} km).`);
                          return;
                        }
                        setEditCarMileage(newMileage);
                      }}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 font-medium font-mono"
                      id="edit-input-car-miles"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Operational Status*</label>
                    <select
                      value={editCarStatus}
                      onChange={(e) => {
                        const statusVal = e.target.value as CarAsset['status'];
                        setEditCarStatus(statusVal);
                      }}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 font-medium font-sans"
                      id="edit-input-car-status"
                    >
                      <option value="Available">Available</option>
                      <option value="Assigned">Assigned</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Out of Service">Out of Service</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Assigned Staff Driver</label>
                    <select
                      value={editAssignedDriverId || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const chosenId = val === '' ? null : val;
                        setEditAssignedDriverId(chosenId);
                        if (chosenId) {
                          setEditCarStatus('Assigned');
                        } else if (editCarStatus === 'Assigned') {
                          setEditCarStatus('Available');
                        }
                      }}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-505 text-gray-900 font-medium font-sans"
                      id="edit-input-car-driver"
                    >
                      <option value="">-- No Driver Assigned (DE-ASSIGN) --</option>
                      {currentAssignedDriver && (
                        <option value={currentAssignedDriver.id}>
                          {currentAssignedDriver.fullName} (Current)
                        </option>
                      )}
                      {drivers
                        .filter(d => d.id !== currentAssignedDriver?.id && !d.assignedCarId)
                        .map(d => (
                          <option key={d.id} value={d.id}>
                            {d.fullName} ({d.status})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-150 flex items-center justify-end gap-3" id="edit-car-actions">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-600 transition-colors cursor-pointer"
                    id="btn-edit-car-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-indigo-500/10 transition-all cursor-pointer font-sans select-none"
                    id="btn-edit-car-submit"
                  >
                    Save Vehicle Changes
                  </button>
                </div>
              </form>
            )}

          </div>

        </div>

      </div>

      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/20 backdrop-blur-[2px] flex items-center justify-center p-4" id="receipt-viewer-overlay">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_24px_90px_-30px_rgba(15,23,42,0.45)] max-w-3xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white/95">
              <div>
                <p className="text-sm font-bold text-slate-900">Maintenance Receipt</p>
                <p className="text-[11px] text-slate-500">View the attached receipt image for this maintenance log.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReceiptModalUrl('');
                  setIsReceiptModalOpen(false);
                }}
                className="text-slate-500 hover:text-slate-900 rounded-full border border-slate-200 bg-white px-2 py-1 text-sm transition-colors shadow-sm"
                aria-label="Close receipt viewer"
              >
                ×
              </button>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-white flex flex-col items-center justify-center min-h-[260px] p-4 gap-3">
              {receiptModalUrl ? (
                <div className="w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                  <img src={receiptModalUrl} alt="Maintenance receipt preview" className="max-h-[65vh] w-full object-contain rounded-xl" referrerPolicy="no-referrer" />
                </div>
              ) : (
                <div className="text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200 px-8 py-10 shadow-sm">
                  <p className="text-lg font-semibold text-slate-700">No receipt attached</p>
                  <p className="text-sm text-slate-400 mt-2">This maintenance log has no receipt image available.</p>
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-slate-200 text-right bg-white/95">
              <button
                type="button"
                onClick={() => {
                  setReceiptModalUrl('');
                  setIsReceiptModalOpen(false);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

