import React, { useState, useEffect, useCallback, useRef } from 'react';
import { dbService } from '../services/dbService';
import { ELEMENT_TYPES, generateId, createDefaultFloor, DEFAULT_GRID_SIZE, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from './map-editor/constants';
import useMapHistory from './map-editor/useMapHistory';
import EditorCanvas from './map-editor/EditorCanvas';
import EditorToolbar from './map-editor/EditorToolbar';
import FloorTabs from './map-editor/FloorTabs';
import PropertiesPanel from './map-editor/PropertiesPanel';

// Map activeTool string to ELEMENT_TYPES key
const TOOL_TO_ELEMENT = {
  slot_normal: 'SLOT_NORMAL',
  slot_disabled: 'SLOT_DISABLED',
  slot_moto: 'SLOT_MOTO',
  slot_bicycle: 'SLOT_BICYCLE',
  slot_reserved: 'SLOT_RESERVED',
  wall: 'WALL',
  column: 'COLUMN',
  lane: 'LANE',
  entry: 'ENTRY',
  exit: 'EXIT',
  zone: 'ZONE'
};

export default function ParkingMap({ 
  slots, 
  activeVehicles, 
  onSaveSlots, 
  onSelectSlot, 
  selectedSlotId, 
  onViewCheckout,
  isFullEditor = true  // false when embedded in dashboard as small preview
}) {
  // Load the full map layout from storage
  const [mapLayout, setMapLayout] = useState(() => dbService.getMapLayout());
  const [activeFloorId, setActiveFloorId] = useState(mapLayout.activeFloorId || 'pb');
  const [isEditing, setIsEditing] = useState(isFullEditor);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Camera state
  const [zoom, setZoom] = useState(mapLayout.camera?.zoom || 1);
  const [stagePos, setStagePos] = useState({ 
    x: mapLayout.camera?.x || 0, 
    y: mapLayout.camera?.y || 0 
  });

  const [activeTool, setActiveTool] = useState('select');
  const [showGrid, setShowGrid] = useState(mapLayout.showGrid ?? true);
  const [snapEnabled, setSnapEnabled] = useState(mapLayout.snapEnabled ?? true);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(true);

  // Track last used rotation to speed up building
  const lastRotationRef = useRef(0);

  // Container measurement
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 550 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isFullEditor]);

  // Save camera position on change (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      dbService.saveMapCamera({ x: stagePos.x, y: stagePos.y, zoom });
    }, 500);
    return () => clearTimeout(timeout);
  }, [stagePos.x, stagePos.y, zoom]);

  // Get the currently active floor
  const floors = mapLayout.floors || [];
  const activeFloor = floors.find(f => f.id === activeFloorId) || floors[0];
  const activeElements = activeFloor?.elements || [];

  // Merge occupancy data from activeVehicles into elements for the operation view
  const elementsWithOccupancy = activeElements.map(el => {
    if (el.type !== 'slot') return el;
    // Match slot to active vehicle by checking the flat slots array
    const flatSlot = slots?.find(s => s.id === (el.name || el.id));
    return {
      ...el,
      occupiedBy: flatSlot?.occupiedBy || null,
      vehicleType: flatSlot?.vehicleType || null
    };
  });

  // History for undo/redo on the active floor's elements
  const history = useMapHistory(activeElements);

  // Reset history when switching floors
  useEffect(() => {
    const floor = mapLayout.floors.find(f => f.id === activeFloorId);
    if (floor) {
      history.reset(floor.elements || []);
    }
  }, [activeFloorId]);

  // Save layout to storage
  const saveLayout = useCallback((updatedLayout) => {
    setMapLayout(updatedLayout);
    dbService.saveMapLayout(updatedLayout);
  }, []);

  // Update elements on active floor and push to history
  const updateElements = useCallback((newElements) => {
    history.set(newElements);
    const updatedFloors = mapLayout.floors.map(f => 
      f.id === activeFloorId ? { ...f, elements: newElements } : f
    );
    const updatedLayout = { ...mapLayout, floors: updatedFloors };
    saveLayout(updatedLayout);
  }, [mapLayout, activeFloorId, history, saveLayout]);

  // Listen for addElement events from canvas
  useEffect(() => {
    const handler = (e) => {
      const { x, y, tool } = e.detail;
      const typeKey = TOOL_TO_ELEMENT[tool];
      if (!typeKey) return;
      const typeDef = ELEMENT_TYPES[typeKey];
      if (!typeDef) return;

      // Auto-generate slot names
      let name = '';
      if (typeDef.type === 'slot') {
        const existingSlots = activeElements.filter(el => el.type === 'slot');
        const num = existingSlots.length + 1;
        name = `P${num}`;
      } else if (typeDef.type === 'entry') {
        name = 'Entrada';
      } else if (typeDef.type === 'exit') {
        name = 'Salida';
      }

      const newElement = {
        id: generateId(),
        type: typeDef.type,
        subtype: typeDef.subtype,
        x, y,
        width: typeDef.width,
        height: typeDef.height,
        rotation: lastRotationRef.current,
        name
      };
      const newElements = [...activeElements, newElement];
      updateElements(newElements);
      setSelectedIds([newElement.id]);
    };

    window.addEventListener('addElement', handler);
    return () => window.removeEventListener('addElement', handler);
  }, [activeElements, updateElements]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+D)
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (!isEditing) return;
      
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        const prev = history.undo();
        if (prev) {
          const updatedFloors = mapLayout.floors.map(f => 
            f.id === activeFloorId ? { ...f, elements: prev } : f
          );
          const updatedLayout = { ...mapLayout, floors: updatedFloors };
          saveLayout(updatedLayout);
          setSelectedIds([]);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        const next = history.redo();
        if (next) {
          const updatedFloors = mapLayout.floors.map(f => 
            f.id === activeFloorId ? { ...f, elements: next } : f
          );
          const updatedLayout = { ...mapLayout, floors: updatedFloors };
          saveLayout(updatedLayout);
          setSelectedIds([]);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') {
        e.preventDefault();
        handleAction('duplicate');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isEditing, history, mapLayout, activeFloorId, saveLayout, selectedIds, activeElements]);

  // Toolbar actions
  const handleAction = useCallback((action) => {
    switch (action) {
      case 'duplicate': {
        if (selectedIds.length === 0) return;
        const toDuplicate = activeElements.filter(el => selectedIds.includes(el.id));
        const newElements = toDuplicate.map(el => ({
          ...el,
          id: generateId(),
          x: el.x + 20,
          y: el.y + 20,
          name: el.type === 'slot' ? `${el.name || 'P'}_copia` : (el.name ? `${el.name}_copia` : '')
        }));
        const updated = [...activeElements, ...newElements];
        updateElements(updated);
        setSelectedIds(newElements.map(el => el.id));
        break;
      }
      case 'delete': {
        if (selectedIds.length === 0) return;
        const updated = activeElements.filter(el => !selectedIds.includes(el.id));
        updateElements(updated);
        setSelectedIds([]);
        break;
      }
      case 'undo': {
        const prev = history.undo();
        if (prev) {
          const updatedFloors = mapLayout.floors.map(f => 
            f.id === activeFloorId ? { ...f, elements: prev } : f
          );
          saveLayout({ ...mapLayout, floors: updatedFloors });
          setSelectedIds([]);
        }
        break;
      }
      case 'redo': {
        const next = history.redo();
        if (next) {
          const updatedFloors = mapLayout.floors.map(f => 
            f.id === activeFloorId ? { ...f, elements: next } : f
          );
          saveLayout({ ...mapLayout, floors: updatedFloors });
          setSelectedIds([]);
        }
        break;
      }
      case 'toggleGrid':
        setShowGrid(!showGrid);
        saveLayout({ ...mapLayout, showGrid: !showGrid });
        break;
      case 'toggleSnap':
        setSnapEnabled(!snapEnabled);
        saveLayout({ ...mapLayout, snapEnabled: !snapEnabled });
        break;
      case 'zoomIn':
        setZoom(Math.min(MAX_ZOOM, zoom + ZOOM_STEP));
        break;
      case 'zoomOut':
        setZoom(Math.max(MIN_ZOOM, zoom - ZOOM_STEP));
        break;
      case 'resetZoom':
        setZoom(1);
        break;
      default:
        break;
    }
  }, [selectedIds, activeElements, updateElements, history, mapLayout, activeFloorId, saveLayout, showGrid, snapEnabled, zoom]);

  // Floor management
  const handleAddFloor = useCallback(() => {
    const newOrder = Math.max(...floors.map(f => f.order), -1) + 1;
    const newId = generateId();
    const newFloor = createDefaultFloor(newId, `Piso ${newOrder}`, newOrder);
    const updatedLayout = {
      ...mapLayout,
      floors: [...mapLayout.floors, newFloor],
      activeFloorId: newId
    };
    saveLayout(updatedLayout);
    setActiveFloorId(newId);
  }, [floors, mapLayout, saveLayout]);

  const handleRenameFloor = useCallback((floorId, newName) => {
    const updatedFloors = mapLayout.floors.map(f => 
      f.id === floorId ? { ...f, name: newName } : f
    );
    saveLayout({ ...mapLayout, floors: updatedFloors });
  }, [mapLayout, saveLayout]);

  const handleDuplicateFloor = useCallback((floorId) => {
    const source = mapLayout.floors.find(f => f.id === floorId);
    if (!source) return;
    const newId = generateId();
    const newFloor = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      name: `${source.name} (copia)`,
      order: Math.max(...floors.map(f => f.order)) + 1,
      elements: source.elements.map(el => ({ ...el, id: generateId() }))
    };
    const updatedLayout = {
      ...mapLayout,
      floors: [...mapLayout.floors, newFloor]
    };
    saveLayout(updatedLayout);
    setActiveFloorId(newId);
  }, [mapLayout, floors, saveLayout]);

  const handleDeleteFloor = useCallback((floorId) => {
    if (mapLayout.floors.length <= 1) return;
    const updatedFloors = mapLayout.floors.filter(f => f.id !== floorId);
    const newActiveId = activeFloorId === floorId ? updatedFloors[0].id : activeFloorId;
    saveLayout({ ...mapLayout, floors: updatedFloors, activeFloorId: newActiveId });
    setActiveFloorId(newActiveId);
  }, [mapLayout, activeFloorId, saveLayout]);

  const handleReorderFloor = useCallback((floorId, direction) => {
    const sorted = [...mapLayout.floors].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(f => f.id === floorId);
    if (direction === 'up' && idx > 0) {
      [sorted[idx].order, sorted[idx - 1].order] = [sorted[idx - 1].order, sorted[idx].order];
    } else if (direction === 'down' && idx < sorted.length - 1) {
      [sorted[idx].order, sorted[idx + 1].order] = [sorted[idx + 1].order, sorted[idx].order];
    }
    saveLayout({ ...mapLayout, floors: sorted });
  }, [mapLayout, saveLayout]);

  // Update element from properties panel
  const handleUpdateElement = useCallback((elementId, updates) => {
    if (updates.rotation !== undefined) {
      lastRotationRef.current = updates.rotation;
    }
    const updated = activeElements.map(el =>
      el.id === elementId ? { ...el, ...updates } : el
    );
    updateElements(updated);
  }, [activeElements, updateElements]);

  const handleDeleteElement = useCallback((elementId) => {
    const updated = activeElements.filter(el => el.id !== elementId);
    updateElements(updated);
    setSelectedIds(prev => prev.filter(id => id !== elementId));
  }, [activeElements, updateElements]);

  const selectedElements = activeElements.filter(el => selectedIds.includes(el.id));

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: isFullEditor ? 'calc(100vh - 180px)' : '400px',
      background: 'var(--bg-card)',
      borderRadius: '12px',
      border: '1px solid var(--border-color)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Mode toggle header */}
      {isFullEditor && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => { setIsEditing(true); setSelectedIds([]); }}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                background: isEditing ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                color: isEditing ? 'var(--accent-blue)' : 'var(--text-secondary)'
              }}
            >
              Diseñar
            </button>
            <button
              onClick={() => { setIsEditing(false); setSelectedIds([]); setActiveTool('select'); }}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                background: !isEditing ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                color: !isEditing ? 'var(--accent-green)' : 'var(--text-secondary)'
              }}
            >
              Operación
            </button>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {activeFloor?.name || 'Planta Baja'} · {activeElements.filter(e => e.type === 'slot').length} plazas
          </span>
        </div>
      )}

      {/* Floor selector for operation mode / Dashboard */}
      {!isFullEditor && floors.length > 1 && (
        <div style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-card)'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Planta:</span>
          <select 
            className="form-select" 
            style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto', minWidth: '140px', height: '32px' }}
            value={activeFloorId}
            onChange={(e) => { setActiveFloorId(e.target.value); setSelectedIds([]); }}
          >
            {[...floors].sort((a,b) => a.order - b.order).map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Toolbar (only in edit mode) */}
      {isEditing && isFullEditor && (
        <EditorToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onAction={handleAction}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          showGrid={showGrid}
          snapEnabled={snapEnabled}
          zoom={zoom}
          hasSelection={selectedIds.length > 0}
        />
      )}

      {/* Canvas + Properties Panel */}
      <div ref={containerRef} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {window.innerWidth < 1024 ? (
          <div style={{
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'var(--bg-card-hover)', 
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.25, marginBottom: '1rem' }}>
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
              <circle cx="8.5" cy="10" r="2.5" fill="currentColor" stroke="none" opacity="0.4"/>
              <path d="M6 14V8h3.5a2.5 2.5 0 0 1 0 5H6"/>
            </svg>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Vista no disponible
            </h3>
            <p style={{ maxWidth: 400 }}>
              El mapa interactivo de plazas está optimizado para pantallas de computadora (PC). Por favor, utiliza un dispositivo con pantalla más grande para operar o editar el mapa.
            </p>
          </div>
        ) : (
          <EditorCanvas
            elements={isEditing ? activeElements : elementsWithOccupancy}
            onUpdateElements={updateElements}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            activeTool={activeTool}
            onToolChange={setActiveTool}
            zoom={zoom}
            onZoomChange={setZoom}
            stagePos={stagePos}
            onStagePosChange={setStagePos}
            showGrid={showGrid}
            snapEnabled={snapEnabled}
            gridSize={mapLayout.gridSize || DEFAULT_GRID_SIZE}
            isEditing={isEditing}
            activeVehicles={activeVehicles}
            onViewCheckout={onViewCheckout}
            onSelectSlot={onSelectSlot}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            onElementRotated={(r) => lastRotationRef.current = r}
          />
        )}

        {/* Properties Panel (edit mode only) */}
        {isEditing && isFullEditor && (
          <PropertiesPanel
            selectedElements={selectedElements}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            isOpen={propertiesPanelOpen}
            onClose={() => setPropertiesPanelOpen(!propertiesPanelOpen)}
          />
        )}
      </div>

      {/* Floor tabs (only in full editor mode) */}
      {isFullEditor && (
        <FloorTabs
          floors={floors}
          activeFloorId={activeFloorId}
          onSelectFloor={(id) => { setActiveFloorId(id); setSelectedIds([]); }}
          onAddFloor={handleAddFloor}
          onRenameFloor={handleRenameFloor}
          onDuplicateFloor={handleDuplicateFloor}
          onDeleteFloor={handleDeleteFloor}
          onReorderFloor={handleReorderFloor}
        />
      )}

      {/* Legend (operation mode) */}
      {!isEditing && (
        <div style={{ 
          padding: '8px 16px', 
          borderTop: '1px solid var(--border-color)', 
          display: 'flex', 
          gap: '16px',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#ECFDF5', border: '1px solid #10B981' }} />
            Libre (click para asignar)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#FEE2E2', border: '1px solid #EF4444' }} />
            Ocupado (click para facturar)
          </div>
        </div>
      )}
    </div>
  );
}
