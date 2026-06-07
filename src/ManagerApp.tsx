/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Car,
  User,
  Plus,
  Search,
  Wrench,
  Shield,
  FileText,
  Calendar,
  DollarSign,
  Gauge,
  Hash,
  UserCheck,
  Camera,
  Layers,
  SlidersHorizontal,
  Trash2,
  ChevronRight,
  Sparkles,
  Info,
  Clock,
  Briefcase,
  Smartphone,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Edit,
  TrendingUp,
  Coins,
  Check,
  Printer,
  FileDown
} from 'lucide-react';
import { CarAsset, Driver, ServiceLog, RevenueLog, FuelLog } from './types';
import { initialCars, initialDrivers } from './data';
import CameraCapture from './components/CameraCapture';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

interface ManagerAppProps {
  cars: CarAsset[];
  setCars: React.Dispatch<React.SetStateAction<CarAsset[]>>;
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  userRole?: 'manager' | 'driver';
  setUserRole?: (role: 'manager' | 'driver') => void;
}

export default function ManagerApp({
  cars,
  setCars,
  drivers,
  setDrivers,
  userRole = 'manager',
  setUserRole
}: ManagerAppProps) {
  // --- Core State Storage (Moved to Props) ---

  const [selectedCarId, setSelectedCarId] = useState<string | null>(initialCars[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // --- Dynamic Dashboard Modals/Forms State ---
  const [isAddingCar, setIsAddingCar] = useState(false);
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  // Form Temp states
  const [newCarPhoto, setNewCarPhoto] = useState<string>('');
  const [newCarMake, setNewCarMake] = useState('');
  const [newCarModel, setNewCarModel] = useState('');
  const [newCarYear, setNewCarYear] = useState(new Date().getFullYear());
  const [newCarPlate, setNewCarPlate] = useState('');
  const [newCarColor, setNewCarColor] = useState('');
  const [newCarVin, setNewCarVin] = useState('');
  const [newCarMileage, setNewCarMileage] = useState<number>(0);
  const [newCarStatus, setNewCarStatus] = useState<CarAsset['status']>('Available');
  
  // Service Log inside car add status
  const [includeInitialService, setIncludeInitialService] = useState(false);
  const [initialServiceCat, setInitialServiceCat] = useState<ServiceLog['category']>('Inspection');
  const [initialServiceDesc, setInitialServiceDesc] = useState('');
  const [initialServiceCost, setInitialServiceCost] = useState<number>(0);
  const [initialServiceBy, setInitialServiceBy] = useState('');

  // Driver Temp states
  const [newDrvName, setNewDrvName] = useState('');
  const [newDrvLicense, setNewDrvLicense] = useState('');
  const [newDrvNrc, setNewDrvNrc] = useState('');
  const [newDrvEmail, setNewDrvEmail] = useState('');
  const [newDrvPhone, setNewDrvPhone] = useState('');
  const [newDrvStatus, setNewDrvStatus] = useState<Driver['status']>('Active');
  const [newDrvAssignedCarId, setNewDrvAssignedCarId] = useState<string>('');
  const [newDrvPhoto, setNewDrvPhoto] = useState<string>('');

  // --- Driver & Vehicle Edit states ---
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editingCar, setEditingCar] = useState<CarAsset | null>(null);
  const [isManagingDrivers, setIsManagingDrivers] = useState(false);
  
  // userRole and setUserRole are received as props
  const [managerView, setManagerView] = useState<'fleet' | 'finance'>('fleet');
  const [financeTimeframe, setFinanceTimeframe] = useState<'all' | '7d' | '30d' | 'this_month' | 'last_month'>('all');
  const [financeAsset, setFinanceAsset] = useState<string>('all');
  const [financeCategory, setFinanceCategory] = useState<string>('all');
  const [financeStatus, setFinanceStatus] = useState<string>('all');
  const [financeSearch, setFinanceSearch] = useState<string>('');
  const [activeDriverId, setActiveDriverId] = useState<string>('');

  const [editDrvName, setEditDrvName] = useState('');
  const [editDrvLicense, setEditDrvLicense] = useState('');
  const [editDrvNrc, setEditDrvNrc] = useState('');
  const [editDrvEmail, setEditDrvEmail] = useState('');
  const [editDrvPhone, setEditDrvPhone] = useState('');
  const [editDrvStatus, setEditDrvStatus] = useState<Driver['status']>('Active');

  const [editCarMake, setEditCarMake] = useState('');
  const [editCarModel, setEditCarModel] = useState('');
  const [editCarYear, setEditCarYear] = useState<number>(new Date().getFullYear());
  const [editCarPlate, setEditCarPlate] = useState('');
  const [editCarMileage, setEditCarMileage] = useState<number>(0);
  const [editCarColor, setEditCarColor] = useState('');

  const startEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setEditDrvName(driver.fullName);
    setEditDrvNrc(driver.nrcNumber || '');
    setEditDrvLicense(driver.licenseNumber);
    setEditDrvEmail(driver.email);
    setEditDrvPhone(driver.phone);
    setEditDrvStatus(driver.status);
  };

  const startEditCar = (car: CarAsset) => {
    setEditingCar(car);
    setEditCarMake(car.make);
    setEditCarModel(car.model);
    setEditCarYear(car.year);
    setEditCarPlate(car.plateNumber);
    setEditCarMileage(car.mileage);
    setEditCarColor(car.color);
  };

  const handleSaveDriverEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    if (!editDrvName || !editDrvLicense || !editDrvNrc) {
      alert('Please fill out the Driver Name, NRC Number, and Licence details.');
      return;
    }

    setDrivers(prev =>
      prev.map(d =>
        d.id === editingDriver.id
          ? {
              ...d,
              fullName: editDrvName,
              nrcNumber: editDrvNrc.toUpperCase(),
              licenseNumber: editDrvLicense.toUpperCase(),
              email: editDrvEmail || 'notprovided@fleetcorp.com',
              phone: editDrvPhone || 'Unspecified',
              status: editDrvStatus,
            }
          : d
      )
    );
    setEditingDriver(null);
  };

  const handleSaveCarEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCar) return;
    if (!editCarMake || !editCarModel || !editCarPlate) {
      alert('Please fill out Vehicle Make, Model, and License Plate.');
      return;
    }

    // Check duplicate plate
    if (cars.some(c => c.id !== editingCar.id && c.plateNumber.trim().toUpperCase() === editCarPlate.trim().toUpperCase())) {
      alert(`License plate "${editCarPlate}" is already registered to another vehicle in the system.`);
      return;
    }

    setCars(prev =>
      prev.map(c =>
        c.id === editingCar.id
          ? {
              ...c,
              make: editCarMake,
              model: editCarModel,
              year: Number(editCarYear) || new Date().getFullYear(),
              plateNumber: editCarPlate.trim().toUpperCase(),
              mileage: Number(editCarMileage) || 0,
              color: editCarColor || 'Not Specified',
            }
          : c
      )
    );
    setEditingCar(null);
  };

  const handleCloseEditCarModal = () => {
    if (!editingCar) {
      setEditingCar(null);
      return;
    }
    const hasUnsavedChanges =
      editCarMake !== editingCar.make ||
      editCarModel !== editingCar.model ||
      Number(editCarYear) !== editingCar.year ||
      editCarPlate.trim().toUpperCase() !== editingCar.plateNumber.trim().toUpperCase() ||
      Number(editCarMileage) !== editingCar.mileage ||
      editCarColor !== editingCar.color;

    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to discard them?'
      );
      if (!confirmClose) return;
    }
    setEditingCar(null);
  };

  // Individual New Service Log Entry (inside Detail Panel)
  const [selectedLogCategory, setSelectedLogCategory] = useState<ServiceLog['category']>('Maintenance');
  const [selectedLogDate, setSelectedLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLogDesc, setSelectedLogDesc] = useState('');
  const [selectedLogCost, setSelectedLogCost] = useState<number>(0);
  const [selectedLogMiles, setSelectedLogMiles] = useState<number>(0);
  const [selectedLogBy, setSelectedLogBy] = useState('');
  const [showServiceLogForm, setShowServiceLogForm] = useState(false);

  // Individual New Revenue Log Entry & Period Filter
  const [activeDetailTab, setActiveDetailTab] = useState<'service' | 'finance' | 'fuel'>('service');
  const [selectedFuelDate, setSelectedFuelDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedFuelLiters, setSelectedFuelLiters] = useState<number>(0);
  const [selectedFuelCost, setSelectedFuelCost] = useState<number>(0);
  const [selectedFuelMileage, setSelectedFuelMileage] = useState<number>(0);
  const [showFuelLogForm, setShowFuelLogForm] = useState(false);

  const [selectedRevCategory, setSelectedRevCategory] = useState<RevenueLog['category']>('Rental');
  const [selectedRevDate, setSelectedRevDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRevDesc, setSelectedRevDesc] = useState('');
  const [selectedRevAmount, setSelectedRevAmount] = useState<number>(0);
  const [selectedRevDriverId, setSelectedRevDriverId] = useState<string>('');
  const [showRevenueLogForm, setShowRevenueLogForm] = useState(false);
  const [selectedFinancePeriod, setSelectedFinancePeriod] = useState<'all' | '7d' | '30d' | 'this_month' | 'last_month'>('all');
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleAddRevenueLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCarId) return;
    if (selectedRevAmount <= 0) {
      alert('Please enter a valid cashing amount greater than 0.');
      return;
    }
    if (!selectedRevDesc.trim()) {
      alert('Please enter a description for this cashing receipt.');
      return;
    }

    const associatedDriver = drivers.find(d => d.id === selectedRevDriverId);
    const newLog: RevenueLog = {
      id: `rev-${Date.now()}`,
      date: selectedRevDate,
      amount: Number(selectedRevAmount),
      category: selectedRevCategory,
      description: selectedRevDesc.trim(),
      driverId: associatedDriver?.id || undefined,
      driverName: associatedDriver?.fullName || undefined
    };

    setCars(prev => prev.map(car => {
      if (car.id === selectedCarId) {
        const currentLogs = car.revenueLogs || [];
        return {
          ...car,
          revenueLogs: [newLog, ...currentLogs]
        };
      }
      return car;
    }));

    // Reset Form Fields
    setSelectedRevAmount(0);
    setSelectedRevDesc('');
    setSelectedRevDate(new Date().toISOString().split('T')[0]);
    setSelectedRevCategory('Rental');
    setSelectedRevDriverId('');
    setShowRevenueLogForm(false);
  };

  // --- Driver Portal Form States ---
  const [drvSvcDate, setDrvSvcDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [drvSvcCat, setDrvSvcCat] = useState<ServiceLog['category']>('Maintenance');
  const [drvSvcDesc, setDrvSvcDesc] = useState('');
  const [drvSvcCost, setDrvSvcCost] = useState<number>(0);
  const [drvSvcMiles, setDrvSvcMiles] = useState<number>(0);

  const [drvFuelDate, setDrvFuelDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [drvFuelLiters, setDrvFuelLiters] = useState<number>(0);
  const [drvFuelCost, setDrvFuelCost] = useState<number>(0);
  const [drvFuelMiles, setDrvFuelMiles] = useState<number>(0);

  const [drvRevDate, setDrvRevDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [drvRevCat, setDrvRevCat] = useState<RevenueLog['category']>('Fare');
  const [drvRevDesc, setDrvRevDesc] = useState('');
  const [drvRevAmount, setDrvRevAmount] = useState<number>(0);

  const [driverPortalTab, setDriverPortalTab] = useState<'log_work' | 'history'>('log_work');
  const [driverLogSubTab, setDriverLogSubTab] = useState<'maintenance' | 'refueling' | 'cashing'>('maintenance');
  const [driverSuccessMsg, setDriverSuccessMsg] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedServiceLogForPopup, setSelectedServiceLogForPopup] = useState<ServiceLog | null>(null);

  const triggerDriverSuccess = (msg: string) => {
    setDriverSuccessMsg(msg);
    setTimeout(() => {
      setDriverSuccessMsg(null);
    }, 4500);
  };

  const handleDriverAddServiceLog = (carId: string, driverName: string) => {
    if (!drvSvcDesc.trim()) {
      alert('Please enter a description for the service performed.');
      return;
    }
    if (drvSvcCost < 0) {
      alert('Cost cannot be negative.');
      return;
    }

    const newSvc: ServiceLog = {
      id: `svc-${Date.now()}`,
      date: drvSvcDate,
      category: drvSvcCat,
      description: drvSvcDesc.trim(),
      cost: Number(drvSvcCost),
      mileage: Number(drvSvcMiles),
      performedBy: driverName
    };

    setCars(prev => prev.map(car => {
      if (car.id === carId) {
        const currentSvc = car.serviceLogs || [];
        const nextMileage = drvSvcMiles > car.mileage ? Number(drvSvcMiles) : car.mileage;
        return {
          ...car,
          mileage: nextMileage,
          serviceLogs: [newSvc, ...currentSvc]
        };
      }
      return car;
    }));

    // Reset Form Fields
    setDrvSvcDesc('');
    setDrvSvcCost(0);
    setDrvSvcMiles(0);
    setDrvSvcDate(new Date().toISOString().split('T')[0]);
    setDrvSvcCat('Maintenance');

    triggerDriverSuccess('✅ Maintenance / Service Event logged successfully, and auto-synced with Manager Hub!');
  };

  const handleDriverAddRefuelLog = (carId: string, driverName: string) => {
    if (drvFuelLiters <= 0 || drvFuelCost <= 0) {
      alert(' Lires and Cost must be greater than 0.');
      return;
    }

    const newFuel: FuelLog = {
      id: `fuel-${Date.now()}`,
      date: drvFuelDate,
      liters: Number(drvFuelLiters),
      cost: Number(drvFuelCost),
      mileage: Number(drvFuelMiles),
      performedBy: driverName
    };

    setCars(prev => prev.map(car => {
      if (car.id === carId) {
        const currentFuel = car.fuelLogs || [];
        const nextMileage = drvFuelMiles > car.mileage ? Number(drvFuelMiles) : car.mileage;
        return {
          ...car,
          mileage: nextMileage,
          fuelLogs: [newFuel, ...currentFuel]
        };
      }
      return car;
    }));

    // Reset Form
    setDrvFuelLiters(0);
    setDrvFuelCost(0);
    setDrvFuelMiles(0);
    setDrvFuelDate(new Date().toISOString().split('T')[0]);

    triggerDriverSuccess('✅ Refueling details added, and fleet metrics updated live!');
  };

  const handleDriverAddRevenueLog = (carId: string, driverId: string, driverName: string) => {
    if (drvRevAmount <= 0) {
      alert('Please enter a valid receipt amount greater than 0.');
      return;
    }
    if (!drvRevDesc.trim()) {
      alert('Please describe this receipt/cashing event.');
      return;
    }

    const newRev: RevenueLog = {
      id: `rev-${Date.now()}`,
      date: drvRevDate,
      amount: Number(drvRevAmount),
      category: drvRevCat,
      description: drvRevDesc.trim(),
      driverId,
      driverName,
      status: 'Pending'
    };

    setCars(prev => prev.map(car => {
      if (car.id === carId) {
        const currentRevs = car.revenueLogs || [];
        return {
          ...car,
          revenueLogs: [newRev, ...currentRevs]
        };
      }
      return car;
    }));

    // Reset Form
    setDrvRevAmount(0);
    setDrvRevDesc('');
    setDrvRevDate(new Date().toISOString().split('T')[0]);
    setDrvRevCat('Fare');

    triggerDriverSuccess('✅ Cashing / Revenue receipt submitted successfully! Waiting for manager approval.');
  };

  const handleApproveRevenueLog = (carId: string, logId: string) => {
    if (!window.confirm('Are you sure you want to approve this cash receipt?')) return;
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
    if (!window.confirm('Are you sure you want to delete this cashing entry?')) return;
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

  const handleAddFuelLog = (
    carId: string,
    date: string,
    liters: number,
    cost: number,
    mileage: number,
    performedBy?: string
  ) => {
    if (liters <= 0 || cost <= 0) {
      alert('Please enter valid Liters and Cost greater than 0.');
      return;
    }
    const newFuel: any = {
      id: `fuel-${Date.now()}`,
      date,
      liters: Number(liters),
      cost: Number(cost),
      mileage: Number(mileage),
      performedBy
    };
    setCars(prev => prev.map(car => {
      if (car.id === carId) {
        const currentFuelLogs = car.fuelLogs || [];
        const nextMileage = mileage > car.mileage ? Number(mileage) : car.mileage;
        return {
          ...car,
          mileage: nextMileage,
          fuelLogs: [newFuel, ...currentFuelLogs]
        };
      }
      return car;
    }));

    // Reset Form Fields
    setSelectedFuelLiters(0);
    setSelectedFuelCost(0);
    setSelectedFuelMileage(0);
    setSelectedFuelDate(new Date().toISOString().split('T')[0]);
    setShowFuelLogForm(false);
  };

  const handleDeleteFuelLog = (carId: string, logId: string) => {
    if (!window.confirm('Are you sure you want to delete this refueling entry?')) return;
    setCars(prev => prev.map(car => {
      if (car.id === carId) {
        return {
          ...car,
          fuelLogs: (car.fuelLogs || []).filter(log => log.id !== logId)
        };
      }
      return car;
    }));
  };

  // --- Sync with localStorage ---
  useEffect(() => {
    localStorage.setItem('fleet_cars', JSON.stringify(cars));
  }, [cars]);

  useEffect(() => {
    localStorage.setItem('fleet_drivers', JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    if (!activeDriverId && drivers.length > 0) {
      setActiveDriverId(drivers[0].id);
    }
  }, [drivers, activeDriverId]);

  // --- Derived Calculations / Statistics ---
  const totalAssets = cars.length;
  const activeDrivers = drivers.filter(d => d.status === 'Active').length;
  const metrics = {
    available: cars.filter(c => c.status === 'Available').length,
    assigned: cars.filter(c => c.status === 'Assigned').length,
    maintenance: cars.filter(c => c.status === 'Maintenance').length,
  };

  // --- Dynamic Search Filters ---
  const filteredCars = cars.filter(car => {
    const plateMatch = car.plateNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const modelMatch = `${car.make} ${car.model}`.toLowerCase().includes(searchQuery.toLowerCase());
    const colorMatch = car.color.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Search based on Plate number OR Assigned Driver name as requested
    const driver = drivers.find(d => d.assignedCarId === car.id);
    const driverMatch = driver ? driver.fullName.toLowerCase().includes(searchQuery.toLowerCase()) : false;

    const matchesSearch = plateMatch || driverMatch || modelMatch || colorMatch;
    const matchesFilter = statusFilter === 'All' || car.status === statusFilter;

    return matchesSearch && matchesFilter;
  });

  const selectedCar = cars.find(c => c.id === selectedCarId);
  const selectedCarDriver = selectedCar ? drivers.find(d => d.assignedCarId === selectedCar.id) : null;

  // --- Fleet & Driver Core Handlers ---
  const handleAddNewCar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCarMake || !newCarModel || !newCarPlate) {
      alert('Must fill out Vehicle Make, Model, and License Plate.');
      return;
    }

    // Check duplicate plate
    if (cars.some(c => c.plateNumber.trim().toUpperCase() === newCarPlate.trim().toUpperCase())) {
      alert(`License plate "${newCarPlate}" is already registered to another vehicle in the system.`);
      return;
    }

    const defaultCarPhoto = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80';
    
    // Create new car asset
    const newCarId = `car-${Date.now()}`;
    const initialLogs: ServiceLog[] = [];
    if (includeInitialService && initialServiceDesc) {
      initialLogs.push({
        id: `log-${Date.now()}-init`,
        date: new Date().toISOString().split('T')[0],
        category: initialServiceCat,
        description: initialServiceDesc,
        cost: Number(initialServiceCost) || 0,
        mileage: Number(newCarMileage) || 0,
        performedBy: initialServiceBy || 'Fleet Auto Prep Team'
      });
    }

    const generatedCar: CarAsset = {
      id: newCarId,
      make: newCarMake,
      model: newCarModel,
      year: Number(newCarYear) || new Date().getFullYear(),
      plateNumber: newCarPlate.trim().toUpperCase(),
      color: newCarColor || 'Not Specified',
      vin: newCarVin.trim().toUpperCase() || `VIN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      mileage: Number(newCarMileage) || 0,
      status: newCarStatus,
      photos: [newCarPhoto || defaultCarPhoto],
      serviceLogs: initialLogs,
      revenueLogs: [],
      createdAt: new Date().toISOString()
    };

    setCars(prev => [generatedCar, ...prev]);
    setSelectedCarId(newCarId);

    // Reset Form Fields
    setNewCarMake('');
    setNewCarModel('');
    setNewCarYear(new Date().getFullYear());
    setNewCarPlate('');
    setNewCarColor('');
    setNewCarVin('');
    setNewCarMileage(0);
    setNewCarStatus('Available');
    setNewCarPhoto('');
    setIncludeInitialService(false);
    setInitialServiceDesc('');
    setInitialServiceCost(0);
    setInitialServiceBy('');
    setIsAddingCar(false);
  };

  const handleDriverPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewDrvPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddNewDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrvName || !newDrvLicense || !newDrvNrc) {
      alert('Please fill out the Driver Name, NRC Number, and Licence details.');
      return;
    }

    const newDriverId = `driver-${Date.now()}`;
    const isAssigned = !!newDrvAssignedCarId;

    // Create new driver object
    const createdDriver: Driver = {
      id: newDriverId,
      fullName: newDrvName,
      licenseNumber: newDrvLicense.toUpperCase(),
      nrcNumber: newDrvNrc.toUpperCase(),
      email: newDrvEmail || 'notprovided@fleetcorp.com',
      phone: newDrvPhone || 'Unspecified',
      status: newDrvStatus,
      assignedCarId: isAssigned ? newDrvAssignedCarId : null,
      profilePicture: newDrvPhoto || undefined,
      createdAt: new Date().toISOString()
    };

    // Update state
    setDrivers(prev => [createdDriver, ...prev]);

    // If a car was assigned, we update that car's status to Assigned and keep consistency
    if (isAssigned) {
      setCars(prevCars =>
         prevCars.map(car => {
           if (car.id === newDrvAssignedCarId) {
             return { ...car, status: 'Assigned' };
           }
           return car;
         })
      );
      
      // Also check if that car was assigned to another driver. If so, unassign them!
      setDrivers(prevDrivers =>
        prevDrivers.map(drv => {
          if (drv.assignedCarId === newDrvAssignedCarId && drv.id !== newDriverId) {
            return { ...drv, assignedCarId: null };
          }
          return drv;
        })
      );
    }

    // Reset Form Fields
    setNewDrvName('');
    setNewDrvLicense('');
    setNewDrvNrc('');
    setNewDrvEmail('');
    setNewDrvPhone('');
    setNewDrvStatus('Active');
    setNewDrvAssignedCarId('');
    setNewDrvPhoto('');
    setIsAddingDriver(false);
  };

  // --- Add Service Log inline in Details ---
  const handleAddServiceLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCarId || !selectedLogDesc) return;

    const newLog: ServiceLog = {
      id: `log-${Date.now()}`,
      date: selectedLogDate,
      category: selectedLogCategory,
      description: selectedLogDesc,
      cost: Number(selectedLogCost) || 0,
      mileage: Number(selectedLogMiles) || selectedCar?.mileage || 0,
      performedBy: selectedLogBy || 'Authorized Workshop'
    };

    setCars(prevCars =>
      prevCars.map(car => {
        if (car.id === selectedCarId) {
          const updatedLogs = [newLog, ...car.serviceLogs];
          // Update overall car mileage if newly logged mileage is higher
          const finalMileage = Number(selectedLogMiles) > car.mileage ? Number(selectedLogMiles) : car.mileage;
          return {
            ...car,
            serviceLogs: updatedLogs,
            mileage: finalMileage
          };
        }
        return car;
      })
    );

    // Reset log input states
    setSelectedLogDesc('');
    setSelectedLogCost(0);
    setSelectedLogMiles(0);
    setSelectedLogBy('');
    setShowServiceLogForm(false);
  };

  // --- Update Asset Status directly in Details ---
  const updateCarStatus = (carId: string, value: CarAsset['status']) => {
    setCars(prevCars =>
      prevCars.map(car => {
        if (car.id === carId) {
          return { ...car, status: value };
        }
        return car;
      })
    );
  };

  // --- Assign dynamic Driver directly in Details --
  const handleDirectDriverAssign = (carId: string, driverId: string) => {
    // Unassign whichever car this driver had, and map this driver to this car
    setDrivers(prevDrivers =>
      prevDrivers.map(d => {
        if (d.id === driverId) {
          return { ...d, assignedCarId: carId };
        }
        // If some other driver had this car, unassign them
        if (d.assignedCarId === carId && d.id !== driverId) {
          return { ...d, assignedCarId: null };
        }
        return d;
      })
    );

    setCars(prevCars =>
      prevCars.map(c => {
        if (c.id === carId) {
          return { ...c, status: 'Assigned' };
        }
        return c;
      })
    );
  };

  const handleDirectDriverUnassign = (carId: string) => {
    setDrivers(prevDrivers =>
      prevDrivers.map(d => {
        if (d.assignedCarId === carId) {
          return { ...d, assignedCarId: null };
        }
        return d;
      })
    );

    setCars(prevCars =>
      prevCars.map(c => {
        if (c.id === carId) {
          return { ...c, status: 'Available' };
        }
        return c;
      })
    );
  };

  // --- Remove Asset ---
  const deleteCarAsset = (carId: string) => {
    setCars(prev => prev.filter(c => c.id !== carId));
    setDrivers(prev =>
      prev.map(d => (d.assignedCarId === carId ? { ...d, assignedCarId: null } : d))
    );
    setSelectedCarId(null);
  };

  const handleDeleteDriver = (driverId: string) => {
    const driverToDelete = drivers.find(d => d.id === driverId);
    if (!driverToDelete) return;

    const assignedCarId = driverToDelete.assignedCarId;
    const isAssigned = !!assignedCarId;
    
    let confirmMsg = `Are you sure you want to permanently delete driver profile "${driverToDelete.fullName}"?`;
    if (isAssigned) {
      const assignedCar = cars.find(c => c.id === assignedCarId);
      const vehicleDesc = assignedCar ? `${assignedCar.make} ${assignedCar.model} (${assignedCar.plateNumber})` : 'vehicle';
      confirmMsg = `This driver is currently assigned to ${vehicleDesc}. Deleting their profile will unassign them and reset the vehicle as available. Proceed?`;
    }

    if (!window.confirm(confirmMsg)) return;

    // Remove from drivers
    setDrivers(prev => prev.filter(d => d.id !== driverId));

    // Reset corresponding car if assigned
    if (assignedCarId) {
      setCars(prevCars =>
        prevCars.map(c => {
          if (c.id === assignedCarId) {
            return { ...c, status: 'Available' };
          }
          return c;
        })
      );
    }
  };

  const handleDeleteServiceLog = (carId: string, logId: string) => {
    if (!window.confirm('Are you sure you want to delete this service log entry?')) return;
    setCars(prev => prev.map(car => {
      if (car.id === carId) {
        return {
          ...car,
          serviceLogs: car.serviceLogs.filter(log => log.id !== logId)
        };
      }
      return car;
    }));
  };

  const handlePrintSummary = (
    car: CarAsset,
    logs: RevenueLog[],
    period: string,
    total: number
  ) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up was blocked. Please allow popups to print asset finance summary.');
      return;
    }

    const periodLabel = 
      period === '7d' ? 'Last 7 Days' :
      period === '30d' ? 'Last 30 Days' :
      period === 'this_month' ? 'This Month' :
      period === 'last_month' ? 'Last Month' : 'All-Time';

    const logsHtml = logs.map(l => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 8px; font-weight: bold; color: #1e293b; text-align: left;">${l.category}</td>
        <td style="padding: 10px 8px; color: #475569; font-family: monospace; text-align: left;">${l.date}</td>
        <td style="padding: 10px 8px; color: #475569; text-align: left;">${l.driverName || 'Fleet / Unassigned'}</td>
        <td style="padding: 10px 8px; color: #475569; max-width: 250px; font-size: 11px; text-align: left;">${l.description}</td>
        <td style="padding: 10px 8px; font-weight: bold; color: #059669; text-align: right; font-family: monospace;">+zmk ${l.amount.toFixed(2)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${car.make} ${car.model} (${car.plateNumber}) - Revenue Summary</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #0f172a; margin: 0; }
            .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; margin: 0; color: #1e1b4b; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
            .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
            .meta-card { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .meta-card h5 { margin: 0; font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
            .meta-card p { margin: 6px 0 0 0; font-size: 16px; font-weight: bold; color: #0f172a; }
            .table { width: 100%; border-collapse: collapse; margin-top: 30px; text-align: left; font-size: 12px; }
            .table th { background: #f1f5f9; padding: 12px 8px; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 10px; text-align: left; }
            .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8; }
            @media print {
              .no-print { display: none; }
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Cashing & Revenue Ledger</div>
              <div class="subtitle">Generated Report • Fleet Operation Hub</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: bold; color: #1e1b4b; font-size: 14px;">${car.make} ${car.model}</div>
              <div style="color: #64748b; font-family: monospace; font-size: 12px; margin-top: 2px;">Plate No: ${car.plateNumber}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-card">
              <h5>Analysis Interval</h5>
              <p>${periodLabel}</p>
            </div>
            <div class="meta-card">
              <h5>Total Revenue</h5>
              <p style="color: #059669;">zmk ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div class="meta-card">
              <h5>Logged Cashings</h5>
              <p>${logs.length} transactions</p>
            </div>
          </div>

          <div style="font-size: 14px; font-weight: bold; color: #1e293b; margin-top: 30px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; text-align: left;">Receipts Ledger Details</div>
          <table class="table">
            <thead>
              <tr>
                <th style="text-align: left;">Category</th>
                <th style="text-align: left;">Receipt Date</th>
                <th style="text-align: left;">Driver / Operator</th>
                <th style="text-align: left;">Description / Memo</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${logsHtml || '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #94a3b8; font-style: italic;">No ledger entries recorded for this period.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            Generated on: ${new Date().toLocaleString()} UTC • Fleet Admin Portal system
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = (
    car: CarAsset,
    logs: RevenueLog[],
    period: string,
    total: number
  ) => {
    const html2pdf = (window as any).html2pdf;
    if (!html2pdf) {
      alert('PDF generation library is still loading or could not be loaded. Please ensure you are connected to the internet and try again.');
      return;
    }

    setIsExportingPDF(true);

    const periodLabel = 
      period === '7d' ? 'Last 7 Days' :
      period === '30d' ? 'Last 30 Days' :
      period === 'this_month' ? 'This Month' :
      period === 'last_month' ? 'Last Month' : 'All-Time';

    const logsHtml = logs.map(l => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 8px; font-weight: bold; color: #1e293b; text-align: left;">${l.category}</td>
        <td style="padding: 10px 8px; color: #475569; font-family: monospace; text-align: left;">${l.date}</td>
        <td style="padding: 10px 8px; color: #475569; text-align: left;">${l.driverName || 'Fleet / Unassigned'}</td>
        <td style="padding: 10px 8px; color: #475569; max-width: 250px; font-size: 11px; text-align: left;">${l.description}</td>
        <td style="padding: 10px 8px; font-weight: bold; color: #059669; text-align: right; font-family: monospace;">+zmk ${l.amount.toFixed(2)}</td>
      </tr>
    `).join('');

    // Create container
    const element = document.createElement('div');
    element.style.padding = '40px';
    element.style.background = '#ffffff';
    element.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    element.style.color = '#0f172a';
    element.style.position = 'fixed';
    element.style.left = '-9999px';
    element.style.top = '0';
    element.style.width = '790px'; // standard A4 page width reference in pixels

    element.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
        <div>
          <div style="font-size: 24px; font-weight: bold; margin: 0; color: #1e1b4b;">Cashing & Revenue Ledger</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Generated Report • Fleet Operation Hub</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: bold; color: #1e1b4b; font-size: 14px;">${car.make} ${car.model}</div>
          <div style="color: #64748b; font-family: monospace; font-size: 12px; margin-top: 2px;">Plate No: ${car.plateNumber}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0;">
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h5 style="margin: 0; font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; font-weight: 600;">Analysis Interval</h5>
          <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: bold; color: #0f172a;">${periodLabel}</p>
        </div>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h5 style="margin: 0; font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; font-weight: 600;">Total Revenue</h5>
          <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: bold; color: #059669;">zmk ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h5 style="margin: 0; font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; font-weight: 600;">Logged Cashings</h5>
          <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: bold; color: #0f172a;">${logs.length} transactions</p>
        </div>
      </div>

      <div style="font-size: 14px; font-weight: bold; color: #1e293b; margin-top: 30px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; text-align: left;">Receipts Ledger Details</div>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left; font-size: 12px;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 12px 8px; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 10px; text-align: left; border-bottom: 1px solid #cbd5e1;">Category</th>
            <th style="padding: 12px 8px; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 10px; text-align: left; border-bottom: 1px solid #cbd5e1;">Receipt Date</th>
            <th style="padding: 12px 8px; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 10px; text-align: left; border-bottom: 1px solid #cbd5e1;">Driver / Operator</th>
            <th style="padding: 12px 8px; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 10px; text-align: left; border-bottom: 1px solid #cbd5e1;">Description / Memo</th>
            <th style="padding: 12px 8px; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 10px; text-align: right; border-bottom: 1px solid #cbd5e1;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${logsHtml || '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #94a3b8; font-style: italic;">No ledger entries recorded for this period.</td></tr>'}
        </tbody>
      </table>

      <div style="margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8;">
        Generated on: ${new Date().toLocaleString()} UTC • Fleet Admin Portal system
      </div>
    `;

    document.body.appendChild(element);

    const safeFilename = `${car.make}_${car.model}_${car.plateNumber}_finance_report_${periodLabel.toLowerCase().replace(/\s+/g, '_')}.pdf`;
    const opt = {
      margin:       10,
      filename:     safeFilename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf()
      .from(element)
      .set(opt)
      .save()
      .then(() => {
        document.body.removeChild(element);
        setIsExportingPDF(false);
      })
      .catch((err: any) => {
        console.error('PDF generation error:', err);
        if (element.parentNode) {
          document.body.removeChild(element);
        }
        setIsExportingPDF(false);
        alert('Failed to generate PDF. Please try again.');
      });
  };

  const renderFinanceDashboard = () => {
    // Flatten all revenue logs across cars
    const allRevenueLogs = cars.flatMap(car => 
      (car.revenueLogs || []).map(log => ({
        ...log,
        carId: car.id,
        carMake: car.make,
        carModel: car.model,
        carPlate: car.plateNumber,
      }))
    );

    // Apply active filters
    const filteredRevenues = allRevenueLogs.filter(r => {
      // 1. Text Search Query
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

    // Derive totals
    const totalCollected = filteredRevenues.reduce((sum, r) => sum + r.amount, 0);
    const approvedCollected = filteredRevenues.filter(r => r.status === 'Approved').reduce((sum, r) => sum + r.amount, 0);
    const pendingCollected = filteredRevenues.filter(r => r.status === 'Pending').reduce((sum, r) => sum + r.amount, 0);
    const pendingReviewCount = filteredRevenues.filter(r => r.status === 'Pending').length;
    
    // Unique assets contributing
    const uniqueVehiclesCount = new Set(filteredRevenues.map(r => r.carPlate)).size;

    // Chart 1: Income trend by date
    const dateMap: Record<string, number> = {};
    filteredRevenues.forEach(r => {
      const dateStr = r.date;
      dateMap[dateStr] = (dateMap[dateStr] || 0) + r.amount;
    });
    const trendChart = Object.entries(dateMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Chart 2: Income distribution by Asset
    const carMap: Record<string, number> = {};
    filteredRevenues.forEach(r => {
      const label = `${r.carMake} (${r.carPlate})`;
      carMap[label] = (carMap[label] || 0) + r.amount;
    });
    const assetChart = Object.entries(carMap).map(([name, amount]) => ({ name, amount }));

    // Chart 3: Distribution by Category
    const catMap: Record<string, number> = {};
    filteredRevenues.forEach(r => {
      catMap[r.category] = (catMap[r.category] || 0) + r.amount;
    });
    const categoryChart = Object.entries(catMap).map(([name, value]) => ({ name, value }));

    // Category colors mapping
    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

    // Bulk action
    const approveAllPending = () => {
      if (pendingReviewCount === 0) return;
      if (!window.confirm(`Are you sure you want to verify and bulk approve all ${pendingReviewCount} pending collection cash receipts matching your current filters?`)) return;
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" id="finance-dashboard-hero">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                <Coins className="text-indigo-600 w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
                Financial Dynamics & Analytics
              </h2>
              <p className="text-xs text-gray-400 font-medium">Monitor active cashing logs, revenue streams, and verify driver submissions across the enterprise.</p>
            </div>
            {pendingReviewCount > 0 && (
              <button
                onClick={approveAllPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                id="btn-bulk-approve-revenues"
              >
                <Check className="w-4 h-4 shrink-0" />
                Approve All Pending ({pendingReviewCount})
              </button>
            )}
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="finance-kpis-grid">
            
            {/* Total Collected */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs text-left" id="kpi-total-collected">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Gross Sum Revenue</span>
              <span className="text-xl font-extrabold font-mono text-gray-900 block mt-1">zmk {totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
                <span className="font-bold underline">{filteredRevenues.length}</span> transactions logged
              </div>
            </div>

            {/* Approved Revenue */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs text-left" id="kpi-approved">
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">Verified & Approved</span>
              <span className="text-xl font-extrabold font-mono text-emerald-700 block mt-1">zmk {approvedCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full inline-flex">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>{filteredRevenues.filter(r => r.status === 'Approved').length} clear logs</span>
              </div>
            </div>

            {/* Pending Collection */}
            <div className={`p-4 rounded-2xl border shadow-xs text-left transition-all ${pendingReviewCount > 0 ? 'bg-amber-50/50 border-amber-200/80' : 'bg-white border-gray-200/80'}`} id="kpi-pending">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${pendingReviewCount > 0 ? 'text-amber-700' : 'text-gray-400'}`}>Pending Review</span>
              <span className={`text-xl font-extrabold font-mono block mt-1 ${pendingReviewCount > 0 ? 'text-amber-800' : 'text-gray-900'}`}>zmk {pendingCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <div className={`flex items-center gap-1 mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex ${pendingReviewCount > 0 ? 'bg-amber-100 text-amber-700 font-bold' : 'bg-gray-100 text-gray-500'}`}>
                <Clock className="w-3 h-3 shrink-0 animate-pulse" />
                <span>{pendingReviewCount} logs awaiting review</span>
              </div>
            </div>

            {/* Contributing assets */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs text-left" id="kpi-assets">
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Contributing Assets</span>
              <span className="text-xl font-extrabold font-mono text-indigo-700 block mt-1">{uniqueVehiclesCount} Cars</span>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-full inline-flex">
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
            <div className="flex flex-wrap items-center gap-2" id="ledger-filters-selections">
              
              {/* Asset choice */}
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">Asset:</span>
                <select
                  value={financeAsset}
                  onChange={(e) => setFinanceAsset(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                  id="filter-ledger-asset"
                >
                  <option value="all">All Fleet Vehicles</option>
                  {cars.map(c => (
                    <option key={c.id} value={c.id}>{c.make} {c.model} ({c.plateNumber})</option>
                  ))}
                </select>
              </div>

              {/* Timeframe selector */}
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">Timeframe:</span>
                <select
                  value={financeTimeframe}
                  onChange={(e) => setFinanceTimeframe(e.target.value as any)}
                  className="bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                  id="filter-ledger-time"
                >
                  <option value="all">All Time</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                </select>
              </div>

              {/* Category choice */}
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">Type:</span>
                <select
                  value={financeCategory}
                  onChange={(e) => setFinanceCategory(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                  id="filter-ledger-cat"
                >
                  <option value="all">All Categories</option>
                  <option value="Fare">Fare</option>
                  <option value="Rental">Rental</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Contract">Contract</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Status Selector */}
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">Status:</span>
                <select
                  value={financeStatus}
                  onChange={(e) => setFinanceStatus(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
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
                <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-4 text-left">Daily Collection Timeline Growth</h3>
                {trendChart.length > 0 ? (
                  <div className="h-64 pl-0" id="recharts-trend-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
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
                        <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorAmt)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-20 text-center border border-dashed border-gray-100 rounded-xl" id="empty-trend-slate">
                    <Coins className="w-10 h-10 text-gray-200 mx-auto animate-pulse" />
                    <p className="text-xs text-gray-400 italic mt-2">No transaction data generated for the current filtered date range.</p>
                  </div>
                )}
              </div>

              {/* Grid of Distribution by Category and Asset Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="distribution-graphics-subgrid">
                
                {/* Asset Revenue Bar chart */}
                <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs" id="asset-chart-card">
                  <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3 text-left">Revenue by Fleet Asset</h3>
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
                      <p className="text-[10px] text-gray-400 italic mt-1.5">No vehicle metric distribution available.</p>
                    </div>
                  )}
                </div>

                {/* Category Share Distribution donut gauge */}
                <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between" id="category-chart-card">
                  <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2 text-left">Collections by Stream Category</h3>
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
                            <span className="flex items-center gap-1.5 text-gray-500 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                              {item.name}
                            </span>
                            <span className="font-mono font-bold text-gray-800">zmk {item.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>

                    </div>
                  ) : (
                    <div className="py-12 text-center" id="empty-cat-slate">
                      <Coins className="w-8 h-8 text-gray-200 mx-auto" />
                      <p className="text-[10px] text-gray-400 italic mt-1.5">No category split metrics recorded.</p>
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* RIGHT: Central Ledger / Approval Queue Column span 5 */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex flex-col gap-4 text-left" id="finance-ledger-col">
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-3" id="ledger-headline">
                <div>
                  <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                    Submissions Ledger Registry
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Showing {filteredRevenues.length} revenue logging entries matching filters</p>
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
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-start gap-2.5 max-w-[70%]">
                            <div className="mt-1">
                              {rev.status === 'Pending' ? (
                                <span className="w-2 h-2 rounded-full bg-amber-400 block animate-ping" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 block" />
                              )}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <strong className="text-gray-900 font-extrabold">{rev.category}</strong>
                                <span className="text-[8px] text-gray-400 font-semibold font-mono bg-gray-150 px-1 py-0.5 rounded leading-none">{rev.date}</span>
                              </div>
                              <p className="text-[10px] text-gray-400 font-semibold mt-0.5 font-mono">
                                Plate: <span className="text-indigo-600 font-bold">{rev.carPlate}</span> • {rev.carMake} {rev.carModel}
                              </p>
                              {rev.driverName && (
                                <p className="text-[10.5px] text-gray-500 font-semibold mt-0.5 flex items-center gap-1 leading-none">
                                  <span>👤 Driver:</span>
                                  <span className="font-extrabold text-slate-800">{rev.driverName}</span>
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
                                <div className="flex gap-1" id="ledger-actions-panel">
                                  <button
                                    type="button"
                                    onClick={() => handleApproveRevenueLog(rev.carId, rev.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-2 py-1 rounded-lg text-[9px] transition-colors cursor-pointer"
                                    id={`btn-approve-ledger-${rev.id}`}
                                  >
                                    Verify
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRevenueLog(rev.carId, rev.id)}
                                    className="bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-bold px-1.5 py-1 rounded-lg text-[9px] transition-colors cursor-pointer border border-slate-200 hover:border-rose-200"
                                    id={`btn-reject-ledger-${rev.id}`}
                                    title="Reject or Delete log"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}

                              {rev.status === 'Approved' && (
                                <div className="flex items-center gap-1 text-emerald-600">
                                  <Check className="w-3.5 h-3.5" />
                                  <span className="text-[9px] uppercase font-bold tracking-wider">Authorized</span>
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
                          <div className="mt-2 text-[10px] bg-slate-50 border border-gray-150 p-2.5 rounded-xl space-y-1.5 cursor-default" onClick={(e) => e.stopPropagation()}>
                            <div className="text-gray-500 leading-normal font-medium text-left">
                              <span className="font-bold text-gray-700 block mb-0.5">Work Statement Notes / Description:</span>
                              {rev.description || <span className="italic">No description recorded for this collection.</span>}
                            </div>
                            <div className="text-[8px] uppercase font-bold text-gray-450 tracking-wider text-left">
                              Transactional reference ID: <span className="font-mono text-gray-600">{rev.id}</span>
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })
                ) : (
                  <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50" id="empty-ledger-slate">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto animate-pulse" />
                    <p className="text-xs text-gray-400 italic mt-3">No matching revenues logs recorded.</p>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-gray-900 font-sans flex flex-col antialiased" id="main-fleet-app">
      {/* Top Banner Header banner */}
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-20 backdrop-blur-md bg-white/95" id="nav-header">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo Brand Brand */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4" id="brand-logo-area">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center">
                <Car className="w-6 h-6" id="logo-icon-car" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">FLEET ASSETS</h1>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 font-mono block text-left">
                  {userRole === 'manager' ? 'Enterprise Hub' : 'Driver Station'}
                </span>
              </div>
            </div>

            {/* Portal Toggle Selector Pill */}
            <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto" id="portal-role-switcher-con">
              <button
                type="button"
                onClick={() => setUserRole('manager')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  userRole === 'manager'
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                id="role-switch-btn-mgr"
              >
                <Briefcase className="w-3.5 h-3.5" />
                Manager Hub
              </button>
              <button
                type="button"
                onClick={() => setUserRole('driver')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  userRole === 'driver'
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                id="role-switch-btn-drv"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Driver Portal
              </button>
            </div>
          </div>

          {/* Quick Action Controls or Logged In Driver Switcher */}
          <div className="flex items-center gap-3 self-stretch md:self-center justify-end" id="btn-top-controls">
            {userRole === 'manager' ? (
              <>
                <button
                  onClick={() => setIsAddingDriver(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                  id="btn-add-driver-trigger"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  Add Driver
                </button>
                <button
                  onClick={() => setIsAddingCar(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  id="btn-add-car-trigger"
                >
                  <Plus className="w-4 h-4" />
                  Add Car Asset
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2" id="driver-logged-in-panel">
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">Simulating Driver Identity:</span>
                <select
                  value={activeDriverId}
                  onChange={(e) => setActiveDriverId(e.target.value)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-850 rounded-xl text-xs font-semibold focus:outline-none"
                  id="driver-portal-user-selector"
                >
                  <option value="" disabled>-- Choose Driver --</option>
                  {drivers.map(drv => (
                    <option key={drv.id} value={drv.id}>
                      👤 {drv.fullName} ({drv.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </header>

      {userRole === 'manager' && (
        <div className="bg-slate-50 border-b border-gray-200/80" id="manager-sub-navigation">
          <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between py-2.5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setManagerView('fleet')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  managerView === 'fleet'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-3xs'
                }`}
                id="mgr-view-tab-fleet"
              >
                <Car className="w-3.5 h-3.5" />
                Fleet Registry
              </button>
              <button
                type="button"
                onClick={() => setManagerView('finance')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  managerView === 'finance'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-3xs'
                }`}
                id="mgr-view-tab-finance"
              >
                <Coins className="w-3.5 h-3.5 text-indigo-505" />
                Financial Dynamics
              </button>
            </div>
            
            <div className="text-[11px] text-indigo-700/85 font-semibold bg-indigo-50/70 border border-indigo-100 px-3 py-1 rounded-full flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-indigo-500" />
              <span>Real-Time Enterprise Tracker Active</span>
            </div>
          </div>
        </div>
      )}

      {userRole === 'manager' ? (
        managerView === 'fleet' ? (
          <>
          {/* Hero Stats Board */}
          <section className="bg-white border-b border-gray-200/50 py-5" id="stats-dashboard">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-summary-grid">
            
            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3" id="stat-card-total-assets">
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

            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3" id="stat-card-available">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Available</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-gray-900">{metrics.available}</span>
                  <span className="text-[10px] text-gray-500">ready</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3" id="stat-card-assigned">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">On Road</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-gray-900">{metrics.assigned}</span>
                  <span className="text-[10px] text-gray-500">assigned</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3" id="stat-card-active-driver">
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Active Drivers</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-gray-900">{activeDrivers}</span>
                  <span className="text-[10px] text-gray-500">total staff</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Main Grid Content Area split layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6" id="dashboard-body">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="app-split-container">
          
          {/* LEFT SECTION: Search engine & Vehicle Asset List - Grid Column span 7 */}
          <section className="lg:col-span-7 flex flex-col gap-5" id="fleet-list-section">
            
            {/* Filter and Search Box Control panel */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200/70 shadow-sm space-y-4" id="fleet-filter-card">
              
              {/* Search Bar plate or name as specified */}
              <div className="relative" id="search-input-wrapper">
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
                <Info className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Fleet Status Legend</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" id="legend-grid-inner">
                <div className="flex items-start gap-2 p-1 rounded-lg transition-colors" id="legend-item-available">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-tight">Available</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">Ready for direct staff dispatch.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-1 rounded-lg transition-colors" id="legend-item-assigned">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-tight">Assigned</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">Assigned to an active staff driver.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-1 rounded-lg transition-colors" id="legend-item-maintenance">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-tight">Maintenance</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">In workshop or under fleet check.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-1 rounded-lg transition-colors" id="legend-item-oos">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-tight">Out of Service</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">OOS or decommissioned temporarily.</p>
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
                          ? 'border-indigo-600 ring-2 ring-indigo-50 shadow-md'
                          : 'border-gray-200/75 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      id={`car-card-${car.id}`}
                    >
                      {/* Image Thumbnail & Plate tag overlay */}
                      <div className="relative h-40 bg-gray-100 overflow-hidden" id={`card-img-wrap-${car.id}`}>
                        <img
                          src={car.photos[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80'}
                          alt={`${car.make} ${car.model}`}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Plate Badge overlay */}
                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm border border-gray-200 text-gray-800 font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow-sm uppercase" id={`plate-lbl-${car.id}`}>
                          {car.plateNumber}
                        </div>

                        {/* Status tag */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5" id={`status-lbl-wrap-${car.id}`}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditCar(car);
                            }}
                            className="bg-white/95 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 text-gray-700 hover:text-indigo-600 p-1.5 rounded-full shadow-sm transition-all flex items-center justify-center cursor-pointer z-10"
                            title="Edit Vehicle details"
                            id={`btn-edit-car-card-${car.id}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <span className={`text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full uppercase shadow-xs ${
                            car.status === 'Available' ? 'bg-emerald-500 text-white' :
                            car.status === 'Assigned' ? 'bg-indigo-600 text-white' :
                            car.status === 'Maintenance' ? 'bg-amber-500 text-white' :
                            'bg-rose-500 text-white'
                          }`} id={`status-tag-${car.id}`}>
                            {car.status}
                          </span>
                        </div>
                      </div>

                      {/* Content Box */}
                      <div className="p-4 flex-1 flex flex-col justify-between" id={`card-body-${car.id}`}>
                        <div>
                          <div className="flex items-center justify-between" id={`card-title-row-${car.id}`}>
                            <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors text-sm truncate">
                              {car.make} {car.model}
                            </h3>
                            <span className="text-xs font-mono text-gray-400">{car.year}</span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 bg-slate-50 py-1 px-1.5 rounded" id={`card-details-row-${car.id}`}>
                            <Gauge className="w-3.5 h-3.5 text-gray-400" />
                            <span className="font-mono font-semibold">{car.mileage.toLocaleString()} km</span>
                            <span className="text-gray-300">|</span>
                            <span className="font-mono text-gray-400 text-[10px] truncate max-w-32">VIN: {car.vin.substring(0, 10)}...</span>
                          </p>
                        </div>

                        {/* Driver footer slot */}
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between" id={`card-driver-sec-${car.id}`}>
                          <div className="flex items-center gap-2" id={`driver-meta-${car.id}`}>
                            <div className={`p-1.5 rounded-lg ${driverAssigned ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div className="text-left">
                              <p className="text-[9px] uppercase tracking-wide font-medium text-gray-400">Driver Assigned</p>
                              <p className="text-xs font-semibold text-gray-800 line-clamp-1">
                                {driverAssigned ? driverAssigned.fullName : 'No Driver Mapped'}
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
                  <h4 className="font-bold text-gray-800 text-sm">No Vehicles Found</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">No cars matched your combination of license plate, driver name, or status filters.</p>
                  <button
                    onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
                    className="mt-3.5 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition-colors"
                    id="btn-reset-filters"
                  >
                    Reset Active Filters
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT SECTION: Deep Inspector / Car details & Service logs - Grid Column span 5 */}
          <section className="lg:col-span-5" id="fleet-details-container">
            {selectedCar ? (
              <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm sticky top-24" id="vehicle-details-card">
                
                {/* Vehicle header Cover photo */}
                <div className="relative h-56 bg-slate-100" id="detail-img-pane">
                  <img
                    src={selectedCar.photos[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80'}
                    alt={`${selectedCar.make} ${selectedCar.model}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Photo replace trigger */}
                  <button
                    onClick={() => {
                      setNewCarPhoto(''); // Trigger capture mode
                      setShowCamera(true);
                    }}
                    className="absolute bottom-3 right-3 bg-black/75 hover:bg-black text-white p-2 text-xs font-medium rounded-lg flex items-center gap-1.5 backdrop-blur-xs cursor-pointer shadow-sm transition-all"
                    id="btn-update-photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Change Image
                  </button>

                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-900/15 to-transparent flex flex-col justify-end p-5">
                    <p className="text-[10px] text-indigo-300 font-mono font-bold tracking-wider uppercase">Active Fleet Asset</p>
                    <h2 className="text-white text-lg font-extrabold tracking-tight mt-0.5">
                      {selectedCar.make} {selectedCar.model}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5" id="detail-indicators-row">
                      <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 bg-white/20 text-white rounded text-center uppercase tracking-wide">
                        {selectedCar.plateNumber}
                      </span>
                      <span className="text-[10px] text-gray-200 font-medium">
                        • {selectedCar.year} Model
                      </span>
                      <span className="text-[10px] text-gray-200 font-medium">
                        • {selectedCar.color}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub Panel details */}
                <div className="p-5 space-y-6" id="detail-card-panel">
                  {/* Row 1: Vehicle Specs */}
                  <div className="grid grid-cols-2 gap-3.5" id="spec-fields">
                    <div className="p-3 bg-gray-50/75 border border-gray-100 rounded-xl" id="field-vin">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Hash className="w-3 h-3" /> VIN Number
                      </p>
                      <p className="text-xs font-mono font-bold text-gray-800 mt-1 break-all select-all">{selectedCar.vin}</p>
                    </div>

                    <div className="p-3 bg-gray-50/75 border border-gray-100 rounded-xl" id="field-odometer">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Gauge className="w-3 h-3" /> Odometer km
                      </p>
                      <p className="text-xs font-mono font-bold text-gray-800 mt-1">{selectedCar.mileage.toLocaleString()} km</p>
                    </div>
                  </div>

                  {/* Operational Settings Status controls */}
                  <div className="space-y-2 border-t border-gray-100 pt-4" id="fleet-operational-controls">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      Operational Status
                    </label>
                    <div className="grid grid-cols-4 gap-1.5" id="car-detail-status-strip">
                      {(['Available', 'Assigned', 'Maintenance', 'Out of Service'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => {
                            // If user selects Assigned, make sure there is a driver. Else show available
                            if (st === 'Assigned' && !selectedCarDriver) {
                              alert('Please assign a Driver from the menu below to update operational status to Assigned.');
                              return;
                            }
                            updateCarStatus(selectedCar.id, st);
                          }}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            selectedCar.status === st
                              ? st === 'Available' ? 'bg-emerald-600 text-white shadow-xs' :
                                st === 'Assigned' ? 'bg-indigo-600 text-white shadow-xs' :
                                st === 'Maintenance' ? 'bg-amber-500 text-white shadow-xs' :
                                'bg-rose-600 text-white shadow-xs'
                              : 'bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 border border-transparent'
                          }`}
                          id={`detail-status-btn-${st.replace(/\s+/g, '-').toLowerCase()}`}
                        >
                          {st === 'Out of Service' ? 'OOS' : st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Driver Module Section */}
                  <div className="border-t border-gray-100 pt-4 space-y-3" id="assigned-driver-section">
                    <div className="flex items-center justify-between" id="driver-hdr-sec">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Driver Assignment
                      </label>
                      <div className="flex items-center gap-2">
                        {selectedCarDriver && (
                          <>
                            <button
                              onClick={() => startEditDriver(selectedCarDriver)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer py-0.5 px-1.5 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors flex items-center gap-1"
                              id="btn-edit-driver-trigger"
                            >
                              <Edit className="w-3 h-3" /> Edit Profile
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleDirectDriverUnassign(selectedCar.id)}
                              className="text-[10px] text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                              id="btn-unassign-driver"
                            >
                              Release Driver
                            </button>
                          </>
                        )}
                        <span className="text-gray-300">{selectedCarDriver ? '|' : ''}</span>
                        <button
                          onClick={() => setIsManagingDrivers(true)}
                          className="text-[10px] text-gray-500 hover:text-indigo-600 font-semibold cursor-pointer"
                          id="btn-manage-drivers-trigger"
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
                            <div className="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs mt-0.5">
                              {selectedCarDriver.fullName.split(' ').map(n=>n[0]).join('')}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-bold text-gray-800">{selectedCarDriver.fullName}</p>
                            <div className="flex flex-col gap-0.5 mt-1 text-[10px] text-indigo-600 font-mono font-medium" id="driver-ids-detail">
                              <span className="flex items-center gap-1"><span className="text-gray-400">Licence:</span> {selectedCarDriver.licenseNumber}</span>
                              <span className="flex items-center gap-1"><span className="text-gray-400">NRC No:</span> {selectedCarDriver.nrcNumber || 'MOCK-992/10/1'}</span>
                            </div>
                            
                            <div className="flex flex-col gap-0.5 mt-1.5 text-[10px] text-gray-500" id="driver-contacts-detail">
                              <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" /> {selectedCarDriver.email}</span>
                              <span className="flex items-center gap-1"><Smartphone className="w-3 h-3 text-gray-400" /> {selectedCarDriver.phone}</span>
                            </div>
                          </div>
                        </div>

                        <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase shrink-0">
                          {selectedCarDriver.status}
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50/70 border border-dashed border-gray-200 rounded-xl space-y-2 text-center" id="no-driver-badge">
                        <p className="text-xs text-gray-400 italic">No staff driver is currently assigned. Choose an available driver:</p>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleDirectDriverAssign(selectedCar.id, e.target.value);
                              e.target.value = ''; // Reset select
                            }
                          }}
                          className="mx-auto block text-xs bg-white border border-gray-200 px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-xs text-gray-700 font-medium"
                          id="select-driver-assignment"
                          defaultValue=""
                        >
                          <option value="" disabled>-- Select Driver to Assign --</option>
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
                            * All registered drivers have already been assigned a car.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tab Selector for Service & Repairs vs Finance */}
                  <div className="border-t border-gray-100 pt-4" id="utility-tabs-segment">
                    <div className="flex border border-gray-200/80 p-1 bg-gray-50/70 rounded-xl gap-2 mb-4" id="tab-btns-con">
                      <button
                        type="button"
                        onClick={() => setActiveDetailTab('service')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          activeDetailTab === 'service'
                            ? 'bg-white text-indigo-700 shadow-sm border border-gray-150'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                        id="tab-btn-service"
                      >
                        <Wrench className="w-3.5 h-3.5 text-indigo-500" />
                        Service Logs ({selectedCar.serviceLogs.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDetailTab('finance')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          activeDetailTab === 'finance'
                            ? 'bg-white text-indigo-750 shadow-sm border border-gray-150'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                        id="tab-btn-finance"
                      >
                        <Coins className="w-3.5 h-3.5 text-indigo-600" />
                        Cashings Tracker ({(selectedCar.revenueLogs || []).filter(r => r.status !== 'Pending').length})
                      </button>
                    </div>
 
                    {/* TAB PANEL 1: SERVICE LOGS */}
                    {activeDetailTab === 'service' && (
                      <div className="space-y-4" id="service-tab-panel">
                        <div className="flex items-center justify-between pb-1" id="service-history-hdr">
                          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                            Active Service History
                          </label>
                        </div>

                        {/* Service Logs Chronological Timeline */}
                        <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1" id="service-timeline">
                          {selectedCar.serviceLogs.length > 0 ? (
                            selectedCar.serviceLogs.map((log) => {
                              return (
                                <div
                                  key={log.id}
                                  onClick={(e) => {
                                    if ((e.target as HTMLElement).closest('button')) return;
                                    setSelectedServiceLogForPopup(log);
                                  }}
                                  className="relative pl-5 border-l-2 border-indigo-200 text-xs text-left group animate-fade-in p-3 rounded-xl transition-all cursor-pointer bg-white border border-slate-150/70 shadow-3xs hover:bg-indigo-50/25 hover:border-indigo-350 hover:shadow-2xs hover:-translate-x-0.5 active:scale-[0.99] duration-200"
                                  id={`log-item-${log.id}`}
                                >
                                  {/* Bullet circle dot */}
                                  <div className="absolute -left-1.5 top-4.5 w-3 h-3 bg-indigo-100 group-hover:bg-indigo-200 text-indigo-600 rounded-full border border-white flex items-center justify-center transition-colors" id={`log-bullet-${log.id}`}>
                                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                                  </div>
                                  
                                  <div className="flex items-center justify-between" id={`log-meta-row-${log.id}`}>
                                    <span className="font-bold text-gray-800">{log.category}</span>
                                  </div>

                                  <p className="text-gray-650 mt-1 leading-relaxed bg-gray-50/50 p-2 rounded-lg border border-gray-100/50 text-[11px] line-clamp-1">
                                    {log.description}
                                  </p>

                                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-gray-400 font-medium" id={`log-lower-row-${log.id}`}>
                                    <span className="flex items-center gap-0.5 bg-gray-100 py-0.5 px-2 rounded-full font-semibold text-gray-600">
                                      Cost: zmk {log.cost}
                                    </span>
                                    <span className="flex items-center gap-0.5 bg-gray-100 py-0.5 px-2 rounded-full font-semibold text-gray-650">
                                      <Gauge className="w-3 text-gray-400" /> {log.mileage.toLocaleString()} km
                                    </span>
                                    <span className="text-gray-350">|</span>
                                    <span>By: {log.performedBy || 'Fleet Auto Prep Team'}</span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-6 text-center border border-dashed border-gray-100 rounded-xl" id="empty-logs-slate">
                              <FileText className="w-6 h-6 text-gray-300 mx-auto" />
                              <p className="text-xs text-gray-400 italic mt-1.5">No logged service work recorded for this asset.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB PANEL 2: CASHING & FINANCE */}
                    {activeDetailTab === 'finance' && (() => {
                      const revenuesList = selectedCar.revenueLogs || [];
                      
                      // Calculate filtering
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
                        return true; // value 'all'
                      });

                      // Statistics derived based ONLY on Approved entries
                      const approvedRevs = filteredRevs.filter(r => r.status !== 'Pending');
                      const totalCashing = approvedRevs.reduce((sum, item) => sum + item.amount, 0);
                      
                      // Category-wise totals
                      const fareSum = approvedRevs.filter(r => r.category === 'Fare').reduce((s, r) => s + r.amount, 0);
                      const rentalSum = approvedRevs.filter(r => r.category === 'Rental').reduce((s, r) => s + r.amount, 0);
                      const deliverySum = approvedRevs.filter(r => r.category === 'Delivery').reduce((s, r) => s + r.amount, 0);
                      const contractSum = approvedRevs.filter(r => r.category === 'Contract').reduce((s, r) => s + r.amount, 0);
                      const otherSum = approvedRevs.filter(r => r.category === 'Other').reduce((s, r) => s + r.amount, 0);

                      const farePct = totalCashing > 0 ? (fareSum / totalCashing) * 100 : 0;
                      const rentalPct = totalCashing > 0 ? (rentalSum / totalCashing) * 100 : 0;
                      const deliveryPct = totalCashing > 0 ? (deliverySum / totalCashing) * 100 : 0;
                      const contractPct = totalCashing > 0 ? (contractSum / totalCashing) * 100 : 0;
                      const otherPct = totalCashing > 0 ? (otherSum / totalCashing) * 100 : 0;

                      return (
                        <div className="space-y-4" id="finance-tab-panel">
                          
                          {/* Financial period switcher */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 border border-gray-200 p-3 rounded-xl text-left" id="finance-filter-header">
                            <div className="space-y-1.5 flex-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cashing Analysis Period</span>
                              <div className="flex flex-wrap gap-1" id="finance-period-capsules">
                                {[
                                  { id: 'all', label: 'All-Time' },
                                  { id: '7d', label: 'Last 7 Days' },
                                  { id: '30d', label: 'Last 30 Days' },
                                  { id: 'this_month', label: 'This Month' },
                                  { id: 'last_month', label: 'Last Month' }
                                ].map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setSelectedFinancePeriod(p.id as any)}
                                    className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                      selectedFinancePeriod === p.id
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'
                                    }`}
                                    id={`fin-period-btn-${p.id}`}
                                  >
                                    {p.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                              <button
                                type="button"
                                onClick={() => handlePrintSummary(selectedCar, approvedRevs, selectedFinancePeriod, totalCashing)}
                                className="text-[10px] bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 p-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                                id="btn-print-finance-summary"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-500" /> Print Summary
                              </button>
                              
                              <button
                                type="button"
                                disabled={isExportingPDF}
                                onClick={() => handleDownloadPDF(selectedCar, approvedRevs, selectedFinancePeriod, totalCashing)}
                                className={`text-[10px] text-white font-bold p-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                                  isExportingPDF
                                    ? 'bg-indigo-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                                id="btn-download-finance-pdf"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                                {isExportingPDF ? 'Exporting...' : 'Download PDF'}
                              </button>
                            </div>
                          </div>

                          {/* Stat Metric Cards Grid */}
                          <div className="grid grid-cols-2 gap-3" id="finance-stats-summary">
                            <div className="bg-emerald-50/45 p-3 rounded-xl border border-emerald-100/60 flex items-center justify-between text-left">
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800/80">Total Cashed</span>
                                <p className="text-base font-black text-emerald-700 font-mono mt-0.5">
                                  zmk {totalCashing.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div className="p-1.5 bg-emerald-500 text-white rounded-lg">
                                <TrendingUp className="w-4 h-4" />
                              </div>
                            </div>

                            <div className="bg-indigo-50/45 p-3 rounded-xl border border-indigo-100/60 flex items-center justify-between text-left">
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-800/80">Receipt Count</span>
                                <p className="text-base font-black text-indigo-700 font-mono mt-0.5">
                                  {approvedRevs.length} logs
                                </p>
                              </div>
                              <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                                <Coins className="w-4 h-4" />
                              </div>
                            </div>
                          </div>

                          {/* Multi-Colored Progressive Stream Balance Bar */}
                          {totalCashing > 0 ? (
                            <div className="p-3 bg-white border border-gray-150 rounded-xl space-y-2 text-left" id="cash-stream-ratio">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Intake Stream Proportions</span>
                              
                              <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100/90" id="finance-stacked-bar">
                                {rentalSum > 0 && <div className="bg-indigo-650 h-full transition-all" style={{ width: `${rentalPct}%` }} title={`Rental: ${rentalPct.toFixed(0)}%`} />}
                                {fareSum > 0 && <div className="bg-emerald-500 h-full transition-all" style={{ width: `${farePct}%` }} title={`Fare: ${farePct.toFixed(0)}%`} />}
                                {deliverySum > 0 && <div className="bg-amber-500 h-full transition-all" style={{ width: `${deliveryPct}%` }} title={`Delivery: ${deliveryPct.toFixed(0)}%`} />}
                                {contractSum > 0 && <div className="bg-purple-600 h-full transition-all" style={{ width: `${contractPct}%` }} title={`Contract: ${contractPct.toFixed(0)}%`} />}
                                {otherSum > 0 && <div className="bg-gray-400 h-full transition-all" style={{ width: `${otherPct}%` }} title={`Other: ${otherPct.toFixed(0)}%`} />}
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[9px] text-gray-500 font-bold pt-1" id="finance-stream-chart-legend">
                                {rentalSum > 0 && (
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded bg-indigo-655" /> Rental: zmk {rentalSum.toFixed(0)} ({rentalPct.toFixed(0)}%)
                                  </span>
                                )}
                                {fareSum > 0 && (
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded bg-emerald-500" /> Fare: zmk {fareSum.toFixed(0)} ({farePct.toFixed(0)}%)
                                  </span>
                                )}
                                {deliverySum > 0 && (
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded bg-amber-500" /> Delivery: zmk {deliverySum.toFixed(0)} ({deliveryPct.toFixed(0)}%)
                                  </span>
                                )}
                                {contractSum > 0 && (
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded bg-purple-600" /> Contract: zmk {contractSum.toFixed(0)} ({contractPct.toFixed(0)}%)
                                  </span>
                                )}
                                {otherSum > 0 && (
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded bg-gray-400" /> Other: zmk {otherSum.toFixed(0)} ({otherPct.toFixed(0)}%)
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-gray-50/50 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400 italic">
                              No financial streams calculated for selected timeframe.
                            </div>
                          )}

                          {/* Record interactive actions */}
                          <div className="flex items-center justify-between pb-1 border-b border-gray-100" id="cashings-header-bar">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block text-left">Cashings Ledger</span>
                            <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 rounded-lg px-2 py-0.5">
                              Submitted by Drivers
                            </span>
                          </div>

                          {/* Horizontal Timeline list of Transactions */}
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
                                      isExpanded ? 'bg-emerald-50/20 border-emerald-250 ring-1 ring-emerald-500/5 shadow-xs' : 'border-gray-150 hover:bg-slate-50/50 hover:border-gray-200'
                                    } animate-fade-in`}
                                    id={`rev-item-${rev.id}`}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex items-start gap-2 max-w-[70%]">
                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${
                                      rev.category === 'Rental' ? 'bg-indigo-650' :
                                      rev.category === 'Fare' ? 'bg-emerald-500' :
                                      rev.category === 'Delivery' ? 'bg-amber-500' :
                                      rev.category === 'Contract' ? 'bg-purple-600' :
                                      'bg-gray-400'
                                    }`} />
                                    <div>
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="font-bold text-gray-900">{rev.category}</span>
                                        <span className="text-[9px] text-gray-400 font-mono bg-gray-100 py-0.5 px-1.5 rounded">{rev.date}</span>
                                        {rev.driverName && (
                                          <span className="text-[9px] font-semibold text-indigo-700 bg-indigo-50/80 px-1.5 py-0.5 rounded-full" title={`Handled by driver ${rev.driverName}`}>
                                            👤 {rev.driverName}
                                          </span>
                                        )}
                                        {rev.status === 'Pending' ? (
                                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md animate-pulse">
                                            ⏳ Pending Approval
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">
                                            ✅ Approved
                                          </span>
                                        )}
                                      </div>
                                      <p className={`text-[11px] text-gray-500 mt-0.5 break-words ${isExpanded ? '' : 'line-clamp-1'}`}>{rev.description}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 font-mono shrink-0" id={`rev-side-${rev.id}`} onClick={(e) => e.stopPropagation()}>
                                    <span className="text-emerald-600 font-bold text-xs bg-emerald-50 py-0.5 px-2 rounded-lg">
                                      +zmk {rev.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                    {rev.status === 'Pending' && (
                                      <button
                                        type="button"
                                        onClick={() => handleApproveRevenueLog(selectedCar.id, rev.id)}
                                        className="bg-emerald-600 hover:bg-emerald-750 text-white font-bold py-1 px-2.5 rounded-lg text-[9px] min-h-[22px] transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-xs border border-emerald-500 font-sans"
                                        title="Confirm and Approve Cashing"
                                        id={`btn-approve-rev-${rev.id}`}
                                      >
                                        <Check className="w-3 h-3 text-white animate-bounce" /> Approve
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRevenueLog(selectedCar.id, rev.id)}
                                      className="text-gray-300 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                                      title="Delete transaction log entry"
                                      id={`btn-del-rev-${rev.id}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Deep details expansion container */}
                                {isExpanded && (
                                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 cursor-default mt-1" onClick={(e) => e.stopPropagation()} id={`rev-expanded-${rev.id}`}>
                                    <div className="flex items-center justify-between border-b border-gray-200 pb-2 font-bold text-slate-800">
                                      <span className="flex items-center gap-1 font-sans">💳 Verified Income Record</span>
                                      <span className="font-mono text-[9px] text-slate-400">ID: TRX-{rev.id.toUpperCase()}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[11px]">
                                      <div>
                                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Target Fleet Asset</span>
                                        <span className="font-semibold text-slate-755">{selectedCar.make} {selectedCar.model}</span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Reg Plate</span>
                                        <span className="font-mono font-semibold text-slate-755">{selectedCar.plateNumber}</span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Cashing Category</span>
                                        <span className="font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md inline-block mt-0.5">{rev.category}</span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block font-sans">Reported Date</span>
                                        <span className="font-semibold text-slate-755 font-mono">{rev.date}</span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block font-sans">Amount (zmk)</span>
                                        <span className="font-mono font-black text-emerald-600 text-xs">zmk {rev.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Audit State</span>
                                        <p className="mt-1">
                                          {rev.status === 'Pending' ? (
                                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block leading-none">⏳ Pending Verification Approval</span>
                                          ) : (
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block leading-none">✓ Audited & Approved</span>
                                          )}
                                        </p>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Reported By Operator</span>
                                        <span className="font-semibold text-indigo-800 bg-indigo-50/50 border border-indigo-100 px-2.5 py-1.5 rounded-md block mt-0.5">👤 {rev.driverName || 'Anonymous Operator / Direct Fleet'}</span>
                                      </div>
                                      <div className="col-span-2 border-t border-slate-200 pt-2.5">
                                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Cashing Notes & Narrative Commentary</span>
                                        <p className="text-slate-650 leading-relaxed bg-white p-2.5 rounded border border-slate-150 font-normal">
                                          {rev.description || 'No additional text commentary attached to this transaction.'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                              <div className="py-8 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/30" id="empty-revenues-slate">
                                <Coins className="w-6 h-6 text-gray-300 mx-auto" />
                                <p className="text-xs text-gray-400 italic mt-1.5">No cashing receipts recorded for selected timeframe.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Danger Zone */}
                  <div className="border-t border-gray-100 pt-5 flex items-center justify-between" id="danger-zone-details">
                    <div className="text-[10px] text-gray-400">
                      Registered: {new Date(selectedCar.createdAt).toLocaleDateString()}
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to permanently delete this vehicle from the fleet? All logs and photo links will be lost.')) {
                          deleteCarAsset(selectedCar.id);
                        }
                      }}
                      className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 py-1.5 px-2.5 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                      id="btn-delete-asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Terminate Asset Record
                    </button>
                  </div>

                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-250 p-12 text-center" id="empty-select-car-details">
                <Car className="w-10 h-10 text-gray-300 mx-auto" />
                <h3 className="font-bold text-gray-700 text-sm mt-2">No Vehicle Selected</h3>
                <p className="text-xs text-gray-400 mt-1">Select a car card from the left fleet directory view to inspect specs, drivers, and full maintenance history logs.</p>
              </div>
            )}
          </section>

        </div>
      </main>
    </>
  ) : (
    renderFinanceDashboard()
  )) : (() => {
    const activeDriver = drivers.find(d => d.id === activeDriverId);
    const assignedCar = activeDriver ? cars.find(c => c.id === activeDriver.assignedCarId) : null;

    return (
      <div className="flex-1 bg-slate-50/60 py-8 px-4 sm:px-6 md:px-8 max-w-5xl mx-auto w-full space-y-6" id="driver-portal-wrapper">
        
        {/* Dynamic Success Toast banner */}
        {driverSuccessMsg && (
          <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-lg border border-emerald-500 flex items-center gap-3 animate-fade-in fixed bottom-8 right-8 z-50 max-w-md" id="drv-success-toast">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-xs font-semibold">{driverSuccessMsg}</span>
          </div>
        )}

        {/* Driver Identity Card info */}
        {!activeDriver ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs" id="drv-no-identity">
            <User className="w-12 h-12 text-slate-300 mx-auto animate-pulse" />
            <h3 className="font-bold text-slate-800 mt-3 text-base">Select Your Driver Identity</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Please choose a driver identity from the dropdown in the top header bar to begin viewing vehicle tasks, fuel consumption logs, and cashing entry forms.
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in" id="driver-active-portal">
            
            {/* Active Profile Info Panel */}
            <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" id="drv-profile-strip">
              <div className="flex items-center gap-4 text-left">
                {activeDriver.profilePicture ? (
                  <img src={activeDriver.profilePicture} alt={activeDriver.fullName} className="w-12 h-12 rounded-2xl shadow-md border border-indigo-200 object-cover shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="bg-indigo-650 text-white w-12 h-12 rounded-2xl shadow-md shadow-indigo-600/10 flex items-center justify-center font-bold text-lg shrink-0">
                    {activeDriver.fullName.split(' ').map(n => n[0]).join('')}
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-850">{activeDriver.fullName}</h2>
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
                    <span>• Phone: <strong className="text-slate-850">{activeDriver.phone}</strong></span>
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

            {/* If No Car is Assigned */}
            {!assignedCar ? (
              <div className="bg-white rounded-3xl border border-gray-150 p-10 text-center shadow-xs space-y-4" id="drv-unassigned-panel">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-100">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="font-bold text-slate-805 text-base">No Assigned Vehicle Record</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Hi {activeDriver.fullName.split(' ')[0]}, you do not have any vehicle assigned to you currently in the fleet registry.
                  </p>
                  <div className="pt-2 text-left bg-slate-50 p-4 rounded-xl border border-slate-200/40" id="demo-assign-control">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">💡 Demo Mode: Instantly link a fleet asset to this user profile:</p>
                    <select
                      onChange={(e) => {
                        const targetCarId = e.target.value;
                        if (!targetCarId) return;
                        setDrivers(prev => prev.map(d => d.id === activeDriver.id ? { ...d, assignedCarId: targetCarId } : d));
                        setCars(prev => prev.map(car => car.id === targetCarId ? { ...car, status: 'Assigned' } : car));
                        triggerDriverSuccess(`🚘 Co-assigned to vehicle asset successfully!`);
                      }}
                      defaultValue=""
                      className="bg-white border border-slate-205 text-slate-800 text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer focus:outline-none w-full shadow-xs"
                      id="drv-assign-self-selector"
                    >
                      <option value="" disabled>-- Select Car to Assign Instantly --</option>
                      {cars.filter(c => c.status === 'Available' || !drivers.some(d => d.assignedCarId === c.id)).map(car => (
                        <option key={car.id} value={car.id}>
                          {car.make} {car.model} ({car.plateNumber})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="driver-main-portal-cols">
                
                {/* Left Column: Assigned Car Specs Card */}
                <div className="space-y-4 lg:col-span-1" id="driver-assigned-car-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider text-left block">Assigned Physical Asset</span>
                  
                  <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm" id="drv-assigned-car-card">
                    {/* Photo area with modern fallback */}
                    <div className="h-44 bg-slate-900 relative flex items-center justify-center overflow-hidden" id="drv-car-img-area">
                      {assignedCar.photos && assignedCar.photos.length > 0 ? (
                        <img src={assignedCar.photos[0]} alt="Assigned Car photo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <Car className="w-10 h-10 text-slate-600 mb-2 animate-pulse" />
                          <span className="text-[10px] uppercase tracking-wide font-mono font-bold text-slate-500">Fleet Photographic Log</span>
                        </div>
                      )}
                      <span className="absolute top-3 left-3 bg-indigo-600 text-white font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                        {assignedCar.status}
                      </span>
                      <span className="absolute bottom-3 right-3 bg-slate-950/80 text-white font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                        {assignedCar.plateNumber}
                      </span>
                    </div>

                    {/* Body Specs detail panel */}
                    <div className="p-4 space-y-3.5 text-left" id="drv-car-specs-pane">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{assignedCar.make} {assignedCar.model}</h4>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-slate-400">
                          <span>Yr: {assignedCar.year}</span>
                          <span>•</span>
                          <span>Color: {assignedCar.color}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t border-b border-slate-100 py-3 text-center" id="drv-car-gains">
                        <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 flex flex-col items-center">
                          <Gauge className="w-4 h-4 text-emerald-500 mb-1" />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider scale-90">Odometer</span>
                          <span className="text-xs font-bold font-mono text-slate-800 mt-0.5">{assignedCar.mileage.toLocaleString()} km</span>
                        </div>
                        <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 flex flex-col items-center">
                          <Wrench className="w-4 h-4 text-indigo-500 mb-1" />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider scale-90">Service logs</span>
                          <span className="text-xs font-bold font-mono text-slate-800 mt-0.5">{assignedCar.serviceLogs.length} events</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600" id="drv-car-meta-desc">
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-[10px] uppercase font-bold text-left">VIN Serial</span>
                          <span className="font-mono font-bold text-slate-800 text-[11px] text-right">{assignedCar.vin}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-[10px] uppercase font-bold text-left">Age deployed</span>
                          <span className="font-semibold text-slate-850 text-right">{new Date().getFullYear() - assignedCar.year} years</span>
                        </div>
                      </div>

                      {/* Quick demo unassign trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm('Simulate returning/unassigning this vehicle back to the available manager pool?')) return;
                          setDrivers(prev => prev.map(d => d.id === activeDriver.id ? { ...d, assignedCarId: null } : d));
                          setCars(prev => prev.map(car => car.id === assignedCar.id ? { ...car, status: 'Available' } : car));
                          triggerDriverSuccess('🚘 Returned car asset back to pool successfully!');
                        }}
                        className="w-full mt-2 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100/50 text-red-650 rounded-xl text-[10px] font-semibold transition-all cursor-pointer"
                        id="drv-unassign-self-btn"
                      >
                        Simulate Returning Vehicle
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Active Interactive Actions Forms OR Active History logs */}
                <div className="lg:col-span-2 space-y-4 text-left" id="driver-actions-panel-col">
                  
                  {driverPortalTab === 'log_work' ? (
                    <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-5" id="driver-log-actions-card">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3" id="drv-log-options-hdr">
                        <div>
                          <h3 className="font-bold text-slate-850 text-sm">Record Mobile Operations Logs</h3>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">All inputs immediately update vehicle timelines & manager metrics live.</p>
                        </div>

                        {/* Pill toggle of logs sub-tabs */}
                        <div className="flex bg-slate-100 p-0.5 rounded-xl self-start sm:self-auto" id="drv-sub-tabs-pill">
                          <button
                            type="button"
                            onClick={() => setDriverLogSubTab('maintenance')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                              driverLogSubTab === 'maintenance' ? 'bg-white text-indigo-750 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                            id="drv-sub-btn-svc"
                          >
                            Maintenance
                          </button>
                          <button
                            type="button"
                            onClick={() => setDriverLogSubTab('cashing')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                              driverLogSubTab === 'cashing' ? 'bg-white text-emerald-650 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                            id="drv-sub-btn-cashing"
                          >
                            Cashing
                          </button>
                        </div>
                      </div>

                      {/* Active Form Display */}
                      {driverLogSubTab === 'maintenance' && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleDriverAddServiceLog(assignedCar.id, activeDriver.fullName);
                          }}
                          className="space-y-4 animate-fade-in text-left"
                          id="form-drv-svc"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date Performed*</label>
                              <input
                                type="date"
                                required
                                value={drvSvcDate}
                                onChange={(e) => setDrvSvcDate(e.target.value)}
                                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none"
                                id="drv-svc-input-date"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Service category*</label>
                              <select
                                value={drvSvcCat}
                                onChange={(e) => setDrvSvcCat(e.target.value as any)}
                                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 leading-tight focus:outline-none"
                                id="drv-svc-input-cat"
                              >
                                <option value="Maintenance">Maintenance</option>
                                <option value="Repair">Repair</option>
                                <option value="Inspection">Inspection</option>
                                <option value="Tire Service">Tire Service</option>
                                <option value="Oil Change">Oil Change</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Update Mileage (km)*</label>
                              <input
                                type="number"
                                required
                                min={assignedCar.mileage}
                                placeholder={String(assignedCar.mileage)}
                                value={drvSvcMiles || ''}
                                onChange={(e) => setDrvSvcMiles(Number(e.target.value))}
                                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none"
                                id="drv-svc-input-miles"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Expense Cost (zmk)*</label>
                            <input
                              type="number"
                              required
                              min="0"
                              placeholder="e.g. 150.00"
                              value={drvSvcCost || ''}
                              onChange={(e) => setDrvSvcCost(Number(e.target.value))}
                              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none"
                              id="drv-svc-input-cost"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description of Work*</label>
                            <textarea
                              required
                              rows={3}
                              placeholder="e.g. Completed filter repairs or route wheel tyre balance..."
                              value={drvSvcDesc}
                              onChange={(e) => setDrvSvcDesc(e.target.value)}
                              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none font-normal"
                              id="drv-svc-input-desc"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer text-center"
                            id="drv-svc-submit"
                          >
                            Commit Maintenance / Service Event log
                          </button>
                        </form>
                      )}



                      {driverLogSubTab === 'cashing' && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleDriverAddRevenueLog(assignedCar.id, activeDriver.id, activeDriver.fullName);
                          }}
                          className="space-y-4 animate-fade-in text-left"
                          id="form-drv-rev"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cashing Shift Date*</label>
                              <input
                                type="date"
                                required
                                value={drvRevDate}
                                onChange={(e) => setDrvRevDate(e.target.value)}
                                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-805 focus:outline-none"
                                id="drv-rev-input-date"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cashing Contract Category*</label>
                              <select
                                value={drvRevCat}
                                onChange={(e) => setDrvRevCat(e.target.value as any)}
                                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                                id="drv-rev-input-cat"
                              >
                                <option value="Fare">Fare / Passenger Shift</option>
                                <option value="Rental">Rental Yield</option>
                                <option value="Delivery">Delivery Contract</option>
                                <option value="Contract">Trip Contract</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Gross Yield Amount (zmk)*</label>
                              <input
                                type="number"
                                required
                                min="0.01"
                                step="0.01"
                                placeholder="e.g. 180"
                                value={drvRevAmount || ''}
                                onChange={(e) => setDrvRevAmount(Number(e.target.value))}
                                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none"
                                id="drv-rev-input-amount"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Memo description of logs / trips performed*</label>
                            <textarea
                              required
                              rows={3}
                              placeholder="trip logs details: e.g. completed city shuttle transfers, afternoon shifts log..."
                              value={drvRevDesc}
                              onChange={(e) => setDrvRevDesc(e.target.value)}
                              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none font-normal"
                              id="drv-rev-input-desc"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer text-center"
                            id="drv-rev-submit"
                          >
                            Commit Payment Yield / Cashing
                          </button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-5" id="driver-logs-history-card">
                      <div className="text-left border-b border-slate-100 pb-3" id="drv-hist-hdr">
                        <h3 className="font-bold text-slate-800 text-sm">Historical Operator Records</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Below is a log history of events committed by you or logged for this specific vehicle.</p>
                      </div>

                      <div className="space-y-6" id="drv-historical-subcollections">
                        {/* Repairs logged list */}
                        <div className="space-y-2 text-left" id="drv-hist-svc-section">
                          <span className="text-[10px] uppercase font-bold text-indigo-650 tracking-wider">🛠️ Service/Repair Log</span>
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1" id="drv-hist-svc-list">
                            {assignedCar.serviceLogs.length > 0 ? (
                              assignedCar.serviceLogs.map((log: any) => {
                                const isExpanded = expandedLogId === log.id;
                                return (
                                  <div
                                    key={log.id}
                                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                    className={`p-2.5 bg-slate-50/50 rounded-xl border flex flex-col gap-2 text-xs font-semibold cursor-pointer transition-all ${
                                      isExpanded ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-50/20 ring-inset' : 'border-slate-100 hover:bg-slate-100/50'
                                    }`}
                                    id={`drv-hist-svc-${log.id}`}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <strong className="text-slate-800">{log.category}</strong>
                                          <span className="text-[9px] text-slate-400 font-mono bg-white py-0.5 px-1.5 rounded border border-slate-100">{log.date}</span>
                                        </div>
                                        <p className={`text-[10px] text-slate-500 mt-0.5 font-normal leading-relaxed ${isExpanded ? '' : 'line-clamp-1'}`}>{log.description}</p>
                                      </div>
                                      <span className="text-indigo-600 font-bold font-mono text-xs shrink-0 ml-2">zmk {log.cost}</span>
                                    </div>

                                    {/* Expanded information drawer */}
                                    {isExpanded && (
                                      <div className="p-3 bg-white border border-indigo-100/80 rounded-lg space-y-2 text-[10px]" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-between border-b border-indigo-50 pb-1.5 font-bold text-indigo-900">
                                          <span>📁 Maintenance Activity Report</span>
                                          <span className="font-mono text-[8px] text-indigo-400">ID: SVC-{log.id.toUpperCase()}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-slate-500 font-normal">
                                          <div>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Mileage Logged</span>
                                            <span className="font-semibold text-slate-700">{log.mileage.toLocaleString()} km</span>
                                          </div>
                                          <div>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Registered Odometer</span>
                                            <span className="font-semibold text-slate-755">{assignedCar.plateNumber}</span>
                                          </div>
                                          <div>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Authorized Garage</span>
                                            <span className="font-semibold text-slate-700">{log.performedBy || 'Fleet Auto Prep Team'}</span>
                                          </div>
                                          <div>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Labor Cost Charged</span>
                                            <span className="font-mono font-semibold text-indigo-600">zmk {log.cost}</span>
                                          </div>
                                          <div className="col-span-2 border-t border-slate-50 pt-1.5">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Work Description Details</span>
                                            <p className="text-slate-650 bg-slate-50 p-2 rounded border border-slate-100 leading-normal">{log.description}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-[10px] text-slate-400 italic font-normal">No maintenance work logged on this unit.</p>
                            )}
                          </div>
                        </div>



                        {/* Cashings tracked list */}
                        <div className="space-y-2 text-left" id="drv-hist-rev-section">
                          <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">💰 Cashing Receipts Ledger</span>
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1" id="drv-hist-rev-list">
                            {(assignedCar.revenueLogs || []).filter(r => r.driverId === activeDriver.id).length > 0 ? (
                              (assignedCar.revenueLogs || []).filter(r => r.driverId === activeDriver.id).map((rev: any) => {
                                const isExpanded = expandedLogId === rev.id;
                                return (
                                  <div
                                    key={rev.id}
                                    onClick={() => setExpandedLogId(isExpanded ? null : rev.id)}
                                    className={`p-2.5 bg-slate-50/50 rounded-xl border flex flex-col gap-2 text-xs font-semibold cursor-pointer transition-all ${
                                      isExpanded ? 'bg-emerald-50/35 border-emerald-300 ring-1 ring-emerald-50/20 ring-inset' : 'border-slate-100 hover:bg-slate-100/50'
                                    }`}
                                    id={`drv-hist-rev-${rev.id}`}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <strong className="text-slate-800">{rev.category} Yield</strong>
                                          <span className="text-[9px] text-slate-400 font-mono bg-white py-0.5 px-1.5 rounded border border-slate-100">{rev.date}</span>
                                          {rev.status === 'Pending' ? (
                                            <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded-full border border-amber-200 animate-pulse text-nowrap">Pending Approval</span>
                                          ) : (
                                            <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-205 text-nowrap">Approved</span>
                                          )}
                                        </div>
                                        <p className={`text-[10px] text-slate-500 mt-0.5 font-normal leading-relaxed ${isExpanded ? '' : 'line-clamp-1'}`}>{rev.description}</p>
                                      </div>
                                      <span className="text-emerald-600 font-bold font-mono text-xs shrink-0 ml-2 font-bold">+zmk {rev.amount}</span>
                                    </div>

                                    {/* Expanded information drawer */}
                                    {isExpanded && (
                                      <div className="p-3 bg-white border border-emerald-100 rounded-lg space-y-2 text-[10px]" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-between border-b border-emerald-50 pb-1.5 font-bold text-emerald-950">
                                          <span className="flex items-center gap-1">📁 Cashing Submission Details</span>
                                          <span className="font-mono text-[8px] text-emerald-550 uppercase">TRX-{rev.id.toUpperCase()}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-slate-500 font-normal">
                                          <div>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Yield Stream Category</span>
                                            <span className="font-semibold text-slate-700 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5">{rev.category}</span>
                                          </div>
                                          <div>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Submission Timestamp</span>
                                            <span className="font-semibold text-slate-755 font-mono">{rev.date}</span>
                                          </div>
                                          <div>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Declared Yield</span>
                                            <span className="font-mono font-bold text-emerald-600">+zmk {rev.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                          </div>
                                          <div>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Audit Status</span>
                                            <p className="mt-0.5">
                                              {rev.status === 'Pending' ? (
                                                <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 rounded-sm border border-amber-200">Awaiting Manager Sign-off</span>
                                              ) : (
                                                <span className="text-[9px] font-semibold text-emerald-750 bg-emerald-50 px-1 rounded-sm border border-emerald-150">Audited & Approved</span>
                                              )}
                                            </p>
                                          </div>
                                          <div className="col-span-2 border-t border-slate-50 pt-1.5">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Original Narrative Notes</span>
                                            <p className="text-slate-650 bg-slate-50 p-2 rounded border border-slate-100 leading-normal">{rev.description || 'No complementary narrative provided.'}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-[10px] text-slate-400 italic font-normal text-left">No income cashings logged by you on this unit.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  })()}

      {/* FOOTER */}
      <footer className="bg-indigo-950 text-indigo-200 py-8 border-t border-indigo-900 text-xs mt-auto font-medium" id="page-footer">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div>
            <p className="text-white font-bold">Car Asset Manager Dashboard</p>
            <p className="text-indigo-400 text-[11px] mt-0.5">Corporate fleet intelligence console.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-indigo-300 text-[11px]">
            <span>• Plate Tracker Active</span>
            <span>• Photo logs secured</span>
            <span>• Device driver assignment active</span>
          </div>
        </div>
      </footer>

      {/* MODAL 1: ADD VEHICLE CAR ASSET */}
      {isAddingCar && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" id="add-car-modal">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-gray-100 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" id="add-car-modal-box">
            
            {/* Header banner */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between" id="add-car-hdr">
              <div>
                <h3 className="text-base font-bold text-gray-950">Register New Fleet Car</h3>
                <p className="text-xs text-gray-400">Instantiate a new vehicle record with specs, status, and photos.</p>
              </div>
              <button
                onClick={() => setIsAddingCar(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg"
                id="btn-close-add-car"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddNewCar} className="overflow-y-auto flex-1 p-6 space-y-5" id="add-car-form">
              
              {/* Captured Photo Container Display */}
              <div className="space-y-2" id="photo-picker-section">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Car Asset Photo
                </label>
                <div className="flex items-center gap-4" id="photo-picker-row">
                  <div className="w-36 h-24 bg-gray-100 border border-gray-200 rounded-xl overflow-hidden shadow-inner shrink-0" id="photo-thumbnail">
                    {newCarPhoto ? (
                      <img src={newCarPhoto} alt="New car preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-[10px] p-2 text-center bg-gray-50 uppercase tracking-wide font-medium font-mono">
                        <Camera className="w-5 h-5 text-gray-300 mb-1" /> No Photo
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5" id="photo-picker-desc">
                    <button
                      type="button"
                      onClick={() => setShowCamera(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      id="btn-open-camera-capture"
                    >
                      <Camera className="w-4 h-4" />
                      {newCarPhoto ? 'Re-take / Change Photo' : 'Capture or Pick Photo'}
                    </button>
                    <p className="text-[10px] text-gray-400 max-w-sm">Capture real vehicle photos using device camera, upload local files, or choose from high quality presets.</p>
                  </div>
                </div>
              </div>

              {/* Grid Specifications Fields */}
              <div className="grid grid-cols-2 gap-4" id="specs-fields-grid">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Vehicle Make*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chevrolet"
                    value={newCarMake}
                    onChange={(e) => setNewCarMake(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-850 font-medium"
                    id="input-car-make"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Model Family*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bolt EV"
                    value={newCarModel}
                    onChange={(e) => setNewCarModel(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-850 font-medium"
                    id="input-car-model"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Manufacturing Year*</label>
                  <input
                    type="number"
                    required
                    min="1990"
                    max={new Date().getFullYear() + 1}
                    value={newCarYear}
                    onChange={(e) => setNewCarYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-850 font-medium"
                    id="input-car-year"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">License Plate Number*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NY-44X8"
                    value={newCarPlate}
                    onChange={(e) => setNewCarPlate(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-gray-850 font-medium whitespace-nowrap uppercase"
                    id="input-car-plate"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Body Exterior Color*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pearl Silver"
                    value={newCarColor}
                    onChange={(e) => setNewCarColor(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-850 font-medium"
                    id="input-car-color"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">VIN (17 chars) or Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g. 1G1FY6S0..."
                    value={newCarVin}
                    onChange={(e) => setNewCarVin(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-gray-850 font-medium uppercase"
                    id="input-car-vin"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Starting Odometer (km)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 12000"
                    value={newCarMileage || ''}
                    onChange={(e) => setNewCarMileage(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-850 font-medium"
                    id="input-car-miles"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Initial Status</label>
                  <select
                    value={newCarStatus}
                    onChange={(e) => setNewCarStatus(e.target.value as CarAsset['status'])}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-700 font-medium"
                    id="select-car-status"
                  >
                    <option value="Available">Available for Dispatch</option>
                    <option value="Maintenance">Under Scheduled Maintenance</option>
                    <option value="Out of Service">Currently Out of Service</option>
                  </select>
                </div>
              </div>

              {/* Service Logs checkpoint segment */}
              <div className="border-t border-gray-100 pt-4" id="service-logs-init-sec">
                <div className="flex items-center gap-2 mb-2" id="chk-init-service-wrap">
                  <input
                    type="checkbox"
                    id="chk-init-service"
                    checked={includeInitialService}
                    onChange={(e) => setIncludeInitialService(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="chk-init-service" className="text-xs font-semibold text-gray-700 cursor-pointer select-none">
                    Log an initial fleet readiness / maintenance history entry
                  </label>
                </div>

                {includeInitialService && (
                  <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-3 slide-in" id="init-service-inputs-wrap">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Ready Check Maintenance details</p>
                    <div className="grid grid-cols-3 gap-3" id="init-service-inputs-row1">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Service Workshop Performed By</label>
                        <input
                          type="text"
                          placeholder="e.g. Fleet Prep Express"
                          value={initialServiceBy}
                          onChange={(e) => setInitialServiceBy(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs"
                          id="input-init-serv-by"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Inspection Cost (zmk)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={initialServiceCost || ''}
                          onChange={(e) => setInitialServiceCost(Number(e.target.value))}
                          className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs"
                          id="input-init-serv-cost"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Observation / Description of Work done</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Conducted detail clean, full level fluid checks, tire pressure gauge correction. Vehicle pristine."
                        value={initialServiceDesc}
                        onChange={(e) => setInitialServiceDesc(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs"
                        id="input-init-serv-desc"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action and controls */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3" id="add-car-actions">
                <button
                  type="button"
                  onClick={() => setIsAddingCar(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-650 transition-colors"
                  id="btn-add-car-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-indigo-500/10 transition-all cursor-pointer"
                  id="btn-add-car-submit"
                >
                  Create Asset Card
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: SERVICE LOG DETAILS POPUP */}
      {selectedServiceLogForPopup && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in" id="service-log-popup-modal" onClick={() => setSelectedServiceLogForPopup(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-100 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up" id="service-log-popup-box" onClick={(e) => e.stopPropagation()}>
            
            {/* Header banner */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/55" id="service-log-popup-hdr">
              <div>
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <span className="p-1 px-2.5 bg-indigo-100 text-indigo-700 text-[10px] rounded-lg uppercase tracking-wider font-extrabold leading-none">
                    Technical Inspection sheet
                  </span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">Detailed Technical and Maintenance record report.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedServiceLogForPopup(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg font-bold"
                id="btn-close-service-popup"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5 overflow-y-auto text-left" id="service-log-popup-content">
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-3.5" id="service-log-popup-heading">
                <div>
                  <h4 className="text-base font-extrabold text-gray-950">{selectedServiceLogForPopup.category}</h4>
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">ID: SVC-{selectedServiceLogForPopup.id.toUpperCase()}</span>
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-505" />
                  {selectedServiceLogForPopup.date}
                </span>
              </div>

              {/* Data Grid specifications */}
              <div className="grid grid-cols-2 gap-4 text-xs" id="service-log-popup-grid">
                <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-100/50">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Assigned Vehicle</span>
                  <span className="font-extrabold text-slate-800">{selectedCar ? `${selectedCar.make} ${selectedCar.model}` : 'N/A'}</span>
                </div>
                <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-100/50">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Reg Plate</span>
                  <span className="font-mono font-extrabold text-indigo-650">{selectedCar ? selectedCar.plateNumber : 'N/A'}</span>
                </div>
                <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-100/50">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block font-sans">Billed Charge</span>
                  <span className="font-mono font-black text-emerald-600 text-sm">
                    zmk {selectedServiceLogForPopup.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-100/50">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Odometer Recorded</span>
                  <span className="font-mono font-semibold text-slate-755">{selectedServiceLogForPopup.mileage.toLocaleString()} km</span>
                </div>
                <div className="col-span-2 border-t border-slate-100 pt-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Authorized Provider / Mechanic Garage</span>
                  <span className="font-semibold text-slate-800 bg-slate-100/80 px-2.5 py-2 rounded-xl block mt-1.5">👤 {selectedServiceLogForPopup.performedBy || 'Fleet Auto Prep Team'}</span>
                </div>
              </div>

              {/* Description box */}
              <div className="border-t border-slate-100 pt-4" id="service-log-popup-desc">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">Full Service Diagnostics Note & Action Report</span>
                <div className="text-slate-650 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100/80 text-xs font-normal whitespace-pre-wrap">
                  {selectedServiceLogForPopup.description}
                </div>
              </div>

            </div>

            {/* Footer buttons */}
            <div className="p-4 bg-slate-50/50 border-t border-gray-100 flex justify-between items-center" id="service-log-popup-footer">
              <button
                type="button"
                onClick={() => {
                  if (selectedCar) {
                    handleDeleteServiceLog(selectedCar.id, selectedServiceLogForPopup.id);
                    setSelectedServiceLogForPopup(null);
                  }
                }}
                className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold border border-red-200 hover:border-red-350 transition-all cursor-pointer flex items-center gap-1.5"
                id="btn-service-popup-delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Entry
              </button>
              <button
                type="button"
                onClick={() => setSelectedServiceLogForPopup(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-500/10 transition-all cursor-pointer"
                id="btn-service-popup-done"
              >
                Accept and Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: ADD STAFF DRIVER WITH VEHICLE ASSIGNMENT */}
      {isAddingDriver && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" id="add-driver-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-100 overflow-hidden shadow-2xl flex flex-col" id="add-driver-modal-box">
            
            {/* Header banner */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50" id="add-driver-hdr">
              <div>
                <h3 className="text-base font-bold text-gray-950">Add Drivers Entry</h3>
                <p className="text-xs text-gray-400">Map a new driver profile and couple an unassigned vehicle asset.</p>
              </div>
              <button
                onClick={() => setIsAddingDriver(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg"
                id="btn-close-add-driver"
              >
                ✕
              </button>
            </div>

            {/* Form list parameters */}
            <form onSubmit={handleAddNewDriver} className="p-6 space-y-4" id="add-driver-form">
              
              {/* Profile Photo Upload */}
              <div className="flex items-center gap-4 p-3.5 bg-slate-50 border border-dashed border-gray-200 rounded-2xl" id="add-drv-photo-block">
                <div className="w-16 h-16 rounded-full bg-slate-200 border border-gray-100 shrink-0 flex items-center justify-center overflow-hidden">
                  {newDrvPhoto ? (
                    <img src={newDrvPhoto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Driver Profile Picture</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDriverPhotoUpload}
                    className="text-xs text-gray-550 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    id="input-drv-photo"
                  />
                  <p className="text-[9px] text-gray-400 mt-0.5">JPEG, PNG, or GIF. Max 5MB.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Driver Full Name*</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={newDrvName}
                  onChange={(e) => setNewDrvName(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  id="input-drv-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4" id="driver-identifiers-grid">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">NRC Number*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 523456/11/1"
                    value={newDrvNrc}
                    onChange={(e) => setNewDrvNrc(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase"
                    id="input-drv-nrc"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Driver's Licence Number*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DL-TX4810931"
                    value={newDrvLicense}
                    onChange={(e) => setNewDrvLicense(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase"
                    id="input-drv-license"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4" id="driver-contacts-grid">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    placeholder="s.jenkins@corp.com"
                    value={newDrvEmail}
                    onChange={(e) => setNewDrvEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    id="input-drv-email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mobile Phone No.</label>
                  <input
                    type="text"
                    placeholder="(512) 555-0199"
                    value={newDrvPhone}
                    onChange={(e) => setNewDrvPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    id="input-drv-phone"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4" id="driver-status-car-grid">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Driver Status</label>
                  <select
                    value={newDrvStatus}
                    onChange={(e) => setNewDrvStatus(e.target.value as Driver['status'])}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-700 font-medium"
                    id="select-drv-status"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Assign Car Asset</label>
                  <select
                    value={newDrvAssignedCarId}
                    onChange={(e) => setNewDrvAssignedCarId(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-700 font-medium font-mono uppercase"
                    id="select-drv-assigned-car"
                  >
                    <option value="">-- No Car Assigned --</option>
                    {cars
                      .filter(c => c.status === 'Available' || !drivers.some(d => d.assignedCarId === c.id))
                      .map(car => (
                        <option key={car.id} value={car.id} className="font-mono">
                          {car.plateNumber} ({car.make} {car.model})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Warnings check info */}
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex gap-2" id="add-driver-tips-bullet">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-indigo-700 leading-normal font-medium">
                  Assigning an available car immediately schedules the car to <strong>Assigned</strong> state and binds logs specifically to this staff profile. Unassigned drivers can be coupled subsequently.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3" id="add-drv-actions">
                <button
                  type="button"
                  onClick={() => setIsAddingDriver(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-650 transition-colors"
                  id="btn-add-driver-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-indigo-500/10 transition-all cursor-pointer"
                  id="btn-add-driver-submit"
                >
                  Create Driver Profile
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANAGE DRIVER PROFILES */}
      {isManagingDrivers && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in" id="manage-drivers-modal">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-gray-100 overflow-hidden shadow-2xl flex flex-col" id="manage-drivers-modal-box">
            
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50" id="manage-drivers-hdr">
              <div>
                <h3 className="text-base font-bold text-gray-950">Store & Manage Drivers</h3>
                <p className="text-xs text-gray-400">View and update registered staff profiles and assignments.</p>
              </div>
              <button
                onClick={() => setIsManagingDrivers(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg text-sm"
                id="btn-close-manage-drivers"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto" id="manage-drivers-body">
              {drivers.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-8">No registered drivers found in the system.</p>
              ) : (
                <div className="divide-y divide-gray-100" id="manage-drivers-list">
                  {drivers.map(drv => {
                    const assignedCar = cars.find(c => c.id === drv.assignedCarId);
                    return (
                      <div key={drv.id} className="py-3.5 flex items-center justify-between gap-4" id={`manage-drv-row-${drv.id}`}>
                        <div className="flex items-center gap-3">
                          {drv.profilePicture ? (
                            <img src={drv.profilePicture} alt={drv.fullName} className="w-9 h-9 rounded-full object-cover shrink-0 border border-indigo-105" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-9 h-9 bg-indigo-100 text-indigo-700 font-bold rounded-full flex items-center justify-center text-xs shrink-0">
                              {drv.fullName.split(' ').map(n=>n[0]).join('')}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">{drv.fullName}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                                drv.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                                drv.status === 'On Leave' ? 'bg-amber-100 text-amber-800' :
                                drv.status === 'Suspended' ? 'bg-rose-100 text-rose-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {drv.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 font-medium font-mono mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 animate-delay">
                              <span><strong className="text-gray-400">Licence:</strong> {drv.licenseNumber}</span>
                              <span className="text-gray-300">|</span>
                              <span><strong className="text-gray-400">NRC:</strong> {drv.nrcNumber || 'N/A'}</span>
                              {assignedCar && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <span className="text-indigo-600 font-semibold uppercase">🚗 {assignedCar.plateNumber}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              // Close manager and start edit
                              setIsManagingDrivers(false);
                              startEditDriver(drv);
                            }}
                            className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                            id={`btn-edit-drv-inline-${drv.id}`}
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit Profile
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDriver(drv.id)}
                            className="text-xs p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Delete Driver Profile"
                            id={`btn-delete-drv-inline-${drv.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-slate-50 flex justify-end" id="manage-drivers-footer">
              <button
                type="button"
                onClick={() => setIsManagingDrivers(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                id="btn-add-driver-manage-close"
              >
                Close Manager
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: EDIT DRIVER PROFILE */}
      {editingDriver && (
        <div className="fixed inset-0 z-55 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in" id="edit-driver-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-100 overflow-hidden shadow-2xl flex flex-col" id="edit-driver-modal-box">
            
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50" id="edit-driver-hdr">
              <div>
                <h3 className="text-base font-bold text-gray-950">Edit Staff Profile</h3>
                <p className="text-xs text-gray-400">Update identification, contacts, status, or credentials for {editingDriver.fullName}.</p>
              </div>
              <button
                onClick={() => setEditingDriver(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg text-sm"
                id="btn-close-edit-driver-modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDriverEdit} className="p-6 space-y-4" id="edit-driver-form">
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Driver Full Name*</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={editDrvName}
                  onChange={(e) => setEditDrvName(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-gray-900"
                  id="edit-input-drv-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4" id="edit-driver-identifiers-grid">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">NRC Number*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 523456/11/1"
                    value={editDrvNrc}
                    onChange={(e) => setEditDrvNrc(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase font-medium text-gray-900"
                    id="edit-input-drv-nrc"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Driver's Licence Number*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DL-TX4810931"
                    value={editDrvLicense}
                    onChange={(e) => setEditDrvLicense(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase font-medium text-gray-900"
                    id="edit-input-drv-license"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4" id="edit-driver-contacts-grid">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    placeholder="s.jenkins@corp.com"
                    value={editDrvEmail}
                    onChange={(e) => setEditDrvEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-gray-900"
                    id="edit-input-drv-email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mobile Phone No.</label>
                  <input
                    type="text"
                    placeholder="(512) 555-0199"
                    value={editDrvPhone}
                    onChange={(e) => setEditDrvPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-gray-900"
                    id="edit-input-drv-phone"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Driver Status</label>
                <select
                  value={editDrvStatus}
                  onChange={(e) => setEditDrvStatus(e.target.value as Driver['status'])}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-700 font-semibold"
                  id="edit-select-drv-status"
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3" id="edit-drv-actions">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-650 transition-colors cursor-pointer"
                  id="btn-edit-driver-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-indigo-500/10 transition-all cursor-pointer"
                  id="btn-edit-driver-submit"
                >
                  Save Profile Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT VEHICLE DETAILS */}
      {editingCar && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in animate-scale-up" id="edit-car-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-100 overflow-hidden shadow-2xl flex flex-col" id="edit-car-modal-box">
            
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50" id="edit-car-hdr">
              <div>
                <h3 className="text-base font-bold text-gray-950">Edit Vehicle Asset</h3>
                <p className="text-xs text-gray-400">Modify registration, physical status, or metric logs for {editingCar.make} {editingCar.model}.</p>
              </div>
              <button
                onClick={handleCloseEditCarModal}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg text-sm"
                id="btn-close-edit-car-modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCarEdit} className="p-6 space-y-4" id="edit-car-form">
              
              <div className="grid grid-cols-2 gap-4" id="edit-car-specs-grid">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Vehicle Make*</label>
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
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Vehicle Model*</label>
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
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Manufacturing Year*</label>
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
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">License Plate Number*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NY-44X8"
                    value={editCarPlate}
                    onChange={(e) => setEditCarPlate(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-gray-900 font-medium uppercase animate-pulse-once"
                    id="edit-input-car-plate"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Body Exterior Color*</label>
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
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Odometer (km)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 12000"
                    value={editCarMileage || ''}
                    onChange={(e) => setEditCarMileage(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 font-medium"
                    id="edit-input-car-miles"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3" id="edit-car-actions">
                <button
                  type="button"
                  onClick={handleCloseEditCarModal}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-650 transition-colors cursor-pointer"
                  id="btn-edit-car-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-indigo-500/10 transition-all cursor-pointer"
                  id="btn-edit-car-submit"
                >
                  Save Vehicle Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* OVERLAY CAM: SYSTEM CAMERA AND SNAPSHOT */}
      {showCamera && (
        <div className="fixed inset-0 z-55 bg-gray-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" id="camera-overlay-bg">
          <CameraCapture
            onPhotoCaptured={(capturedDataUrl) => {
              if (isAddingCar) {
                // If we are currently filling out the New Car modal, update that photo state
                setNewCarPhoto(capturedDataUrl);
              } else if (selectedCarId) {
                // Otherwise we are updating an existing selected vehicle directly!
                setCars(prevCars =>
                  prevCars.map(c => {
                    if (c.id === selectedCarId) {
                      return { ...c, photos: [capturedDataUrl] };
                    }
                    return c;
                  })
                );
              }
              setShowCamera(false);
            }}
            onClose={() => setShowCamera(false)}
          />
        </div>
      )}

    </div>
  );
}
