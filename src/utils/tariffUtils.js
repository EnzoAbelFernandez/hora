/**
 * Utility functions for parking fee calculations.
 */

/**
 * Parses a "HH:MM" string into minutes from midnight.
 * @param {string} timeStr - Time in HH:MM format
 * @returns {number} minutes from midnight
 */
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Checks if a given Date is within peak hours.
 * Supports peak ranges that cross midnight (e.g., 22:00 to 06:00).
 * @param {Date} date 
 * @param {string} startStr - HH:MM
 * @param {string} endStr - HH:MM
 * @returns {boolean}
 */
export function isPeakTime(date, startStr, endStr) {
  const currentMin = date.getHours() * 60 + date.getMinutes();
  const startMin = timeToMinutes(startStr);
  const endMin = timeToMinutes(endStr);

  if (startMin <= endMin) {
    return currentMin >= startMin && currentMin <= endMin;
  } else {
    // Crosses midnight, e.g. 22:00 to 06:00
    return currentMin >= startMin || currentMin <= endMin;
  }
}

/**
 * Calculates the parking fee based on entry and exit times, settings, and current occupancy.
 * 
 * @param {Date|string|number} entryTime - When the vehicle entered
 * @param {Date|string|number} exitTime - When the vehicle exited
 * @param {Object} settings - Tariff settings configuration
 * @param {number} occupancyPercent - Current capacity occupancy percentage (0-100)
 * @param {string} vehicleTypeId - The ID of the vehicle type
 * @returns {Object} Described fee details: {
 *   elapsedMinutes: number,
 *   billedHours: number,
 *   baseRate: number,
 *   effectiveRate: number,
 *   commercialMultiplier: number,
 *   dynamicMultiplier: number,
 *   totalFee: number,
 *   isFreeGrace: boolean
 * }
 */
export function calculateParkingFee(entryTime, exitTime, settings, occupancyPercent = 0, vehicleTypeId = 'auto') {
  const entryDate = new Date(entryTime);
  const exitDate = new Date(exitTime);
  
  const elapsedMs = Math.max(0, exitDate.getTime() - entryDate.getTime());
  const elapsedMinutes = Math.ceil(elapsedMs / 60000);

  // Default fallback settings if none provided
  const defaults = {
    general: {
      toleranceMinutes: 10,
      billingType: 'fraction', // 'fraction' | 'hourly'
      fractionMinutes: 15,
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
      { id: 'auto', name: 'Auto', hourlyRate: 1200 },
      { id: 'moto', name: 'Moto', hourlyRate: 600 },
      { id: 'camioneta', name: 'Camioneta/SUV', hourlyRate: 1800 }
    ]
  };

  const activeSettings = { ...defaults, ...settings };
  const general = activeSettings.general || defaults.general;
  const rates = activeSettings.rates || defaults.rates;
  const vehicles = activeSettings.vehicleTypes || defaults.vehicleTypes;

  // 1. Check Grace Period
  const tolerance = typeof general.toleranceMinutes === 'number' ? general.toleranceMinutes : 10;
  if (elapsedMinutes <= tolerance) {
    return {
      elapsedMinutes,
      billedHours: 0,
      baseRate: 0,
      effectiveRate: 0,
      commercialMultiplier: 1.0,
      dynamicMultiplier: 1.0,
      totalFee: 0,
      isFreeGrace: true
    };
  }

  // 2. Find base rate for vehicle type
  const vehicle = vehicles.find(v => v.id === vehicleTypeId) || vehicles[0] || { hourlyRate: 1000 };
  const baseRate = vehicle.hourlyRate;

  // 3. Commercial hours multiplier (based on entry time)
  let commercialMultiplier = 1.0;
  if (rates.commercial && rates.commercial.active) {
    const isPeak = isPeakTime(entryDate, rates.commercial.peakStart, rates.commercial.peakEnd);
    commercialMultiplier = isPeak ? rates.commercial.peakMultiplier : rates.commercial.offPeakMultiplier;
  }

  // 4. Dynamic multiplier (based on occupancy at entry or current)
  let dynamicMultiplier = 1.0;
  if (rates.dynamic && rates.dynamic.active) {
    const thresholdHigh = rates.dynamic.occupancyThresholdHigh || 80;
    const thresholdLow = rates.dynamic.occupancyThresholdLow || 30;
    const multHigh = rates.dynamic.multiplierHigh || 1.4;
    const multLow = rates.dynamic.multiplierLow || 0.8;

    if (occupancyPercent >= thresholdHigh) {
      dynamicMultiplier = multHigh;
    } else if (occupancyPercent <= thresholdLow) {
      dynamicMultiplier = multLow;
    }
  }

  const effectiveRate = baseRate * commercialMultiplier * dynamicMultiplier;

  // 5. Calculate Billed Time / Rounding
  let billedHours = 0;
  const billingType = general.billingType || 'fraction';

  if (billingType === 'hourly') {
    // Ceil to next full hour
    billedHours = Math.ceil(elapsedMinutes / 60);
  } else {
    // Fraction of hour (e.g. 15, 30 min fractions)
    const fractionMinutes = general.fractionMinutes || 15;
    const totalFractions = Math.ceil(elapsedMinutes / fractionMinutes);
    billedHours = (totalFractions * fractionMinutes) / 60;
  }

  const totalFee = Math.round(effectiveRate * billedHours);

  return {
    elapsedMinutes,
    billedHours,
    baseRate,
    effectiveRate,
    commercialMultiplier,
    dynamicMultiplier,
    totalFee,
    isFreeGrace: false
  };
}

/**
 * Format dynamic display of elapsed time (e.g., "1h 45m" or "25m")
 * @param {number} totalMinutes 
 * @returns {string}
 */
export function formatElapsedTime(totalMinutes) {
  if (totalMinutes < 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
