/**
 * Data Access Layer - Modular Storage Service
 * Currently utilizes localStorage for immediate browser-based persistence.
 * Can be easily swapped with REST API calls (fetch/axios) to connect a SQL/NoSQL database.
 */

// Default settings
const DEFAULT_SETTINGS = {
  general: {
    useMap: false,
    useCamera: false,
    useSubscribers: false,
    ocrIntervalSeconds: 2,
    toleranceMinutes: 10,
    billingType: 'fraction', // 'fraction' | 'hourly'
    fractionMinutes: 15,
    currency: 'ARS',
    capacity: 50 // Max capacity of the parking lot
  },
  ticket: {
    businessName: 'ESTACIONAMIENTO AR',
    address: 'CABA, ARGENTINA',
    phone: 'TEL: 011 4455-6677'
  },
  rates: {
    commercial: {
      active: false,
      peakStart: '08:00',
      peakEnd: '20:00',
      peakMultiplier: 1.5,
      offPeakMultiplier: 1.0
    },
    dynamic: {
      active: false,
      occupancyThresholdHigh: 80,
      occupancyThresholdLow: 30,
      multiplierHigh: 1.4,
      multiplierLow: 0.8
    }
  },
  vehicleTypes: [
    { id: 'auto', name: 'Auto', hourlyRate: 1200, isDefault: true },
    { id: 'moto', name: 'Moto', hourlyRate: 600, isDefault: true },
    { id: 'camioneta', name: 'Camioneta/SUV', hourlyRate: 1800, isDefault: true }
  ]
};

// Default map layout (15 sample slots)
const DEFAULT_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const row = String.fromCharCode(65 + Math.floor(i / 5)); // A, B, C, D
  const num = (i % 5) + 1;
  return {
    id: `${row}${num}`,
    name: `${row}${num}`,
    occupiedBy: null, // Plate string if occupied
    vehicleType: null,
    x: ((i % 5) * 110) + 20, // Initial X pos
    y: (Math.floor(i / 5) * 110) + 20 // Initial Y pos
  };
});

// Helper for LS
const getLS = (key, fallback) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    console.error('Error reading localStorage', e);
    return fallback;
  }
};

const setLS = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Error writing to localStorage', e);
  }
};

