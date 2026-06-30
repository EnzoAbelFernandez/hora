import React, { useState } from 'react';
import { Save, Plus, Trash2, Settings, DollarSign, Clock, Users, ArrowUpRight, Printer, ToggleLeft } from 'lucide-react';

export default function TariffSettings({ settings, onSaveSettings }) {
  const [activeTab, setActiveTab] = useState('modules');
  const [localSettings, setLocalSettings] = useState(settings);
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehicleRate, setNewVehicleRate] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Handle nested settings change
  const handleChange = (section, key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  // Handle deep rates updates (commercial, dynamic)
  const handleRateChange = (rateType, key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      rates: {
        ...prev.rates,
        [rateType]: {
          ...prev.rates[rateType],
          [key]: value
        }
      }
    }));
  };

  // Add custom vehicle type
  const handleAddVehicleType = (e) => {
    e.preventDefault();
    if (!newVehicleName.trim() || !newVehicleRate) return;

    const newId = newVehicleName.trim().toLowerCase().replace(/\s+/g, '_');
    
    // Check if ID already exists
    if (localSettings.vehicleTypes.some(v => v.id === newId)) {
      alert("Ya existe un tipo de vehículo con ese nombre.");
      return;
    }

    const newType = {
      id: newId,
      name: newVehicleName.trim(),
      hourlyRate: Number(newVehicleRate),
      isDefault: false
    };

    const updatedTypes = [...localSettings.vehicleTypes, newType];
    setLocalSettings(prev => ({
      ...prev,
      vehicleTypes: updatedTypes
    }));

    setNewVehicleName('');
    setNewVehicleRate('');
  };

  // Delete vehicle type
  const handleDeleteVehicleType = (id) => {
    const type = localSettings.vehicleTypes.find(v => v.id === id);
    if (type && type.isDefault) {
      alert("No se pueden eliminar los tipos de vehículo por defecto (Auto, Moto, Camioneta).");
      return;
    }

    const updatedTypes = localSettings.vehicleTypes.filter(v => v.id !== id);
    setLocalSettings(prev => ({
      ...prev,
      vehicleTypes: updatedTypes
    }));
  };

  // Update rates for vehicle types
  const handleVehicleRateChange = (id, newRate) => {
    const updatedTypes = localSettings.vehicleTypes.map(v => {
      if (v.id === id) {
        return { ...v, hourlyRate: Number(newRate) };
      }
      return v;
    });

    setLocalSettings(prev => ({
      ...prev,
      vehicleTypes: updatedTypes
    }));
  };

  // Save all settings to DB
  const handleSave = () => {
    onSaveSettings(localSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings className="brand-icon" style={{ width: 22, height: 22 }} />
            Configuración del Sistema
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Ajusta los parámetros operativos, reglas de cobro y tarifas variables.
          </p>
        </div>
        <button 
          onClick={handleSave} 
          className="btn btn-primary"
          style={{ width: 'auto', display: 'flex', gap: '0.5rem', height: '40px', padding: '0 1.25rem' }}
        >
          <Save style={{ width: 18, height: 18 }} />
          {saveSuccess ? '¡Guardado!' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="settings-layout">
        {/* Left Side Tab Menu */}
        <ul className="settings-menu">
          <li 
            className={`settings-menu-item ${activeTab === 'modules' ? 'active' : ''}`}
            onClick={() => setActiveTab('modules')}
          >
            <ToggleLeft style={{ width: 18, height: 18 }} />
            Módulos y Funciones
          </li>
          <li 
            className={`settings-menu-item ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Clock style={{ width: 18, height: 18 }} />
            Reglas de Cobro
          </li>
          <li 
            className={`settings-menu-item ${activeTab === 'vehicles' ? 'active' : ''}`}
            onClick={() => setActiveTab('vehicles')}
          >
            <Users style={{ width: 18, height: 18 }} />
            Tipos de Vehículo
          </li>
          <li 
            className={`settings-menu-item ${activeTab === 'rates' ? 'active' : ''}`}
            onClick={() => setActiveTab('rates')}
          >
            <DollarSign style={{ width: 18, height: 18 }} />
            Tarifas Especiales
          </li>
          <li 
            className={`settings-menu-item ${activeTab === 'ticket' ? 'active' : ''}`}
            onClick={() => setActiveTab('ticket')}
          >
            <Printer style={{ width: 18, height: 18 }} />
            Ticket e Impresión
          </li>
        </ul>

        {/* Right Side Content Panel */}
        <div style={{ flex: 1 }}>
          {activeTab === 'modules' && (
            <div>
              <div className="settings-panel-header">
                <h2>Módulos y Funciones Activas</h2>
                <p>Habilita o deshabilita los componentes avanzados de la aplicación según las necesidades de tu estacionamiento.</p>
              </div>

              <div className="switch-container" style={{ marginBottom: '1.5rem' }}>
                <div className="switch-label-desc">
                  <span className="switch-title">Habilitar Mapa Interactivo de Plazas</span>
                  <span className="switch-desc">Permite asignar vehículos a espacios específicos y diseñar el croquis del garaje.</span>
                </div>
                <label className="switch-toggle">
                  <input 
                    type="checkbox" 
                    checked={localSettings.general.useMap} 
                    onChange={(e) => handleChange('general', 'useMap', e.target.checked)} 
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              <div className="switch-container" style={{ marginBottom: '1.5rem' }}>
                <div className="switch-label-desc">
                  <span className="switch-title">Habilitar Lector de Patentes (Cámara)</span>
                  <span className="switch-desc">Activa una pestaña dedicada para escanear patentes automáticamente mediante IA.</span>
                </div>
                <label className="switch-toggle">
                  <input 
                    type="checkbox" 
                    checked={localSettings.general.useCamera || false} 
                    onChange={(e) => handleChange('general', 'useCamera', e.target.checked)} 
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              <div className="switch-container" style={{ marginBottom: '1.5rem' }}>
                <div className="switch-label-desc">
                  <span className="switch-title">Habilitar Módulo de Abonados (Mensualidad)</span>
                  <span className="switch-desc">Activa una pestaña para gestionar clientes con pagos fijos adelantados.</span>
                </div>
                <label className="switch-toggle">
                  <input 
                    type="checkbox" 
                    checked={localSettings.general.useSubscribers || false} 
                    onChange={(e) => handleChange('general', 'useSubscribers', e.target.checked)} 
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Velocidad de Escaneo de IA (Segundos)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    step="1"
                    value={localSettings.general.ocrIntervalSeconds || 2}
                    onChange={(e) => handleChange('general', 'ocrIntervalSeconds', Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent-blue)' }}
                  />
                  <span style={{ fontWeight: 'bold', minWidth: '50px', textAlign: 'right' }}>
                    {localSettings.general.ocrIntervalSeconds || 2} s
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Determina cada cuántos segundos la IA lee el video. Un número menor es más rápido pero consume más recursos de CPU.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div>
              <div className="settings-panel-header">
                <h2>Reglas de Facturación y Capacidad</h2>
                <p>Establece la capacidad máxima del estacionamiento y las políticas de tolerancia o cobro fraccionado.</p>
              </div>

              <div className="form-group">
                <label className="form-label">Capacidad Máxima (Plazas Totales)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input 
                    type="range" 
                    min="5" 
                    max="300" 
                    step="5"
                    value={localSettings.general.capacity || 50}
                    onChange={(e) => handleChange('general', 'capacity', Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent-blue)' }}
                  />
                  <span style={{ fontWeight: 'bold', minWidth: '50px', textAlign: 'right' }}>
                    {localSettings.general.capacity || 50} slots
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tolerancia de Ingreso (Minutos de Gracia)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input 
                    type="range" 
                    min="0" 
                    max="60" 
                    step="5"
                    value={localSettings.general.toleranceMinutes}
                    onChange={(e) => handleChange('general', 'toleranceMinutes', Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent-blue)' }}
                  />
                  <span style={{ fontWeight: 'bold', minWidth: '50px', textAlign: 'right' }}>
                    {localSettings.general.toleranceMinutes} min
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Si el auto sale antes de este tiempo, la tarifa final es de $0.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Fraccionamiento</label>
                <select 
                  value={localSettings.general.billingType} 
                  onChange={(e) => handleChange('general', 'billingType', e.target.value)}
                  className="form-select"
                >
                  <option value="fraction">Fraccionar tiempo transcurrido</option>
                  <option value="hourly">Hora completa (Redondeo hacia arriba)</option>
                </select>
              </div>

              {localSettings.general.billingType === 'fraction' && (
                <div className="form-group" style={{ animation: 'slideUp 0.2s ease' }}>
                  <label className="form-label">Fracción de Tiempo Mínima (Minutos)</label>
                  <select 
                    value={localSettings.general.fractionMinutes} 
                    onChange={(e) => handleChange('general', 'fractionMinutes', Number(e.target.value))}
                    className="form-select"
                  >
                    <option value="15">Cada 15 minutos</option>
                    <option value="30">Cada 30 minutos</option>
                    <option value="45">Cada 45 minutos</option>
                  </select>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Ejemplo: 40 minutos transcurridos se cobrarán como 3 fracciones de 15 minutos (45 min facturables).
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'vehicles' && (
            <div>
              <div className="settings-panel-header">
                <h2>Gestión de Vehículos y Tarifas Base</h2>
                <p>Configura las tarifas base por hora de cada categoría y agrega nuevos tipos de vehículos según necesites.</p>
              </div>

              {/* Existing Vehicle Types Table */}
              <div className="vehicle-rates-list">
                {localSettings.vehicleTypes.map(type => (
                  <div key={type.id} className="vehicle-rate-row">
                    <div style={{ flex: 1, fontWeight: 600 }}>
                      {type.name} {type.isDefault && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'normal' }}>(Defecto)</span>}
                    </div>
                    <div className="rate-input-group">
                      <span className="rate-currency-label">$</span>
                      <input 
                        type="number" 
                        min="0"
                        value={type.hourlyRate}
                        onChange={(e) => handleVehicleRateChange(type.id, e.target.value)}
                        className="form-input"
                        placeholder="Tarifa/hr"
                        style={{ padding: '0.35rem 0.5rem', textAlign: 'right' }}
                      />
                      <span className="rate-currency-label">/hr</span>
                    </div>
                    {!type.isDefault && (
                      <button 
                        onClick={() => handleDeleteVehicleType(type.id)}
                        className="delete-rate-btn"
                        title="Eliminar tipo de vehículo"
                      >
                        <Trash2 style={{ width: 16, height: 16 }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Custom Vehicle Type Form */}
              <form onSubmit={handleAddVehicleType} style={{ 
                border: '1px solid var(--border-color)', 
                borderRadius: '12px', 
                padding: '20px',
                background: '#F9FAFB'
              }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus style={{ width: 16, height: 16, color: 'var(--accent-blue)' }} />
                  Crear Nuevo Tipo de Vehículo
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px auto', gap: '1rem', alignItems: 'end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nombre del Vehículo</label>
                    <input 
                      type="text" 
                      value={newVehicleName}
                      onChange={(e) => setNewVehicleName(e.target.value)}
                      placeholder="Ej: Camión, Cuatriciclo, Bicicleta" 
                      className="form-input"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Tarifa Base por Hora ($)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={newVehicleRate}
                      onChange={(e) => setNewVehicleRate(e.target.value)}
                      placeholder="Ej: 2200" 
                      className="form-input"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    style={{ height: '40px', width: 'auto', padding: '0 1.25rem' }}
                  >
                    Crear
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'rates' && (
            <div>
              <div className="settings-panel-header">
                <h2>Reglas de Tarifas Especiales y Dinámicas</h2>
                <p>Configura modificadores de precios para incentivar el flujo comercial o ajustar el cobro según ocupación.</p>
              </div>

              {/* Commercial Peak Hours Rate */}
              <div className="switch-container">
                <div className="switch-label-desc">
                  <span className="switch-title">Tarifa Horario Comercial (Peak / Off-Peak)</span>
                  <span className="switch-desc">Aplica un multiplicador en horas pico de alta demanda.</span>
                </div>
                <label className="switch-toggle">
                  <input 
                    type="checkbox" 
                    checked={localSettings.rates.commercial.active} 
                    onChange={(e) => handleRateChange('commercial', 'active', e.target.checked)} 
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              {localSettings.rates.commercial.active && (
                <div style={{ 
                  background: '#F9FAFB',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  animation: 'slideUp 0.2s ease'
                }}>
                  <div className="form-group">
                    <label className="form-label">Inicio Horario Pico</label>
                    <input 
                      type="time" 
                      value={localSettings.rates.commercial.peakStart}
                      onChange={(e) => handleRateChange('commercial', 'peakStart', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fin Horario Pico</label>
                    <input 
                      type="time" 
                      value={localSettings.rates.commercial.peakEnd}
                      onChange={(e) => handleRateChange('commercial', 'peakEnd', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Multiplicador Horas Pico (Ej: 1.5 = +50%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="1.0"
                      value={localSettings.rates.commercial.peakMultiplier}
                      onChange={(e) => handleRateChange('commercial', 'peakMultiplier', Number(e.target.value))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Multiplicador Horas Valle (Ej: 1.0 = Tarifa base)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="0.5"
                      value={localSettings.rates.commercial.offPeakMultiplier}
                      onChange={(e) => handleRateChange('commercial', 'offPeakMultiplier', Number(e.target.value))}
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              {/* Dynamic Capacity Rate */}
              <div className="switch-container">
                <div className="switch-label-desc">
                  <span className="switch-title">Tarifa Dinámica por Ocupación</span>
                  <span className="switch-desc">Ajusta el precio automáticamente según la ocupación en tiempo real.</span>
                </div>
                <label className="switch-toggle">
                  <input 
                    type="checkbox" 
                    checked={localSettings.rates.dynamic.active} 
                    onChange={(e) => handleRateChange('dynamic', 'active', e.target.checked)} 
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              {localSettings.rates.dynamic.active && (
                <div style={{ 
                  background: '#F9FAFB',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  animation: 'slideUp 0.2s ease'
                }}>
                  <div className="form-group">
                    <label className="form-label">Umbral Ocupación Alta (%)</label>
                    <input 
                      type="number" 
                      min="50"
                      max="100"
                      value={localSettings.rates.dynamic.occupancyThresholdHigh}
                      onChange={(e) => handleRateChange('dynamic', 'occupancyThresholdHigh', Number(e.target.value))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Multiplicador Ocupación Alta (Ej: 1.4x)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="1.0"
                      value={localSettings.rates.dynamic.multiplierHigh}
                      onChange={(e) => handleRateChange('dynamic', 'multiplierHigh', Number(e.target.value))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Umbral Ocupación Baja (%)</label>
                    <input 
                      type="number" 
                      min="0"
                      max="50"
                      value={localSettings.rates.dynamic.occupancyThresholdLow}
                      onChange={(e) => handleRateChange('dynamic', 'occupancyThresholdLow', Number(e.target.value))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Multiplicador Ocupación Baja (Ej: 0.8x)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="0.2"
                      value={localSettings.rates.dynamic.multiplierLow}
                      onChange={(e) => handleRateChange('dynamic', 'multiplierLow', Number(e.target.value))}
                      className="form-input"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ticket' && (
            <div>
              <div className="settings-panel-header">
                <h2>Diseño del Ticket y Recibo</h2>
                <p>Personaliza los datos del comercio que aparecerán en el ticket impreso de comprobante de pago.</p>
              </div>

              <div style={{ 
                background: '#F9FAFB',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                animation: 'slideUp 0.2s ease'
              }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nombre del Comercio / Razón Social</label>
                  <input 
                    type="text" 
                    value={localSettings.ticket?.businessName || ''}
                    onChange={(e) => handleChange('ticket', 'businessName', e.target.value)}
                    className="form-input"
                    placeholder="Ej: ESTACIONAMIENTO CENTRAL"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Dirección Fiscal / Ubicación</label>
                  <input 
                    type="text" 
                    value={localSettings.ticket?.address || ''}
                    onChange={(e) => handleChange('ticket', 'address', e.target.value)}
                    className="form-input"
                    placeholder="Ej: Av. Rivadavia 1234, CABA"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Teléfono o CUIT (Opcional)</label>
                  <input 
                    type="text" 
                    value={localSettings.ticket?.phone || ''}
                    onChange={(e) => handleChange('ticket', 'phone', e.target.value)}
                    className="form-input"
                    placeholder="Ej: Tel: 011 4455-6677 / CUIT: 30-12345678-9"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
