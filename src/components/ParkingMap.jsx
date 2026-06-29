import React, { useState } from 'react';
import { Plus, Trash2, MapPin, Grid, ShieldAlert } from 'lucide-react';

export default function ParkingMap({ slots, activeVehicles, onSaveSlots, onSelectSlot, selectedSlotId, onViewCheckout }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newSlotName, setNewSlotName] = useState('');
  const [error, setError] = useState('');
  
  // Drag and drop state
  const [localSlots, setLocalSlots] = useState(slots);
  const [draggingSlot, setDraggingSlot] = useState(null);

  React.useEffect(() => {
    setLocalSlots(slots);
  }, [slots]);

  // Add new slot
  const handleAddSlot = (e) => {
    e.preventDefault();
    if (!newSlotName.trim()) return;
    
    const formattedName = newSlotName.trim().toUpperCase();
    
    // Check if slot name already exists
    if (slots.some(s => s.id === formattedName)) {
      setError('Esa plaza ya existe.');
      return;
    }

    const newSlot = {
      id: formattedName,
      name: formattedName,
      occupiedBy: null,
      vehicleType: null,
      x: 20, // default insert position
      y: 20
    };

    const updated = [...localSlots, newSlot];
    setLocalSlots(updated);
    onSaveSlots(updated);
    setNewSlotName('');
    setError('');
  };

  // Delete slot
  const handleDeleteSlot = (slotId) => {
    const slot = slots.find(s => s.id === slotId);
    if (slot && slot.occupiedBy) {
      setError(`No se puede eliminar la plaza ${slotId} porque está ocupada.`);
      return;
    }
    const updated = localSlots.filter(s => s.id !== slotId);
    setLocalSlots(updated);
    onSaveSlots(updated);
    setError('');
  };

  // Find vehicle associated with slot
  const getVehicleForSlot = (plate) => {
    return activeVehicles.find(v => v.plate.toUpperCase() === plate.toUpperCase());
  };

  // Drag and drop handlers
  const handleMouseDown = (e, slot) => {
    if (!isEditing) return;
    e.preventDefault(); // prevent text selection while dragging
    setDraggingSlot({
      id: slot.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: slot.x || 0,
      initialY: slot.y || 0
    });
  };

  const handleMouseMove = (e) => {
    if (!draggingSlot || !isEditing) return;
    const dx = e.clientX - draggingSlot.startX;
    const dy = e.clientY - draggingSlot.startY;
    
    // Calculate new positions, bounded to >= 0
    const newX = Math.max(0, draggingSlot.initialX + dx);
    const newY = Math.max(0, draggingSlot.initialY + dy);

    setLocalSlots(prev => prev.map(s => 
      s.id === draggingSlot.id ? { ...s, x: newX, y: newY } : s
    ));
  };

  const handleMouseUp = () => {
    if (!draggingSlot) return;
    setDraggingSlot(null);
    onSaveSlots(localSlots); // persist position
  };

  return (
    <div className="glass-panel">
      <div className="map-view-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Grid className="brand-icon" style={{ width: 22, height: 22 }} />
            Mapa de Plazas
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {isEditing ? 'Agrega, renombra o elimina plazas del estacionamiento.' : 'Visualiza la ocupación de las plazas de forma interactiva.'}
          </p>
        </div>
        <button 
          onClick={() => { setIsEditing(!isEditing); setError(''); }} 
          className="btn btn-secondary"
          style={{ width: 'auto', padding: '0.5rem 1rem' }}
        >
          {isEditing ? 'Vista Ocupación' : 'Editar Estructura'}
        </button>
      </div>

      {error && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.2)', 
          padding: '0.75rem', 
          borderRadius: '8px', 
          color: 'var(--accent-red)',
          fontSize: '0.875rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <ShieldAlert style={{ width: 18, height: 18 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Freehand Map Canvas */}
      <div 
        className={`map-canvas ${isEditing ? 'editing' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {localSlots.map(slot => {
          const isOccupied = !!slot.occupiedBy;
          const isSelected = selectedSlotId === slot.id;
          const associatedVehicle = isOccupied ? getVehicleForSlot(slot.occupiedBy) : null;

          return (
            <div 
              key={slot.id} 
              className={`slot-box map-slot ${isOccupied ? 'occupied' : ''} ${isSelected ? 'selected' : ''}`}
              style={{
                position: 'absolute',
                left: slot.x || 0,
                top: slot.y || 0,
                cursor: isEditing ? (draggingSlot?.id === slot.id ? 'grabbing' : 'grab') : 'pointer',
                zIndex: draggingSlot?.id === slot.id ? 10 : 1
              }}
              onMouseDown={(e) => handleMouseDown(e, slot)}
              onClick={() => {
                if (isEditing) return;
                if (isOccupied && associatedVehicle) {
                  onViewCheckout(associatedVehicle);
                } else {
                  onSelectSlot(slot.id === selectedSlotId ? null : slot.id);
                }
              }}
              title={isOccupied ? `Ocupado por ${slot.occupiedBy}` : (isEditing ? 'Arrastra para mover' : 'Plaza Libre - Click para seleccionar')}
            >
              {isEditing && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteSlot(slot.id); }} 
                  className="delete-rate-btn" 
                  style={{ position: 'absolute', top: 4, right: 4, color: 'var(--text-muted)' }}
                  title="Eliminar plaza"
                >
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              )}
              
              <span className="slot-name">{slot.name}</span>
              
              {isOccupied ? (
                <span className="slot-plate">{slot.occupiedBy}</span>
              ) : (
                <span style={{ fontSize: '0.65rem', color: 'var(--accent-green)', fontWeight: 'bold', marginTop: '0.25rem' }}>
                  LIBRE
                </span>
              )}

              {slot.vehicleType && (
                <span className="slot-type-indicator">
                  {slot.vehicleType.toUpperCase()}
                </span>
              )}
            </div>
          );
        })}

        {localSlots.length === 0 && (
          <div style={{ position: 'absolute', width: '100%', textAlign: 'center', top: '40%', color: 'var(--text-secondary)' }}>
            No hay plazas registradas en el mapa.
          </div>
        )}
      </div>

      {/* Map Designer controls */}
      {isEditing && (
        <div className="map-editor-panel">
          <form onSubmit={handleAddSlot} className="slot-editor-controls">
            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
              <label className="form-label">Identificador de la Plaza (ej: E12, A5)</label>
              <div className="input-wrapper">
                <MapPin className="input-icon" style={{ width: 18, height: 18 }} />
                <input 
                  type="text" 
                  value={newSlotName}
                  onChange={(e) => setNewSlotName(e.target.value)}
                  placeholder="Ej: A6" 
                  className="form-input form-input-with-icon"
                  maxLength={5}
                />
              </div>
            </div>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ width: 'auto', display: 'flex', gap: '0.5rem', height: '42px', padding: '0 1.25rem' }}
            >
              <Plus style={{ width: 18, height: 18 }} />
              Agregar
            </button>
          </form>
        </div>
      )}

      {!isEditing && (
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <div style={{ width: 12, height: 12, borderRadius: '3px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--accent-red)' }} />
          <span>Rojo = Ocupado (Click para facturar/liberar)</span>
          <div style={{ width: 12, height: 12, borderRadius: '3px', background: 'rgba(15, 22, 38, 0.6)', border: '2px dashed rgba(255, 255, 255, 0.1)', marginLeft: '1rem' }} />
          <span>Gris = Disponible (Click para asignar a próximo ingreso)</span>
        </div>
      )}
    </div>
  );
}
