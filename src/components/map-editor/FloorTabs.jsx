import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  MoreVertical,
  Pencil,
  Copy,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';

const barStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0px',
  padding: '0 4px',
  background: 'var(--bg-card)',
  borderTop: '1px solid var(--border-color)',
  minHeight: '36px',
  flexShrink: 0,
};

const addBtnStyle = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  color: 'var(--accent-blue)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  flexShrink: 0,
  transition: 'background 0.15s',
};

const dropdownStyle = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 4,
  background: '#FFFFFF',
  border: '1px solid var(--border-color)',
  borderRadius: 8,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  zIndex: 100,
  minWidth: 160,
  padding: '4px 0',
};

const dropdownItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  border: 'none',
  background: 'transparent',
  width: '100%',
  cursor: 'pointer',
  fontSize: '0.8rem',
  color: 'var(--text-primary)',
  transition: 'background 0.15s',
};

function DropdownItem({ icon: Icon, label, onClick, danger, onMouseEnter, onMouseLeave, hovered }) {
  return (
    <button
      style={{
        ...dropdownItemStyle,
        color: danger ? 'var(--accent-red)' : 'var(--text-primary)',
        background: hovered ? 'var(--bg-card-hover)' : 'transparent',
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function FloorTab({
  floor,
  isActive,
  onSelect,
  onRename,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDelete,
  canDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(floor.name);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [addHover, setAddHover] = useState(false);
  const inputRef = useRef(null);
  const tabRef = useRef(null);

  useEffect(() => {
    setName(floor.name);
  }, [floor.name]);

  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (tabRef.current && !tabRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [menuOpen]);

  const commitRename = useCallback(() => {
    setRenaming(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== floor.name) {
      onRename(floor.id, trimmed);
    } else {
      setName(floor.name);
    }
  }, [name, floor, onRename]);

  const tabStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 12px',
    background: isActive ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
    borderBottom: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: isActive ? 600 : 500,
    color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    transition: 'background 0.15s',
  };

  const chevronBtnStyle = {
    width: 20,
    height: 20,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    color: 'inherit',
    borderRadius: 4,
    opacity: 0.7,
  };

  return (
    <div ref={tabRef} style={tabStyle} onClick={() => !renaming && onSelect(floor.id)}>
      {renaming ? (
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') {
              setName(floor.name);
              setRenaming(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            border: '1px solid var(--border-focus)',
            borderRadius: 4,
            padding: '2px 6px',
            outline: 'none',
            width: 80,
            color: 'var(--text-primary)',
          }}
        />
      ) : (
        <span>{floor.name}</span>
      )}

      <button
        style={chevronBtnStyle}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        title="Opciones de la planta"
      >
        <MoreVertical size={14} />
      </button>

      {menuOpen && (
        <div style={dropdownStyle} onClick={(e) => e.stopPropagation()}>
          <DropdownItem
            icon={Pencil}
            label="Renombrar"
            hovered={hoveredItem === 'rename'}
            onMouseEnter={() => setHoveredItem('rename')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => {
              setMenuOpen(false);
              setRenaming(true);
            }}
          />
          <DropdownItem
            icon={Copy}
            label="Duplicar"
            hovered={hoveredItem === 'dup'}
            onMouseEnter={() => setHoveredItem('dup')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => {
              setMenuOpen(false);
              onDuplicate(floor.id);
            }}
          />
          <DropdownItem
            icon={ArrowUp}
            label="Mover Arriba"
            hovered={hoveredItem === 'up'}
            onMouseEnter={() => setHoveredItem('up')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => {
              setMenuOpen(false);
              onMoveUp(floor.id);
            }}
          />
          <DropdownItem
            icon={ArrowDown}
            label="Mover Abajo"
            hovered={hoveredItem === 'down'}
            onMouseEnter={() => setHoveredItem('down')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => {
              setMenuOpen(false);
              onMoveDown(floor.id);
            }}
          />
          {canDelete && (
            <>
              <div
                style={{
                  height: 1,
                  background: 'var(--border-color)',
                  margin: '4px 0',
                }}
              />
              <DropdownItem
                icon={Trash2}
                label="Eliminar"
                danger
                hovered={hoveredItem === 'del'}
                onMouseEnter={() => setHoveredItem('del')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(floor.id);
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function FloorTabs({
  floors,
  activeFloorId,
  onSelectFloor,
  onAddFloor,
  onRenameFloor,
  onDuplicateFloor,
  onDeleteFloor,
  onReorderFloor,
}) {
  const [addHover, setAddHover] = useState(false);
  const sorted = [...(floors || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div style={barStyle}>
      <button
        style={{
          ...addBtnStyle,
          background: addHover ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        }}
        title="Agregar Piso"
        onClick={onAddFloor}
        onMouseEnter={() => setAddHover(true)}
        onMouseLeave={() => setAddHover(false)}
      >
        <Plus size={16} />
      </button>

      {sorted.map((floor) => (
        <FloorTab
          key={floor.id}
          floor={floor}
          isActive={floor.id === activeFloorId}
          onSelect={onSelectFloor}
          onRename={onRenameFloor}
          onDuplicate={onDuplicateFloor}
          onMoveUp={(id) => onReorderFloor(id, 'up')}
          onMoveDown={(id) => onReorderFloor(id, 'down')}
          onDelete={onDeleteFloor}
          canDelete={sorted.length > 1}
        />
      ))}
    </div>
  );
}
