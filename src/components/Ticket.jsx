import React, { forwardRef } from 'react';

const Ticket = forwardRef(({
  settings,
  checkoutVehicle,
  checkoutVehicleType,
  checkoutEntryDate,
  checkoutExitDate,
  checkoutFeeDetails,
  formatElapsedTime,
  formatPlate
}, ref) => {
  if (!checkoutVehicle || !checkoutFeeDetails) return null;

  return (
    <div className="ticket" ref={ref}>
      <div className="ticket-header-print" style={{ textAlign: 'center', marginBottom: '10px' }}>
        <strong style={{ fontSize: '1.2rem', display: 'block', marginBottom: '4px' }}>
          {settings.ticket?.businessName || 'ESTACIONAMIENTO AR'}
        </strong>
        <span style={{ display: 'block' }}>{settings.ticket?.address || 'CABA, ARGENTINA'}</span>
        {settings.ticket?.phone && <span style={{ display: 'block' }}>{settings.ticket.phone}</span>}
      </div>

      <div style={{ borderBottom: '1px dashed #000', margin: '0.5rem 0' }}></div>

      <div className="ticket-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
        <span>Ticket Nro:</span>
        <span>#{checkoutVehicle.id}</span>
      </div>
      <div className="ticket-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
        <span>Patente:</span>
        <strong>{formatPlate(checkoutVehicle.plate)}</strong>
      </div>
      <div className="ticket-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
        <span>Vehiculo:</span>
        <span>{checkoutVehicleType.name.toUpperCase()}</span>
      </div>

      <div style={{ borderBottom: '1px dashed #000', margin: '0.5rem 0' }}></div>

      <div className="ticket-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
        <span>Entrada:</span>
        <span>
          {checkoutEntryDate.toLocaleDateString('es-AR')} {checkoutEntryDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="ticket-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
        <span>Salida:</span>
        <span>
          {checkoutExitDate.toLocaleDateString('es-AR')} {checkoutExitDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div style={{ borderBottom: '1px dashed #000', margin: '0.5rem 0' }}></div>

      <div className="ticket-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
        <span>Tarifa Base / hr:</span>
        <span>${checkoutFeeDetails.baseRate}</span>
      </div>

      {checkoutFeeDetails.commercialMultiplier !== 1.0 && (
        <div className="ticket-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
          <span>Horario comercial ({checkoutFeeDetails.commercialMultiplier}x):</span>
          <span>${Math.round(checkoutFeeDetails.baseRate * checkoutFeeDetails.commercialMultiplier)}/hr</span>
        </div>
      )}

      {checkoutFeeDetails.dynamicMultiplier !== 1.0 && (
        <div className="ticket-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
          <span>Recargo ({checkoutFeeDetails.dynamicMultiplier}x):</span>
          <span>${Math.round(checkoutFeeDetails.baseRate * checkoutFeeDetails.dynamicMultiplier)}/hr</span>
        </div>
      )}

      {checkoutFeeDetails.isFreeGrace ? (
        <div className="ticket-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>
          <span>Tolerancia Aplicada:</span>
          <span>GRATIS</span>
        </div>
      ) : (
        <div className="ticket-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
          <span>Horas Facturables:</span>
          <span>{checkoutFeeDetails.billedHours} hr</span>
        </div>
      )}

      <div className="ticket-total-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', paddingTop: '5px', marginTop: '5px' }}>
        <span>TOTAL A COBRAR:</span>
        <span>${checkoutFeeDetails.totalFee}</span>
      </div>

      <div style={{ borderBottom: '1px dashed #000', margin: '0.5rem 0' }}></div>
      <div style={{ textAlign: 'center', fontSize: '12px', marginTop: '10px' }}>
        Gracias por su visita
      </div>
    </div>
  );
});

export default Ticket;
