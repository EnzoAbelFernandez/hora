import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Transformer } from 'react-konva';
import { getElementStyle, DEFAULT_GRID_SIZE, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from './constants';

// Snap position to grid
function snapToGrid(value, gridSize) {
  return Math.round(value / gridSize) * gridSize;
}

export default function EditorCanvas({
  elements,
  onUpdateElements,
  selectedIds,
  onSelectionChange,
  activeTool,
  onToolChange,
  zoom,
  onZoomChange,
  showGrid,
  snapEnabled,
  gridSize = DEFAULT_GRID_SIZE,
  isEditing,
  activeVehicles = [],
  onViewCheckout,
  onSelectSlot,
  containerWidth,
  containerHeight,
  onElementRotated,
  stagePos,
  onStagePosChange
}) {
  const stageRef = useRef(null);
  const layerRef = useRef(null);
  const transformerRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [selectionRect, setSelectionRect] = useState(null);
  const [spaceHeld, setSpaceHeld] = useState(false);

  // Stage dimensions
  const stageW = containerWidth || 800;
  const stageH = containerHeight || 600;

  // Keyboard listeners for spacebar (pan mode) and shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      
      if (e.code === 'Space' && !spaceHeld) {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedIds.length > 0 && isEditing) {
          const updated = elements.filter(el => !selectedIds.includes(el.id));
          onUpdateElements(updated);
          onSelectionChange([]);
        }
      }
      // Arrow keys for fine movement
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && selectedIds.length > 0 && isEditing) {
        e.preventDefault();
        const step = snapEnabled ? gridSize : 1;
        let dx = 0, dy = 0;
        if (e.code === 'ArrowUp') dy = -step;
        if (e.code === 'ArrowDown') dy = step;
        if (e.code === 'ArrowLeft') dx = -step;
        if (e.code === 'ArrowRight') dx = step;
        const updated = elements.map(el => {
          if (selectedIds.includes(el.id)) {
            return { ...el, x: el.x + dx, y: el.y + dy };
          }
          return el;
        });
        onUpdateElements(updated);
      }
      // Ctrl+Z / Ctrl+Shift+Z are handled by parent
      // Ctrl+D for duplicate
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD' && isEditing) {
        e.preventDefault();
        // handled by parent via onAction
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setSpaceHeld(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spaceHeld, selectedIds, elements, isEditing, snapEnabled, gridSize, onUpdateElements, onSelectionChange]);

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !layerRef.current || !isEditing) return;
    const stage = stageRef.current;
    if (!stage) return;
    
    const nodes = selectedIds
      .map(id => stage.findOne('#' + id))
      .filter(Boolean);
    
    transformerRef.current.nodes(nodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedIds, isEditing, elements]);

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = zoom;
    const pointer = stage.getPointerPosition();
    const mousePointTo = {
      x: (stage.getPointerPosition().x - stagePos.x) / zoom,
      y: (stage.getPointerPosition().y - stagePos.y) / zoom,
    };

    let newZoom = e.evt.deltaY > 0 ? zoom - ZOOM_STEP : zoom + ZOOM_STEP;
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    
    if (onZoomChange) onZoomChange(newZoom);

    const newPos = {
      x: stage.getPointerPosition().x - mousePointTo.x * newZoom,
      y: stage.getPointerPosition().y - mousePointTo.y * newZoom,
    };
    if (onStagePosChange) {
      onStagePosChange(newPos);
    }
  }, [zoom, stagePos, onZoomChange, onStagePosChange]);

  // Stage mouse down — start pan or rubber-band selection
  const handleStageMouseDown = (e) => {
    // If clicking on empty space (not a shape)
    const clickedOnEmpty = e.target === e.target.getStage();
    
    if (spaceHeld || e.evt.button === 1) {
      // Pan mode
      setIsPanning(true);
      return;
    }

    if (clickedOnEmpty && isEditing) {
      if (activeTool === 'select') {
        // Start rubber-band selection
        const pos = e.target.getStage().getPointerPosition();
        const realPos = {
          x: (pos.x - stagePos.x) / zoom,
          y: (pos.y - stagePos.y) / zoom
        };
        setSelectionRect({ x: realPos.x, y: realPos.y, width: 0, height: 0 });
        onSelectionChange([]);
      } else if (activeTool !== 'select') {
        // Place new element
        const pos = e.target.getStage().getPointerPosition();
        let realX = (pos.x - stagePos.x) / zoom;
        let realY = (pos.y - stagePos.y) / zoom;
        if (snapEnabled) {
          realX = snapToGrid(realX, gridSize);
          realY = snapToGrid(realY, gridSize);
        }
        // Signal parent to add element at this position
        if (typeof onUpdateElements === 'function') {
          // We create a synthetic event by calling the parent's add handler
          // The parent ParkingMap will handle the activeTool -> element mapping
          const event = new CustomEvent('addElement', { detail: { x: realX, y: realY, tool: activeTool } });
          window.dispatchEvent(event);
        }
        // Switch back to select tool
        onToolChange('select');
      }
    } else if (clickedOnEmpty && !isEditing) {
      onSelectionChange([]);
    }
  };

  const handleStageMouseMove = (e) => {
    if (isPanning) {
      const stage = stageRef.current;
      if (!stage) return;
      const dx = e.evt.movementX;
      const dy = e.evt.movementY;
      if (onStagePosChange) {
        onStagePosChange(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      }
      return;
    }
    if (selectionRect) {
      const pos = stageRef.current.getPointerPosition();
      const realPos = {
        x: (pos.x - stagePos.x) / zoom,
        y: (pos.y - stagePos.y) / zoom
      };
      setSelectionRect(prev => ({
        ...prev,
        width: realPos.x - prev.x,
        height: realPos.y - prev.y
      }));
    }
  };

  const handleStageMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (selectionRect) {
      // Find elements inside the selection rectangle
      const rect = {
        x: Math.min(selectionRect.x, selectionRect.x + selectionRect.width),
        y: Math.min(selectionRect.y, selectionRect.y + selectionRect.height),
        width: Math.abs(selectionRect.width),
        height: Math.abs(selectionRect.height)
      };
      if (rect.width > 5 && rect.height > 5) {
        const ids = elements
          .filter(el => {
            const cx = el.x + (el.width || 40) / 2;
            const cy = el.y + (el.height || 80) / 2;
            return cx >= rect.x && cx <= rect.x + rect.width && cy >= rect.y && cy <= rect.y + rect.height;
          })
          .map(el => el.id);
        onSelectionChange(ids);
      }
      setSelectionRect(null);
    }
  };

  // Element click handler
  const handleElementClick = (e, element) => {
    e.cancelBubble = true;

    if (!isEditing) {
      // Operation mode: handle slot clicks
      if (element.type === 'slot') {
        if (element.occupiedBy) {
          const vehicle = activeVehicles.find(v => v.plate.toUpperCase() === element.occupiedBy.toUpperCase());
          if (vehicle && onViewCheckout) onViewCheckout(vehicle);
        } else {
          if (onSelectSlot) onSelectSlot(element.name || element.id);
        }
      }
      return;
    }

    if (e.evt.shiftKey) {
      // Add to / remove from selection
      const newIds = selectedIds.includes(element.id)
        ? selectedIds.filter(id => id !== element.id)
        : [...selectedIds, element.id];
      onSelectionChange(newIds);
    } else {
      onSelectionChange([element.id]);
    }
  };

  // Drag end handler
  const handleDragEnd = (e, element) => {
    if (!isEditing) return;
    let newX = e.target.x();
    let newY = e.target.y();
    if (snapEnabled) {
      newX = snapToGrid(newX, gridSize);
      newY = snapToGrid(newY, gridSize);
      e.target.x(newX);
      e.target.y(newY);
    }
    const updated = elements.map(el =>
      el.id === element.id ? { ...el, x: newX, y: newY } : el
    );
    onUpdateElements(updated);
  };

  // Transform end handler (resize/rotate)
  const handleTransformEnd = (e, element) => {
    if (!isEditing) return;
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    
    // Reset scale and apply to width/height
    node.scaleX(1);
    node.scaleY(1);

    let newX = node.x();
    let newY = node.y();
    if (snapEnabled) {
      newX = snapToGrid(newX, gridSize);
      newY = snapToGrid(newY, gridSize);
    }
    
    const newRotation = Math.round(node.rotation());
    if (onElementRotated) {
      onElementRotated(newRotation);
    }

    const updated = elements.map(el => {
      if (el.id === element.id) {
        return {
          ...el,
          x: newX,
          y: newY,
          width: Math.max(5, Math.round(el.width * scaleX)),
          height: Math.max(5, Math.round(el.height * scaleY)),
          rotation: newRotation
        };
      }
      return el;
    });
    onUpdateElements(updated);
  };

  // Draw grid lines
  const renderGrid = () => {
    if (!showGrid) return null;
    const lines = [];
    const step = gridSize;
    // Calculate visible area based on stage position and zoom
    const viewWidth = stageW / zoom + Math.abs(stagePos.x / zoom);
    const viewHeight = stageH / zoom + Math.abs(stagePos.y / zoom);
    const startX = -Math.ceil(Math.abs(stagePos.x / zoom) / step) * step;
    const startY = -Math.ceil(Math.abs(stagePos.y / zoom) / step) * step;

    for (let x = startX; x < viewWidth + step; x += step) {
      lines.push(
        <Line
          key={`gv-${x}`}
          points={[x, startY - step, x, viewHeight + step]}
          stroke="#E5E7EB"
          strokeWidth={0.5 / zoom}
          listening={false}
        />
      );
    }
    for (let y = startY; y < viewHeight + step; y += step) {
      lines.push(
        <Line
          key={`gh-${y}`}
          points={[startX - step, y, viewWidth + step, y]}
          stroke="#E5E7EB"
          strokeWidth={0.5 / zoom}
          listening={false}
        />
      );
    }
    return lines;
  };

  // Render a single element
  const renderElement = (element) => {
    const style = getElementStyle(element);
    const w = element.width || style.width;
    const h = element.height || style.height;

    // Determine fill color based on mode
    let fillColor = style.color;
    let strokeColor = style.borderColor;
    let opacity = 1;
    
    if (!isEditing && element.type === 'slot') {
      if (element.occupiedBy) {
        fillColor = '#FEE2E2';
        strokeColor = '#EF4444';
      } else {
        fillColor = '#ECFDF5';
        strokeColor = '#10B981';
      }
    }

    if (element.type === 'zone') {
      opacity = 0.6;
    }

    const isSelected = selectedIds.includes(element.id);

    return (
      <Group
        key={element.id}
        id={element.id}
        x={element.x}
        y={element.y}
        rotation={element.rotation || 0}
        draggable={isEditing}
        onClick={(e) => handleElementClick(e, element)}
        onTap={(e) => handleElementClick(e, element)}
        onDragEnd={(e) => handleDragEnd(e, element)}
        onTransformEnd={(e) => handleTransformEnd(e, element)}
      >
        <Rect
          width={w}
          height={h}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={isSelected ? 2 : 1}
          cornerRadius={element.type === 'column' ? 3 : element.type === 'zone' ? 0 : 2}
          opacity={opacity}
          dash={element.type === 'zone' ? [6, 3] : undefined}
        />
        
        {/* Element label */}
        {(element.type === 'slot' || element.type === 'entry' || element.type === 'exit' || element.type === 'zone') && (
          <Text
            text={element.name || style.label}
            width={w}
            height={h}
            align="center"
            verticalAlign="middle"
            fontSize={element.type === 'slot' ? 10 : 9}
            fontFamily="Inter, sans-serif"
            fontStyle="bold"
            fill={element.type === 'entry' ? '#059669' : element.type === 'exit' ? '#DC2626' : '#374151'}
            listening={false}
          />
        )}

        {/* Icon for special types */}
        {style.icon && element.type === 'slot' && (
          <Text
            text={style.icon}
            width={w}
            y={h - 18}
            height={16}
            align="center"
            fontSize={10}
            fill="#6B7280"
            listening={false}
          />
        )}

        {/* Arrow for lanes */}
        {element.type === 'lane' && (
          <Text
            text="→ → →"
            width={w}
            height={h}
            align="center"
            verticalAlign="middle"
            fontSize={14}
            fill="#9CA3AF"
            fontFamily="Inter, sans-serif"
            letterSpacing={4}
            listening={false}
          />
        )}

        {/* Occupied plate label (operation mode) */}
        {!isEditing && element.type === 'slot' && element.occupiedBy && (
          <Text
            text={element.occupiedBy}
            width={w}
            y={h * 0.55}
            height={h * 0.4}
            align="center"
            verticalAlign="top"
            fontSize={7}
            fontFamily="Inter, sans-serif"
            fontStyle="bold"
            fill="#DC2626"
            listening={false}
          />
        )}

        {/* Free label (operation mode) */}
        {!isEditing && element.type === 'slot' && !element.occupiedBy && (
          <Text
            text="LIBRE"
            width={w}
            y={h * 0.6}
            height={h * 0.35}
            align="center"
            verticalAlign="top"
            fontSize={7}
            fontFamily="Inter, sans-serif"
            fontStyle="bold"
            fill="#059669"
            listening={false}
          />
        )}
      </Group>
    );
  };

  const cursorStyle = spaceHeld || isPanning ? 'grabbing' : (activeTool !== 'select' && isEditing) ? 'crosshair' : 'default';

  return (
    <div
      style={{
        flex: 1,
        overflow: 'hidden',
        background: '#FAFAFA',
        cursor: cursorStyle,
        position: 'relative'
      }}
    >
      <Stage
        ref={stageRef}
        width={stageW}
        height={stageH}
        scaleX={zoom}
        scaleY={zoom}
        x={stagePos.x}
        y={stagePos.y}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onMouseLeave={() => { setIsPanning(false); setSelectionRect(null); }}
      >
        <Layer ref={layerRef}>
          {/* Grid */}
          {renderGrid()}

          {/* Elements */}
          {elements.map(renderElement)}

          {/* Selection rectangle (rubber band) */}
          {selectionRect && (
            <Rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              fill="rgba(59, 130, 246, 0.08)"
              stroke="#3B82F6"
              strokeWidth={1 / zoom}
              dash={[4 / zoom, 4 / zoom]}
              listening={false}
            />
          )}

          {/* Transformer for selected elements */}
          {isEditing && (
            <Transformer
              ref={transformerRef}
              rotateEnabled={true}
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
              boundBoxFunc={(oldBox, newBox) => {
                // Minimum size
                if (newBox.width < 5 || newBox.height < 5) return oldBox;
                return newBox;
              }}
              anchorSize={8}
              anchorCornerRadius={2}
              borderStroke="#3B82F6"
              anchorStroke="#3B82F6"
              anchorFill="#FFFFFF"
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
