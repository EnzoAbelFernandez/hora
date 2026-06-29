import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Map, 
  Settings, 
  BarChart3, 
  Clock, 
  Printer, 
  X, 
  AlertTriangle,
  Grid,
  ShieldCheck,
  Check,
  Camera
} from 'lucide-react';
import { dbService } from './services/dbService';
import { calculateParkingFee, formatElapsedTime } from './utils/tariffUtils';

import Dashboard from './components/Dashboard';
import ParkingMap from './components/ParkingMap';
import PlateCamera from './components/PlateCamera';
import TariffSettings from './components/TariffSettings';
import Analytics from './components/Analytics';
import Ticket from './components/Ticket';
import { useReactToPrint } from 'react-to-print';

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState('dashboard');
  
  // Data States
  const [settings, setSettings] = useState(dbService.getSettings());
  const [activeVehicles, setActiveVehicles] = useState(dbService.getActiveVehicles());
  const [slots, setSlots] = useState(dbService.getSlots());
  const [history, setHistory] = useState(dbService.getHistory());
  const [analytics, setAnalytics] = useState(dbService.getAnalytics());
  
  // Interactions States
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [checkoutVehicle, setCheckoutVehicle] = useState(null);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('Efectivo');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [suggestedPlate, setSuggestedPlate] = useState(null);
  const [dashboardPlate, setDashboardPlate] = useState('');
  const [realTime, setRealTime] = useState(new Date());

  // Ref for the Ticket component
  const ticketRef = React.useRef(null);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setRealTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync state helper
  const syncState = () => {
    setActiveVehicles(dbService.getActiveVehicles());
    setSlots(dbService.getSlots());
    setHistory(dbService.getHistory());
    setAnalytics(dbService.getAnalytics());
  };

  // Add Vehicle
  const handleAddVehicle = (vehicleData) => {
    const newVehicle = dbService.addActiveVehicle(vehicleData);
    syncState();
    
    // Clear plate suggestion if it matches
    if (suggestedPlate && suggestedPlate.toUpperCase() === vehicleData.plate.toUpperCase()) {
      setSuggestedPlate(null);
    }
    return newVehicle;
  };

  // Checkout Vehicle Modal trigger
  const handleTriggerCheckout = (vehicle) => {
    setCheckoutVehicle(vehicle);
    setCheckoutPaymentMethod('Efectivo');
    setCheckoutNotes(vehicle.notes || '');
  };

  // Confirm Checkout and Pay
  const handleConfirmCheckout = () => {
    if (!checkoutVehicle) return;

    // The print logic is now handled by the handlePrint wrapper.
    const exitTime = new Date().toISOString();
    const feeDetails = calculateParkingFee(
      checkoutVehicle.entryTime, 
      exitTime, 
      settings, 
      analytics.occupancyPercent, 
      checkoutVehicle.vehicleTypeId
    );

    dbService.checkoutVehicle(checkoutVehicle.id, {
      exitTime,
      feeDetails,
      paymentMethod: checkoutPaymentMethod,
      notes: checkoutNotes
    });

    syncState();
    setCheckoutVehicle(null);
    setCheckoutNotes('');
  };

  const handlePrint = useReactToPrint({
    contentRef: ticketRef,
    onAfterPrint: () => handleConfirmCheckout(),
    pageStyle: `
      @page {
        size: 80mm auto;
        margin: 0;
      }
      @media print {
        body { margin: 0; padding: 0; }
        .ticket {
          width: 80mm;
          font-family: monospace;
          padding: 5mm;
          color: black;
          background: white;
        }
      }
    `
  });

  // Save settings
  const handleSaveSettings = (updatedSettings) => {
    dbService.saveSettings(updatedSettings);
    setSettings(updatedSettings);
    syncState();
    if (!updatedSettings.general.useMap && currentTab === 'map') {
      setCurrentTab('dashboard');
    }
  };

  // Save Slots layout
  const handleSaveSlots = (updatedSlots) => {
    dbService.saveSlots(updatedSlots);
    setSlots(updatedSlots);
    syncState();
  };

  // Reset entire system
  const handleResetAll = () => {
    dbService.resetAll();
    setSettings(dbService.getSettings());
    syncState();
    setCurrentTab('dashboard');
  };

  // Format Plate for suggestion display
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

  // Populate suggested plate to input form
  const handleAcceptPlateSuggestion = () => {
    setDashboardPlate(suggestedPlate);
    setSuggestedPlate(null);
    setCurrentTab('dashboard'); // Switch to dashboard if not there
  };

  // Calculate final checkout ticket values
  let checkoutFeeDetails = null;
  let checkoutEntryDate = null;
  let checkoutExitDate = new Date();
  let checkoutVehicleType = null;
  if (checkoutVehicle) {
    checkoutEntryDate = new Date(checkoutVehicle.entryTime);
    checkoutFeeDetails = calculateParkingFee(
      checkoutVehicle.entryTime, 
      checkoutExitDate.toISOString(), 
      settings, 
      analytics.occupancyPercent, 
      checkoutVehicle.vehicleTypeId
    );
    checkoutVehicleType = settings.vehicleTypes.find(v => v.id === checkoutVehicle.vehicleTypeId) || { name: checkoutVehicle.vehicleTypeId };
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand-section">
          <Grid className="brand-icon" style={{ width: 28, height: 28 }} />
          <span className="brand-name">HORA</span>
        </div>

        <nav>
          <ul className="nav-list">
            <li className="nav-item">
              <a 
                onClick={() => setCurrentTab('dashboard')} 
                className={`nav-link ${currentTab === 'dashboard' ? 'active' : ''}`}
              >
                <LayoutDashboard className="nav-icon" />
                <span>Dashboard</span>
              </a>
            </li>
            {settings.general.useMap !== false && (
              <li className="nav-item">
                <a 
                  onClick={() => setCurrentTab('map')} 
                  className={`nav-link ${currentTab === 'map' ? 'active' : ''}`}
                >
                  <Map className="nav-icon" />
                  <span>Mapa de Plazas</span>
                </a>
              </li>
            )}
            {settings.general.useCamera === true && (
              <li className="nav-item">
                <a 
                  onClick={() => setCurrentTab('camera')} 
                  className={`nav-link ${currentTab === 'camera' ? 'active' : ''}`}
                >
                  <Camera className="nav-icon" />
                  <span>Lector OCR</span>
                </a>
              </li>
            )}
            <li className="nav-item">
              <a 
                onClick={() => setCurrentTab('settings')} 
                className={`nav-link ${currentTab === 'settings' ? 'active' : ''}`}
              >
                <Settings className="nav-icon" />
                <span>Configuración</span>
              </a>
            </li>
            <li className="nav-item">
              <a 
                onClick={() => setCurrentTab('analytics')} 
                className={`nav-link ${currentTab === 'analytics' ? 'active' : ''}`}
              >
                <BarChart3 className="nav-icon" />
                <span>Reportes y Caja</span>
              </a>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justify: 'center' }}>
            <ShieldCheck style={{ color: 'var(--accent-blue)', width: 20, height: 20 }} />
          </div>
          <div className="user-info">
            <span className="user-name">Encargado de Caja</span>
            <span className="user-role">Turno Mañana/Tarde</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>© Mara Studio</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="content-wrapper">
        
        {/* Header with live clock */}
        <header className="top-header">
          <div className="page-title-section">
            <h1 style={{ textTransform: 'capitalize' }}>
              {currentTab === 'dashboard' ? 'Control de Estacionamiento' : currentTab === 'camera' ? 'Lector de Patentes IA' : currentTab === 'map' ? 'Diseñador de Plazas' : currentTab === 'settings' ? 'Reglas y Tarifas' : 'Analíticas y Caja'}
            </h1>
            <p>
              {currentTab === 'dashboard' ? 'Visualiza vehículos activos, registra ingresos y procesa egresos.' : currentTab === 'camera' ? 'Escaneo automático de patentes mediante cámara en vivo.' : currentTab === 'map' ? 'Administra el croquis físico de estacionamiento.' : currentTab === 'settings' ? 'Define el cobro comercial, dinámico y fraccionado.' : 'Revisa el flujo de caja, distribución de pagos y exporta reportes.'}
            </p>
          </div>
          
          <div className="header-actions">
            <div className="time-badge">
              <div className="pulse-dot"></div>
              <Clock style={{ width: 16, height: 16 }} />
              <span>
                {realTime.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {realTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </header>

        {/* Suggested Plate Banner Alert */}
        {suggestedPlate && (
          <div className="patente-suggestion-card">
            <div className="suggestion-content">
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justify: 'center' }}>
                <Clock style={{ color: 'var(--accent-green)', width: 22, height: 22 }} />
              </div>
              <div>
                <span className="suggestion-title">Vehículo detectado en la barrera de entrada</span>
                <div>
                  <span className="suggestion-plate">{formatPlate(suggestedPlate)}</span>
                </div>
              </div>
            </div>
            <div className="suggestion-actions">
              <button 
                onClick={handleAcceptPlateSuggestion} 
                className="btn btn-success"
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', width: 'auto', height: '36px', display: 'flex', gap: '0.25rem' }}
              >
                <Check style={{ width: 16, height: 16 }} />
                Registrar Entrada
              </button>
              <button 
                onClick={() => setSuggestedPlate(null)} 
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', width: 'auto', height: '36px' }}
              >
                Ignorar
              </button>
            </div>
          </div>
        )}

        {/* View Tabs */}
        {currentTab === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: settings.general.useMap !== false ? '1fr 340px' : '1fr', gap: '2rem', alignItems: 'start' }}>
            <Dashboard 
              activeVehicles={activeVehicles}
              settings={settings}
              slots={slots}
              onAddVehicle={handleAddVehicle}
              onTriggerCheckout={handleTriggerCheckout}
              selectedSlotId={selectedSlotId}
              onSelectSlot={setSelectedSlotId}
              occupancyPercent={analytics.occupancyPercent}
              externalPlate={dashboardPlate}
              onClearExternalPlate={() => setDashboardPlate('')}
            />
            {/* Right stacked helper widgets (Map preview) */}
            {settings.general.useMap !== false && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <ParkingMap 
                  slots={slots}
                  activeVehicles={activeVehicles}
                  onSaveSlots={handleSaveSlots}
                  onSelectSlot={setSelectedSlotId}
                  selectedSlotId={selectedSlotId}
                  onViewCheckout={handleTriggerCheckout}
                />
              </div>
            )}
          </div>
        )}

        {currentTab === 'camera' && settings.general.useCamera === true && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <PlateCamera 
              onPlateSuggested={setSuggestedPlate}
              activeVehicles={activeVehicles}
              settings={settings}
            />
          </div>
        )}

        {currentTab === 'map' && settings.general.useMap !== false && (
          <ParkingMap 
            slots={slots}
            activeVehicles={activeVehicles}
            onSaveSlots={handleSaveSlots}
            onSelectSlot={setSelectedSlotId}
            selectedSlotId={selectedSlotId}
            onViewCheckout={handleTriggerCheckout}
          />
        )}

        {currentTab === 'settings' && (
          <TariffSettings 
            settings={settings}
            onSaveSettings={handleSaveSettings}
          />
        )}

        {currentTab === 'analytics' && (
          <Analytics 
            analytics={analytics}
            history={history}
            onResetAll={handleResetAll}
          />
        )}

      </main>

      {/* Checkout Modal */}
      {checkoutVehicle && checkoutFeeDetails && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Cobro de Estadía</h2>
              <button onClick={() => setCheckoutVehicle(null)} className="modal-close-btn">
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <div className="modal-body">
              {/* Receipt printing simulation view */}
              <div className="ticket-preview">
                {/* Visual Preview for UI */}
                <Ticket 
                  settings={settings}
                  checkoutVehicle={checkoutVehicle}
                  checkoutVehicleType={checkoutVehicleType}
                  checkoutEntryDate={checkoutEntryDate}
                  checkoutExitDate={checkoutExitDate}
                  checkoutFeeDetails={checkoutFeeDetails}
                  formatElapsedTime={formatElapsedTime}
                  formatPlate={formatPlate}
                />
              </div>

              {/* Hidden Component for Printing */}
              <div style={{ display: 'none' }}>
                <Ticket 
                  ref={ticketRef}
                  settings={settings}
                  checkoutVehicle={checkoutVehicle}
                  checkoutVehicleType={checkoutVehicleType}
                  checkoutEntryDate={checkoutEntryDate}
                  checkoutExitDate={checkoutExitDate}
                  checkoutFeeDetails={checkoutFeeDetails}
                  formatElapsedTime={formatElapsedTime}
                  formatPlate={formatPlate}
                />
              </div>

              {/* Payment selection & comments */}
              <div className="form-group">
                <label className="form-label">Método de Pago</label>
                <select 
                  value={checkoutPaymentMethod} 
                  onChange={(e) => setCheckoutPaymentMethod(e.target.value)}
                  className="form-select"
                >
                  <option value="Efectivo">💵 Efectivo</option>
                  <option value="MercadoPago/QR">📱 MercadoPago / QR</option>
                  <option value="Tarjeta">💳 Tarjeta Débito / Crédito</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Notas de Egreso (Opcional)</label>
                <input 
                  type="text" 
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                  placeholder="Ej: Pago realizado sin inconvenientes..." 
                  className="form-input"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => setCheckoutVehicle(null)} 
                className="btn btn-secondary"
                style={{ width: 'auto' }}
              >
                Cancelar
              </button>
              
              <button 
                onClick={handlePrint} 
                className="btn btn-success"
                style={{ width: 'auto', display: 'flex', gap: '0.5rem' }}
              >
                <Printer style={{ width: 18, height: 18 }} />
                Registrar Pago e Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
