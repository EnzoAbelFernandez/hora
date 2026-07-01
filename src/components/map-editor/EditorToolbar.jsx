import React from 'react';
import {
  MousePointer2,
  Square,
  Bike,
  BookmarkCheck,
  Minus,
  BoxSelect,
  ArrowRightLeft,
  LogIn,
  LogOut,
  SquareDashedBottom,
  Copy,
  Trash2,
  Undo2,
  Redo2,
  Grid3X3,
  Magnet,
  ZoomOut,
  ZoomIn,
  Maximize2,
} from 'lucide-react';

const toolbarStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  padding: '4px 8px',
  background: 'var(--bg-card)',
  borderBottom: '1px solid var(--border-color)',
  minHeight: '40px',
  flexShrink: 0,
};

const btnBase = {
  width: 32,
  height: 32,
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  color: 'var(--text-primary)',
  transition: 'background 0.15s, color 0.15s',
};

const btnActive = {
  background: 'rgba(59, 130, 246, 0.1)',
  color: 'var(--accent-blue)',
};

const btnDisabled = {
  opacity: 0.35,
  cursor: 'default',
};

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 20,
        background: 'var(--border-color)',
        margin: '0 4px',
        flexShrink: 0,
      }}
    />
  );
}

function ToolBtn({ icon: Icon, title, isActive, disabled, onClick, children }) {
  const [hovered, setHovered] = React.useState(false);

  const style = {
    ...btnBase,
    ...(isActive ? btnActive : {}),
    ...(disabled ? btnDisabled : {}),
    ...(hovered && !disabled && !isActive ? { background: 'var(--bg-card-hover)' } : {}),
  };

  return (
    <button
      style={style}
      title={title}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export default function EditorToolbar({
  activeTool,
  onToolChange,
  onAction,
  canUndo,
  canRedo,
  showGrid,
  snapEnabled,
  zoom,
  hasSelection,
}) {
  const zoomPercent = Math.round((zoom || 1) * 100);

  return (
    <div style={toolbarStyle}>
      {/* Selección */}
      <ToolBtn
        icon={MousePointer2}
        title="Seleccionar"
        isActive={activeTool === 'select'}
        onClick={() => onToolChange('select')}
      />

      <Divider />

      {/* Plazas */}
      <ToolBtn
        icon={Square}
        title="Plaza Normal"
        isActive={activeTool === 'slot_normal'}
        onClick={() => onToolChange('slot_normal')}
      />
      <ToolBtn
        title="Plaza Discapacitados"
        isActive={activeTool === 'slot_disabled'}
        onClick={() => onToolChange('slot_disabled')}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>♿</span>
      </ToolBtn>
      <ToolBtn
        icon={Bike}
        title="Plaza Moto"
        isActive={activeTool === 'slot_moto'}
        onClick={() => onToolChange('slot_moto')}
      />
      <ToolBtn
        title="Plaza Bicicleta"
        isActive={activeTool === 'slot_bicycle'}
        onClick={() => onToolChange('slot_bicycle')}
      >
        <Square size={12} />
      </ToolBtn>
      <ToolBtn
        icon={BookmarkCheck}
        title="Plaza Reservada"
        isActive={activeTool === 'slot_reserved'}
        onClick={() => onToolChange('slot_reserved')}
      />

      <Divider />

      {/* Estructura */}
      <ToolBtn
        icon={Minus}
        title="Pared"
        isActive={activeTool === 'wall'}
        onClick={() => onToolChange('wall')}
      />
      <ToolBtn
        icon={BoxSelect}
        title="Columna"
        isActive={activeTool === 'column'}
        onClick={() => onToolChange('column')}
      />
      <ToolBtn
        icon={ArrowRightLeft}
        title="Carril"
        isActive={activeTool === 'lane'}
        onClick={() => onToolChange('lane')}
      />
      <ToolBtn
        icon={LogIn}
        title="Entrada"
        isActive={activeTool === 'entry'}
        onClick={() => onToolChange('entry')}
      />
      <ToolBtn
        icon={LogOut}
        title="Salida"
        isActive={activeTool === 'exit'}
        onClick={() => onToolChange('exit')}
      />
      <ToolBtn
        icon={SquareDashedBottom}
        title="Zona"
        isActive={activeTool === 'zone'}
        onClick={() => onToolChange('zone')}
      />

      <Divider />

      {/* Acciones */}
      <ToolBtn
        icon={Copy}
        title="Duplicar"
        disabled={!hasSelection}
        onClick={() => onAction('duplicate')}
      />
      <ToolBtn
        icon={Trash2}
        title="Eliminar"
        disabled={!hasSelection}
        onClick={() => onAction('delete')}
      />

      <Divider />

      {/* Historial */}
      <ToolBtn
        icon={Undo2}
        title="Deshacer"
        disabled={!canUndo}
        onClick={() => onAction('undo')}
      />
      <ToolBtn
        icon={Redo2}
        title="Rehacer"
        disabled={!canRedo}
        onClick={() => onAction('redo')}
      />

      <Divider />

      {/* Vista */}
      <ToolBtn
        icon={Grid3X3}
        title="Mostrar Grilla"
        isActive={showGrid}
        onClick={() => onAction('toggleGrid')}
      />
      <ToolBtn
        icon={Magnet}
        title="Ajuste a Grilla"
        isActive={snapEnabled}
        onClick={() => onAction('toggleSnap')}
      />
      <ToolBtn
        icon={ZoomOut}
        title="Alejar"
        onClick={() => onAction('zoomOut')}
      />
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          minWidth: 40,
          textAlign: 'center',
          userSelect: 'none',
        }}
      >
        {zoomPercent}%
      </span>
      <ToolBtn
        icon={ZoomIn}
        title="Acercar"
        onClick={() => onAction('zoomIn')}
      />
      <ToolBtn
        icon={Maximize2}
        title="Restablecer Zoom"
        onClick={() => onAction('resetZoom')}
      />
    </div>
  );
}
