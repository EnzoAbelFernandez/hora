import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { SLOT_SUBTYPES, getElementStyle } from './constants';

const panelStyle = {
  width: 260,
  background: 'var(--bg-card)',
  borderLeft: '1px solid var(--border-color)',
  height: '100%',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 14px',
  borderBottom: '1px solid var(--border-color)',
  flexShrink: 0,
};

const closeBtnStyle = {
  width: 28,
  height: 28,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
  color: 'var(--text-secondary)',
  padding: 0,
};

const labelStyle = {
  fontSize: '0.7rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 4,
  display: 'block',
};

const inputStyle = {
  fontSize: '0.8rem',
  padding: '6px 8px',
  width: '100%',
  boxSizing: 'border-box',
};

const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
};

const fieldGroupStyle = {
  marginBottom: 12,
};

const deleteBtnStyle = {
  width: '100%',
  padding: '8px 12px',
  background: '#FEF2F2',
  border: '1px solid #FECACA',
  borderRadius: 6,
  color: 'var(--accent-red)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontSize: '0.8rem',
  fontWeight: 500,
  transition: 'background 0.15s',
};

function FieldLabel({ children }) {
  return <label style={labelStyle}>{children}</label>;
}

function TextInput({ value, onChange }) {
  return (
    <input
      className="form-input"
      type="text"
      style={inputStyle}
      value={value || ''}
      onChange={onChange}
    />
  );
}

function NumberInput({ value, onChange, step = 1 }) {
  return (
    <input
      className="form-input"
      type="number"
      step={step}
      style={inputStyle}
      value={value ?? ''}
      onChange={onChange}
    />
  );
}

function ElementBadge({ element }) {
  const es = getElementStyle(element);
  if (!es) return null;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 6,
        fontSize: '0.75rem',
        fontWeight: 600,
        background: es.color ? `${es.color}18` : 'var(--bg-card-hover)',
        color: es.color || 'var(--text-primary)',
        marginBottom: 14,
      }}
    >
      {es.icon && <span style={{ fontSize: 14 }}>{es.icon}</span>}
      {es.label || element.type}
    </div>
  );
}

function SingleElementEditor({ element, onUpdateElement }) {
  const isSlot = element.type === 'slot';

  const update = (field, value) => {
    onUpdateElement(element.id, { [field]: value });
  };

  return (
    <>
      <ElementBadge element={element} />

      {/* Nombre */}
      <div style={fieldGroupStyle}>
        <FieldLabel>Nombre</FieldLabel>
        <TextInput
          value={element.name}
          onChange={(e) => update('name', e.target.value)}
        />
      </div>

      {/* Tipo (only for slots) */}
      {isSlot && (
        <div style={fieldGroupStyle}>
          <FieldLabel>Tipo</FieldLabel>
          <select
            className="form-input"
            style={inputStyle}
            value={element.subtype || ''}
            onChange={(e) => update('subtype', e.target.value)}
          >
            {SLOT_SUBTYPES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* X, Y */}
      <div style={fieldGroupStyle}>
        <div style={rowStyle}>
          <div>
            <FieldLabel>X</FieldLabel>
            <NumberInput
              value={element.x}
              onChange={(e) => update('x', Number(e.target.value))}
            />
          </div>
          <div>
            <FieldLabel>Y</FieldLabel>
            <NumberInput
              value={element.y}
              onChange={(e) => update('y', Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Ancho, Alto */}
      <div style={fieldGroupStyle}>
        <div style={rowStyle}>
          <div>
            <FieldLabel>Ancho</FieldLabel>
            <NumberInput
              value={element.width}
              onChange={(e) => update('width', Number(e.target.value))}
            />
          </div>
          <div>
            <FieldLabel>Alto</FieldLabel>
            <NumberInput
              value={element.height}
              onChange={(e) => update('height', Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Rotación */}
      <div style={fieldGroupStyle}>
        <FieldLabel>Rotación</FieldLabel>
        <div style={{ position: 'relative' }}>
          <NumberInput
            value={element.rotation}
            onChange={(e) => update('rotation', Number(e.target.value))}
          />
          <span
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          >
            °
          </span>
        </div>
      </div>
    </>
  );
}

export default function PropertiesPanel({
  selectedElements,
  onUpdateElement,
  onDeleteElement,
  isOpen,
  onClose,
}) {
  if (!isOpen) return null;

  const elements = selectedElements || [];
  const hasSelection = elements.length > 0;
  const isSingle = elements.length === 1;
  const isMulti = elements.length > 1;

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Propiedades
        </span>
        <button style={closeBtnStyle} onClick={onClose} title="Cerrar">
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: 14, flex: 1 }}>
        {!hasSelection && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: 120,
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              textAlign: 'center',
            }}
          >
            Selecciona un elemento
          </div>
        )}

        {isSingle && (
          <SingleElementEditor
            element={elements[0]}
            onUpdateElement={onUpdateElement}
          />
        )}

        {isMulti && (
          <div
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              marginBottom: 16,
            }}
          >
            {elements.length} elementos seleccionados
          </div>
        )}
      </div>

      {/* Delete button */}
      {hasSelection && (
        <div style={{ padding: '0 14px 14px' }}>
          <button
            style={deleteBtnStyle}
            onClick={() => {
              elements.forEach((el) => onDeleteElement(el.id));
            }}
          >
            <Trash2 size={14} />
            Eliminar{isMulti ? ` (${elements.length})` : ''}
          </button>
        </div>
      )}
    </div>
  );
}
