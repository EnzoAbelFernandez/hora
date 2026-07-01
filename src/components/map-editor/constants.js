// Element type definitions for the parking map editor
export const ELEMENT_TYPES = {
  SLOT_NORMAL: { type: 'slot', subtype: 'normal', label: 'Normal', color: '#FFFFFF', borderColor: '#D1D5DB', width: 45, height: 90, icon: null },
  SLOT_DISABLED: { type: 'slot', subtype: 'disabled', label: 'Discapacitados', color: '#DBEAFE', borderColor: '#93C5FD', width: 50, height: 90, icon: '♿' },
  SLOT_MOTO: { type: 'slot', subtype: 'moto', label: 'Moto', color: '#FEF3C7', borderColor: '#FCD34D', width: 30, height: 60, icon: null },
  SLOT_BICYCLE: { type: 'slot', subtype: 'bicycle', label: 'Bicicleta', color: '#D1FAE5', borderColor: '#6EE7B7', width: 20, height: 50, icon: null },
  SLOT_RESERVED: { type: 'slot', subtype: 'reserved', label: 'Reservada', color: '#FEF9C3', borderColor: '#FDE047', width: 45, height: 90, icon: 'R' },
  WALL: { type: 'wall', subtype: null, label: 'Pared', color: '#6B7280', borderColor: '#4B5563', width: 200, height: 10, icon: null },
  COLUMN: { type: 'column', subtype: null, label: 'Columna', color: '#9CA3AF', borderColor: '#6B7280', width: 20, height: 20, icon: null },
  LANE: { type: 'lane', subtype: null, label: 'Calle/Pasillo', color: '#F3F4F6', borderColor: '#D1D5DB', width: 300, height: 60, icon: null },
  ENTRY: { type: 'entry', subtype: null, label: 'Entrada', color: '#D1FAE5', borderColor: '#10B981', width: 70, height: 12, icon: '→' },
  EXIT: { type: 'exit', subtype: null, label: 'Salida', color: '#FEE2E2', borderColor: '#EF4444', width: 70, height: 12, icon: '←' },
  ZONE: { type: 'zone', subtype: null, label: 'Sector/Zona', color: 'rgba(59, 130, 246, 0.05)', borderColor: '#93C5FD', width: 200, height: 200, icon: null }
};

export const SLOT_SUBTYPES = [
  { value: 'normal', label: 'Normal' },
  { value: 'disabled', label: 'Discapacitados' },
  { value: 'moto', label: 'Moto' },
  { value: 'bicycle', label: 'Bicicleta' },
  { value: 'reserved', label: 'Reservada' }
];

export function getElementStyle(element) {
  const match = Object.values(ELEMENT_TYPES).find(
    t => t.type === element.type && t.subtype === (element.subtype || null)
  );
  return match || ELEMENT_TYPES.SLOT_NORMAL;
}

export function createDefaultFloor(id, name, order) {
  return { id, name, order, elements: [] };
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export const DEFAULT_GRID_SIZE = 10;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.1;
