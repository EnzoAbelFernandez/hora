import React, { useState } from 'react';
import { Users, Search, Plus, Trash2, Edit2, CheckCircle2, AlertCircle, Clock, CalendarDays, CreditCard, X } from 'lucide-react';
import { dbService } from '../services/dbService';

export default function Subscribers({ subscribers, onUpdate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    plate: '',
    vehicleTypeId: 'auto',
    validUntil: new Date().toISOString().split('T')[0]
  });

  const vehicleTypes = dbService.getVehicleTypes();

  const handleOpenModal = (sub = null) => {
    if (sub) {
      setEditingSub(sub);
      setFormData({
        name: sub.name,
        phone: sub.phone,
        plate: sub.plate,
        vehicleTypeId: sub.vehicleTypeId,
        validUntil: new Date(sub.validUntil).toISOString().split('T')[0]
      });
    } else {
      setEditingSub(null);
      // Default expiration to 1 month from today
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      setFormData({
        name: '',
        phone: '',
        plate: '',
        vehicleTypeId: vehicleTypes[0]?.id || 'auto',
        validUntil: nextMonth.toISOString().split('T')[0]
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSub(null);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.plate || !formData.validUntil) return;

    if (editingSub) {
      dbService.updateSubscriber(editingSub.id, formData);
    } else {
      dbService.addSubscriber(formData);
    }
    onUpdate();
    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de eliminar este abonado?')) {
      dbService.deleteSubscriber(id);
      onUpdate();
    }
  };

  const handleRenew = (sub) => {
    if (window.confirm(`¿Registrar un nuevo pago mensual para ${sub.name}? Esto extenderá su vencimiento 1 mes.`)) {
      const currentValid = new Date(sub.validUntil);
      const today = new Date();
      
      // If expired, start 1 month from today. If active, add 1 month to current expiration.
      let newExpiration = new Date();
      if (currentValid > today) {
        newExpiration = new Date(currentValid);
      }
      
      newExpiration.setMonth(newExpiration.getMonth() + 1);
      
      dbService.updateSubscriber(sub.id, {
        validUntil: newExpiration.toISOString()
      });
      onUpdate();
    }
  };

  const filteredSubs = subscribers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatus = (validUntilStr) => {
    const validUntil = new Date(validUntilStr);
    validUntil.setHours(23, 59, 59, 999);
    
    const today = new Date();
    
    // Difference in days
    const diffTime = validUntil - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'Vencido', color: 'var(--accent-red)', icon: <AlertCircle style={{ width: 14, height: 14 }} /> };
    } else if (diffDays <= 3) {
      return { label: 'Vence Pronto', color: 'var(--accent-purple)', icon: <Clock style={{ width: 14, height: 14 }} /> };
    }
    return { label: 'Activo', color: 'var(--accent-green)', icon: <CheckCircle2 style={{ width: 14, height: 14 }} /> };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users style={{ width: 22, height: 22, color: 'var(--accent-blue)' }} />
            Directorio de Abonados
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Gestiona clientes que abonan por mes adelantado.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="input-wrapper search-bar" style={{ minWidth: '250px' }}>
            <Search className="input-icon" style={{ width: 16, height: 16 }} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o patente..." 
              className="form-input form-input-with-icon"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px 12px 8px 36px', fontSize: '0.875rem' }}
            />
          </div>
          <button 
            onClick={() => handleOpenModal()} 
            className="btn btn-primary"
            style={{ width: 'auto', display: 'flex', gap: '8px', padding: '0 16px', height: '40px' }}
          >
            <Plus style={{ width: 18, height: 18 }} />
            Nuevo Abonado
          </button>
        </div>
      </div>

      <div className="glass-panel">
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Patente</th>
                <th>Vehículo</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubs.map((sub) => {
                const status = getStatus(sub.validUntil);
                return (
                  <tr key={sub.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{sub.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub.phone || 'Sin teléfono'}</div>
                    </td>
                    <td>
                      <span className="plate-badge" style={{ fontSize: '0.75rem', padding: '2px 6px', border: '1px solid var(--border-color)' }}>
                        {sub.plate}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{sub.vehicleTypeId}</td>
                    <td>
                      {new Date(sub.validUntil).toLocaleDateString('es-AR')}
                    </td>
                    <td>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: '999px',
                        background: `${status.color}15`,
                        color: status.color
                      }}>
                        {status.icon}
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleRenew(sub)}
                          className="btn btn-success"
                          style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', display: 'flex', gap: '4px', height: '32px' }}
                          title="Renovar 1 mes"
                        >
                          <CreditCard style={{ width: 14, height: 14 }} />
                          Renovar
                        </button>
                        <button 
                          onClick={() => handleOpenModal(sub)}
                          className="btn btn-secondary"
                          style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Editar abonado"
                        >
                          <Edit2 style={{ width: 14, height: 14 }} />
                        </button>
                        <button 
                          onClick={() => handleDelete(sub.id)}
                          className="delete-rate-btn"
                          style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FEF2F2', border: '1px solid #FECACA' }}
                          title="Eliminar abonado"
                        >
                          <Trash2 style={{ width: 14, height: 14, color: 'var(--accent-red)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSubs.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    {searchTerm ? 'No se encontraron abonados con esa búsqueda.' : 'No hay abonados registrados en el sistema.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingSub ? 'Editar Abonado' : 'Nuevo Abonado'}</h2>
              <button onClick={handleCloseModal} className="modal-close-btn">
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <form onSubmit={handleSave} className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="form-input"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Patente</label>
                  <input 
                    type="text" 
                    required
                    value={formData.plate}
                    onChange={(e) => setFormData({...formData, plate: e.target.value.toUpperCase()})}
                    className="form-input"
                    placeholder="Ej: AA 123 BB"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo de Vehículo</label>
                  <select 
                    value={formData.vehicleTypeId}
                    onChange={(e) => setFormData({...formData, vehicleTypeId: e.target.value})}
                    className="form-select"
                  >
                    {vehicleTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Teléfono (Opcional)</label>
                <input 
                  type="text" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="form-input"
                  placeholder="Ej: +54 9 11 1234-5678"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Fecha de Vencimiento (Mes pagado hasta)</label>
                <input 
                  type="date" 
                  required
                  value={formData.validUntil}
                  onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
                  className="form-input"
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '24px' }}>
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary" style={{ width: 'auto' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
                  {editingSub ? 'Guardar Cambios' : 'Registrar Abonado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
