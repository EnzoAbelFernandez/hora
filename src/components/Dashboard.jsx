import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Clock, DollarSign, Tag, MessageSquare, ChevronRight, CheckCircle } from 'lucide-react';
import { calculateParkingFee, formatElapsedTime } from '../utils/tariffUtils';

export default function Dashboard({ 
  activeVehicles, 
  settings, 
  slots, 
  onAddVehicle, 
  onTriggerCheckout, 
  selectedSlotId, 
  onSelectSlot,
  occupancyPercent,
  externalPlate,
  onClearExternalPlate,
  subscribers = []
}) {
  const [plate, setPlate] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('auto');
  const [slotId, setSlotId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tick, setTick] = useState(Date.now());
  const [formError, setFormError] = useState('');

  // Live Timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update selected slot from map link
  useEffect(() => {
    if (selectedSlotId) {
      setSlotId(selectedSlotId);
    }
  }, [selectedSlotId]);

  // Handle external plate suggestion
  useEffect(() => {
    if (externalPlate) {
      setPlate(externalPlate);
      if (onClearExternalPlate) {
        onClearExternalPlate();
      }
    }
  }, [externalPlate, onClearExternalPlate]);

  // Form input validation & formatting
  const handlePlateChange = (e) => {
    // Format: alphanumeric only, upper case, no spaces
    const cleanPlate = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setPlate(cleanPlate);
    setFormError('');
  };

  // Format plate visually (e.g. AA 123 BB or AAA 123)
  const formatPlate = (plateStr) => {
    if (!plateStr) return '';
    const p = plateStr.toUpperCase().replace(/\s+/g, '');
    if (p.length === 7) {
      return `${p.substring(0, 2)} ${p.substring(2, 5)} ${p.substring(5, 7)}`;
    } else if (p.length === 6) {
      return `${p.substring(0, 3)} ${p.substring(3, 6)}`;
    }
    return p;
  };

  // Submit new entry
  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!plate.trim()) {
      setFormError('La patente es requerida.');
      return;
    }

    if (plate.length < 6 || plate.length > 7) {
      setFormError('Formato de patente inválido. Debe tener 6 o 7 caracteres (ej: AAA123 o AA123BB).');
      return;
    }

    try {
      onAddVehicle({
        plate: plate.toUpperCase(),
        vehicleTypeId,
        slotId: slotId || null,
        notes: ''
      });

      // Clear form
      setPlate('');
      setSlotId('');
      onSelectSlot(null); // Clear map selection if any
    } catch (err) {
      setFormError(err.message || 'Error al registrar el ingreso.');
    }
  };

  // Filter active vehicles based on search query
  const filteredVehicles = activeVehicles.filter(v => 
    v.plate.toUpperCase().includes(searchTerm.toUpperCase()) ||
    (v.slotId && v.slotId.toUpperCase().includes(searchTerm.toUpperCase())) ||
    v.vehicleTypeId.toUpperCase().includes(searchTerm.toUpperCase())
  );

  // List of vacant slots
  const vacantSlots = slots.filter(s => !s.occupiedBy);

  // Check if current input plate is subscriber
  const inputSubscriber = subscribers.find(s => 
    s.plate.toUpperCase() === plate.toUpperCase()
  );
  const isInputSubscriberActive = inputSubscriber && (new Date(inputSubscriber.validUntil).setHours(23, 59, 59, 999) >= new Date().getTime());

  return (
    <div className="dashboard-layout">
      {/* Left Column: Register entry form */}
      <div className="glass-panel" style={{ position: 'sticky', top: '1rem' }}>
        <h2 className="form-title">
          <Plus style={{ color: 'var(--accent-blue)', width: 22, height: 22 }} />
          Registrar Ingreso
        </h2>

        {formError && (
          <div style={{ 
            background: '#FEF2F2', 
            border: '1px solid #FECACA', 
            padding: '12px', 
            borderRadius: '6px', 
            color: 'var(--accent-red)',
            fontSize: '0.875rem',
            marginBottom: '16px'
          }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          {/* Patente */}
          <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Patente
                {inputSubscriber && (
                  <span style={{ 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontSize: '0.65rem', 
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                    background: isInputSubscriberActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: isInputSubscriberActive ? 'var(--accent-green)' : 'var(--accent-red)'
                  }}>
                    <CheckCircle style={{ width: 10, height: 10 }} />
                    {isInputSubscriberActive ? 'Abonado' : 'Vencido'}
                  </span>
                )}
              </span>
              {plate && <strong style={{ color: 'var(--text-secondary)' }}>{formatPlate(plate)}</strong>}
            </label>
            <input 
              type="text"
              value={plate}
              onChange={handlePlateChange}
              placeholder="Ej: AA123BB"
              className="form-input plate-input-field"
              maxLength={7}
              style={{ height: '42px' }}
            />
          </div>

          {/* Tipo de Vehiculo */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipo de Vehículo</label>
            <select 
              value={vehicleTypeId} 
              onChange={(e) => setVehicleTypeId(e.target.value)}
              className="form-select"
              style={{ height: '42px' }}
            >
              {settings.vehicleTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name} (${type.hourlyRate}/hr)
                </option>
              ))}
            </select>
          </div>

          {/* Plaza Asignada (Mapa) */}
          {settings.general.useMap !== false && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Asignar Plaza (Opcional)</label>
              <select 
                value={slotId} 
                onChange={(e) => {
                  setSlotId(e.target.value);
                  onSelectSlot(e.target.value || null);
                }}
                className="form-select"
                style={{ height: '42px' }}
              >
                <option value="">-- Sin plaza asignada --</option>
                {vacantSlots.map(s => (
                  <option key={s.id} value={s.id}>
                    Plaza {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Registrar Entrada
          </button>
        </form>
      </div>

      {/* Right Column: Active parked cars list */}
      <div>
        <div className="active-vehicles-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Vehículos Estacionados</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {activeVehicles.length} vehículos en el establecimiento ({occupancyPercent}% ocupación).
            </p>
          </div>
          <div className="input-wrapper search-bar">
            <Search className="input-icon" style={{ width: 16, height: 16 }} />
            <input 
              type="text" 
              placeholder="Buscar patente o plaza..." 
              className="form-input form-input-with-icon"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.5rem 0.75rem 0.5rem 2.25rem', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Grid of active vehicles */}
        <div className="vehicles-grid">
          {filteredVehicles.map(vehicle => {
            const entryDate = new Date(vehicle.entryTime);
            
            // Calculate live elapsed minutes
            const elapsedMs = Math.max(0, tick - entryDate.getTime());
            const elapsedMins = Math.ceil(elapsedMs / 60000);

            // Calculate live cost
            const feeInfo = calculateParkingFee(
              vehicle.entryTime, 
              tick, 
              settings, 
              occupancyPercent, 
              vehicle.vehicleTypeId
            );

            // Get Vehicle Type Name
            const typeInfo = settings.vehicleTypes.find(v => v.id === vehicle.vehicleTypeId) || { name: vehicle.vehicleTypeId };

            // Check if active subscriber
            const subscriber = subscribers.find(s => 
              s.plate.toUpperCase() === vehicle.plate.toUpperCase() && 
              new Date(s.validUntil).setHours(23, 59, 59, 999) >= new Date().getTime()
            );

            return (
              <div key={vehicle.id} className="glass-panel vehicle-card">
                <div className="vehicle-card-header">
                  <span className="plate-badge">{formatPlate(vehicle.plate)}</span>
                  <span className="vehicle-badge">{typeInfo.name}</span>
                </div>

                <div className="vehicle-card-body">
                  <div className="vehicle-detail-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar style={{ width: 14, height: 14 }} /> Ingreso:
                    </span>
                    <span className="detail-val">
                      {entryDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="vehicle-detail-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock style={{ width: 14, height: 14 }} /> Tiempo:
                    </span>
                    <span className="detail-val" style={{ fontWeight: 600 }}>
                      {formatElapsedTime(elapsedMins)}
                    </span>
                  </div>

                  <div className="vehicle-detail-row" style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <DollarSign style={{ width: 14, height: 14 }} /> Acumulado:
                    </span>
                    {subscriber ? (
                      <span className="live-cost-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                        Abonado ($0)
                      </span>
                    ) : (
                      <span className="live-cost-badge">
                        ${feeInfo.totalFee}
                      </span>
                    )}
                  </div>

                  {vehicle.slotId && settings.general.useMap !== false && (
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                      <Tag style={{ width: 12, height: 12, color: 'var(--accent-blue)', marginTop: '2px' }} />
                      <span className="tag-slot">Plaza {vehicle.slotId}</span>
                    </div>
                  )}

                  {vehicle.notes && (
                    <div style={{ 
                      marginTop: '12px', 
                      background: '#F9FAFB', 
                      padding: '8px 12px', 
                      borderRadius: '6px', 
                      fontSize: '0.75rem', 
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'flex-start',
                      border: '1px solid var(--border-color)'
                    }}>
                      <MessageSquare style={{ width: 12, height: 12, flexShrink: 0, marginTop: '2px', color: 'var(--text-muted)' }} />
                      <span style={{ fontStyle: 'italic', wordBreak: 'break-word' }}>"{vehicle.notes}"</span>
                    </div>
                  )}
                </div>

                <div className="vehicle-card-footer">
                  <button 
                    onClick={() => onTriggerCheckout(vehicle)} 
                    className="btn btn-success"
                    style={{ padding: '8px 12px', fontSize: '0.875rem', display: 'flex', gap: '6px' }}
                  >
                    <CheckCircle style={{ width: 16, height: 16 }} />
                    {subscriber ? 'Liberar Abonado' : 'Cobrar y Liberar'}
                  </button>
                </div>
              </div>
            );
          })}

          {filteredVehicles.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              {searchTerm ? 'No hay vehículos activos que coincidan con la búsqueda.' : 'No hay vehículos estacionados en este momento.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