export const dbService = {
  /**
   * BACKEND CONNECTION TIP:
   * To connect to a database:
   * 1. Change these methods to be 'async'.
   * 2. Replace the localStorage calls with `await fetch('/api/endpoint', ...)`
   */

  // --- SETTINGS MANAGEMENT ---
  getSettings() {
    return getLS('parking_settings', DEFAULT_SETTINGS);
  },

  saveSettings(settings) {
    setLS('parking_settings', settings);
    return settings;
  },

  // --- SUBSCRIBERS (ABONADOS MENSUALES) ---
  getSubscribers() {
    return getLS('parking_subscribers', []);
  },

  saveSubscribers(subscribers) {
    setLS('parking_subscribers', subscribers);
    return subscribers;
  },

  addSubscriber(subscriberData) {
    const subscribers = this.getSubscribers();
    const newSub = {
      id: Math.random().toString(36).substring(2, 9),
      ...subscriberData
    };
    subscribers.push(newSub);
    this.saveSubscribers(subscribers);
    return newSub;
  },

  updateSubscriber(id, updatedData) {
    let subscribers = this.getSubscribers();
    const index = subscribers.findIndex(s => s.id === id);
    if (index !== -1) {
      subscribers[index] = { ...subscribers[index], ...updatedData };
      this.saveSubscribers(subscribers);
      return subscribers[index];
    }
    return null;
  },

  deleteSubscriber(id) {
    let subscribers = this.getSubscribers();
    subscribers = subscribers.filter(s => s.id !== id);
    this.saveSubscribers(subscribers);
  },

  // --- VEHICLE TYPES ---
  getVehicleTypes() {
    const settings = this.getSettings();
    return settings.vehicleTypes || DEFAULT_SETTINGS.vehicleTypes;
  },

  saveVehicleTypes(types) {
    const settings = this.getSettings();
    settings.vehicleTypes = types;
    this.saveSettings(settings);
    return types;
  },

  // --- ACTIVE VEHICLES ---
  getActiveVehicles() {
    return getLS('parking_active_vehicles', []);
  },

  saveActiveVehicles(vehicles) {
    setLS('parking_active_vehicles', vehicles);
    return vehicles;
  },

  addActiveVehicle(vehicle) {
    // vehicle structure: { id, plate, entryTime, vehicleTypeId, slotId, notes }
    const active = this.getActiveVehicles();
    
    // Check if plate already active to prevent duplicates
    const exists = active.find(v => v.plate.toUpperCase() === vehicle.plate.toUpperCase());
    if (exists) {
      throw new Error(`El vehículo con patente ${vehicle.plate.toUpperCase()} ya se encuentra estacionado.`);
    }

    const newVehicle = {
      id: vehicle.id || Math.random().toString(36).substring(2, 9),
      plate: vehicle.plate.toUpperCase(),
      entryTime: vehicle.entryTime || new Date().toISOString(),
      vehicleTypeId: vehicle.vehicleTypeId || 'auto',
      slotId: vehicle.slotId || null,
      notes: vehicle.notes || ''
    };

    active.push(newVehicle);
    this.saveActiveVehicles(active);

    // If slot is assigned, update the slot status
    if (newVehicle.slotId) {
      this.assignSlot(newVehicle.slotId, newVehicle.plate, newVehicle.vehicleTypeId);
    }

    return newVehicle;
  },

  removeActiveVehicle(id) {
    let active = this.getActiveVehicles();
    const vehicle = active.find(v => v.id === id);
    if (!vehicle) return null;

    active = active.filter(v => v.id !== id);
    this.saveActiveVehicles(active);

    // Free the slot if assigned
    if (vehicle.slotId) {
      this.freeSlot(vehicle.slotId);
    }
    return vehicle;
  },

  // --- PARKING SLOTS (MAP) ---
  getSlots() {
    return getLS('parking_slots', DEFAULT_SLOTS);
  },

  saveSlots(slots) {
    setLS('parking_slots', slots);
    return slots;
  },

  assignSlot(slotId, plate, vehicleTypeId) {
    const slots = this.getSlots();
    const index = slots.findIndex(s => s.id === slotId);
    if (index !== -1) {
      slots[index].occupiedBy = plate;
      slots[index].vehicleType = vehicleTypeId;
      this.saveSlots(slots);
    }
  },

  freeSlot(slotId) {
    const slots = this.getSlots();
    const index = slots.findIndex(s => s.id === slotId);
    if (index !== -1) {
      slots[index].occupiedBy = null;
      slots[index].vehicleType = null;
      this.saveSlots(slots);
    }
  },

  // --- HISTORIAL / TRANSACTION HISTORY ---
  getHistory() {
    return getLS('parking_history', []);
  },

  saveHistory(history) {
    setLS('parking_history', history);
    return history;
  },

  checkoutVehicle(id, checkoutData) {
    // checkoutData: { exitTime, feeDetails, paymentMethod }
    const vehicle = this.removeActiveVehicle(id);
    if (!vehicle) {
      throw new Error("Vehículo no encontrado en los registros activos.");
    }

    const historyRecord = {
      id: vehicle.id,
      plate: vehicle.plate,
      entryTime: vehicle.entryTime,
      exitTime: checkoutData.exitTime || new Date().toISOString(),
      vehicleTypeId: vehicle.vehicleTypeId,
      slotId: vehicle.slotId,
      notes: vehicle.notes,
      feeDetails: checkoutData.feeDetails, // { elapsedMinutes, totalFee, billingType, ... }
      paymentMethod: checkoutData.paymentMethod || 'Efectivo',
      timestamp: Date.now()
    };

    const history = this.getHistory();
    history.unshift(historyRecord); // Newest first
    this.saveHistory(history);

    return historyRecord;
  },

  // --- STATS / METRICS ---
  getAnalytics() {
    const history = this.getHistory();
    const active = this.getActiveVehicles();
    const settings = this.getSettings();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRecords = history.filter(r => new Date(r.exitTime) >= today);
    const totalEarningsToday = todayRecords.reduce((sum, r) => sum + (r.feeDetails?.totalFee || 0), 0);

    const paymentMethods = todayRecords.reduce((acc, r) => {
      const pm = r.paymentMethod || 'Efectivo';
      acc[pm] = (acc[pm] || 0) + (r.feeDetails?.totalFee || 0);
      return acc;
    }, {});

    const elapsedTotal = todayRecords.reduce((sum, r) => sum + (r.feeDetails?.elapsedMinutes || 0), 0);
    const avgStayMinutes = todayRecords.length > 0 ? Math.round(elapsedTotal / todayRecords.length) : 0;

    const capacity = settings.general.capacity || 50;
    const occupancyPercent = Math.min(100, Math.round((active.length / capacity) * 100));

    return {
      activeCount: active.length,
      occupancyPercent,
      capacity,
      totalEarningsToday,
      todayCheckoutCount: todayRecords.length,
      avgStayMinutes,
      paymentMethodsDistribution: paymentMethods,
      historySummary: todayRecords
    };
  },

  // --- MAP LAYOUT (EDITOR VISUAL) ---
  getMapLayout() {
    return getLS('parking_map_layout', {
      floors: [
        { id: 'pb', name: 'Planta Baja', order: 0, elements: [] }
      ],
      activeFloorId: 'pb',
      gridSize: 10,
      showGrid: true,
      snapEnabled: true
    });
  },

  saveMapLayout(layout) {
    setLS('parking_map_layout', layout);
    this.syncSlotsFromLayout(layout);
    return layout;
  },

  saveMapCamera(camera) {
    const layout = this.getMapLayout();
    layout.camera = camera;
    setLS('parking_map_layout', layout);
  },

  syncSlotsFromLayout(layout) {
    const slots = [];
    for (const floor of layout.floors) {
      for (const el of floor.elements) {
        if (el.type === 'slot') {
          slots.push({
            id: el.name || el.id,
            name: el.name || el.id,
            occupiedBy: el.occupiedBy || null,
            vehicleType: el.vehicleType || null,
            x: el.x,
            y: el.y,
            floorId: floor.id
          });
        }
      }
    }
    this.saveSlots(slots);
  },

  // --- SEED/RESET DB ---
  resetAll() {
    localStorage.removeItem('parking_settings');
    localStorage.removeItem('parking_active_vehicles');
    localStorage.removeItem('parking_slots');
    localStorage.removeItem('parking_history');
    localStorage.removeItem('parking_subscribers');
    localStorage.removeItem('parking_map_layout');
    return { success: true };
  }
};
