import React, { useState } from 'react';
import { BarChart3, Search, Download, Trash2, Award, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { formatElapsedTime } from '../utils/tariffUtils';

export default function Analytics({ analytics, history, onResetAll }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Format Date to friendly localized format
  const formatFriendlyDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter history records based on search query
  const filteredHistory = history.filter(item => 
    item.plate.toUpperCase().includes(searchTerm.toUpperCase()) ||
    (item.slotId && item.slotId.toUpperCase().includes(searchTerm.toUpperCase())) ||
    item.paymentMethod.toUpperCase().includes(searchTerm.toUpperCase())
  );

  // Generate and download CSV
  const handleExportCSV = () => {
    if (history.length === 0) return;
    
    const headers = ['ID', 'Patente', 'Tipo Vehículo', 'Plaza', 'Ingreso', 'Salida', 'Minutos Totales', 'Horas Facturadas', 'Tarifa Efectiva', 'Total Cobrado', 'Método Pago', 'Notas'];
    const rows = history.map(h => [
      h.id,
      h.plate,
      h.vehicleTypeId,
      h.slotId || '',
      h.entryTime,
      h.exitTime,
      h.feeDetails?.elapsedMinutes || 0,
      h.feeDetails?.billedHours || 0,
      h.feeDetails?.effectiveRate || 0,
      h.feeDetails?.totalFee || 0,
      h.paymentMethod,
      h.notes || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `estacionamiento_reporte_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Factory reset action
  const handleReset = () => {
    if (window.confirm("¿Estás absolutamente seguro de querer restablecer el sistema? Se borrará TODO el historial de cobros, configuraciones de tarifas y vehículos activos. Esta acción no se puede deshacer.")) {
      onResetAll();
    }
  };

  // Destructure distribution values
  const cashTotal = analytics.paymentMethodsDistribution['Efectivo'] || 0;
  const mpTotal = analytics.paymentMethodsDistribution['MercadoPago/QR'] || 0;
  const cardTotal = analytics.paymentMethodsDistribution['Tarjeta'] || 0;
  const maxPaymentVal = Math.max(1, cashTotal, mpTotal, cardTotal);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Analytics Summary Header cards */}
      <div className="metrics-grid">
        <div className="glass-panel metric-card blue">
          <div className="metric-header">
            <span>Caja del Día</span>
            <DollarSign style={{ width: 16, height: 16 }} />
          </div>
          <div className="metric-value">${analytics.totalEarningsToday}</div>
          <div className="metric-footer">Suma de cobros del turno de hoy</div>
        </div>

        <div className="glass-panel metric-card green">
          <div className="metric-header">
            <span>Vehículos Egresados</span>
            <TrendingUp style={{ width: 16, height: 16 }} />
          </div>
          <div className="metric-value">{analytics.todayCheckoutCount}</div>
          <div className="metric-footer">Estadías finalizadas hoy</div>
        </div>

        <div className="glass-panel metric-card purple">
          <div className="metric-header">
            <span>Estadía Promedio</span>
            <Calendar style={{ width: 16, height: 16 }} />
          </div>
          <div className="metric-value">{formatElapsedTime(analytics.avgStayMinutes)}</div>
          <div className="metric-footer">Tiempo de permanencia promedio</div>
        </div>

        <div className="glass-panel metric-card yellow">
          <div className="metric-header">
            <span>Tasa de Ocupación</span>
            <Award style={{ width: 16, height: 16 }} />
          </div>
          <div className="metric-value">{analytics.occupancyPercent}%</div>
          <div className="metric-footer">{analytics.activeCount} de {analytics.capacity} lugares ocupados</div>
        </div>
      </div>

      <div className="charts-grid">
        {/* Payment Methods Chart using Vanilla CSS */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1.25rem' }}>Ingresos por Métodos de Pago</h3>
          <div className="bar-chart-container">
            <div className="bar-row">
              <div className="bar-label">Efectivo</div>
              <div className="bar-track">
                <div className="bar-fill green" style={{ width: `${(cashTotal / maxPaymentVal) * 100}%` }}></div>
              </div>
              <div className="bar-value">${cashTotal}</div>
            </div>

            <div className="bar-row">
              <div className="bar-label">MercadoPago/QR</div>
              <div className="bar-track">
                <div className="bar-fill blue" style={{ width: `${(mpTotal / maxPaymentVal) * 100}%` }}></div>
              </div>
              <div className="bar-value">${mpTotal}</div>
            </div>

            <div className="bar-row">
              <div className="bar-label">Tarjeta</div>
              <div className="bar-track">
                <div className="bar-fill purple" style={{ width: `${(cardTotal / maxPaymentVal) * 100}%` }}></div>
              </div>
              <div className="bar-value">${cardTotal}</div>
            </div>
          </div>
        </div>

        {/* Operational Statistics Info */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem' }}>Información de Turnos</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Los ingresos de hoy se calculan en base a los vehículos que realizaron el cobro y salida desde las 00:00 del día actual.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ticket Promedio</span>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-green)', marginTop: '0.25rem' }}>
                ${analytics.todayCheckoutCount > 0 ? Math.round(analytics.totalEarningsToday / analytics.todayCheckoutCount) : 0}
              </p>
            </div>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lugares Libres</span>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-blue)', marginTop: '0.25rem' }}>
                {Math.max(0, analytics.capacity - analytics.activeCount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Log Table */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Registro Histórico de Estadías</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Historial completo de salidas y cobranzas.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="input-wrapper search-bar">
              <Search className="input-icon" style={{ width: 16, height: 16 }} />
              <input 
                type="text" 
                placeholder="Buscar por patente, pago..." 
                className="form-input form-input-with-icon"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '0.5rem 0.75rem 0.5rem 2.25rem', fontSize: '0.85rem' }}
              />
            </div>
            <button 
              onClick={handleExportCSV} 
              className="btn btn-secondary"
              style={{ width: 'auto', display: 'flex', gap: '0.5rem', height: '36px', padding: '0 0.75rem', fontSize: '0.85rem' }}
              disabled={history.length === 0}
              title="Descargar reporte en formato Excel/CSV"
            >
              <Download style={{ width: 16, height: 16 }} />
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Patente</th>
                <th>Tipo</th>
                <th>Plaza</th>
                <th>Ingreso</th>
                <th>Salida</th>
                <th>Duración</th>
                <th>Cobrado</th>
                <th>Pago</th>
                <th>Comentarios</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="plate-badge" style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', border: '1px solid #374151' }}>
                      {item.plate}
                    </span>
                  </td>
                  <td>
                    <span className="vehicle-badge" style={{ fontSize: '0.7rem' }}>
                      {item.vehicleTypeId.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {item.slotId ? <span className="tag-slot">{item.slotId}</span> : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                  </td>
                  <td>{formatFriendlyDate(item.entryTime)}</td>
                  <td>{formatFriendlyDate(item.exitTime)}</td>
                  <td>{formatElapsedTime(item.feeDetails?.elapsedMinutes || 0)}</td>
                  <td style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>
                    ${item.feeDetails?.totalFee || 0}
                  </td>
                  <td>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      color: item.paymentMethod === 'MercadoPago/QR' ? 'var(--accent-blue)' : item.paymentMethod === 'Tarjeta' ? 'var(--accent-purple)' : 'var(--accent-green)'
                    }}>
                      {item.paymentMethod}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.notes}>
                    {item.notes || <em style={{ color: 'var(--text-muted)' }}>Ninguno</em>}
                  </td>
                </tr>
              ))}

              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    {searchTerm ? 'No se encontraron registros que coincidan con la búsqueda.' : 'No hay salidas registradas aún.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-panel" style={{ border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.03)' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-red)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Trash2 style={{ width: 18, height: 18 }} />
          Zona de Peligro
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          La restauración del sistema borrará permanentemente todas las configuraciones guardadas, tipos de vehículos personalizados, registros de vehículos activos y el historial de cobros de forma irreversible.
        </p>
        <button 
          onClick={handleReset} 
          className="btn btn-danger"
          style={{ width: 'auto', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
        >
          Restablecer Sistema Completo
        </button>
      </div>

    </div>
  );
}
