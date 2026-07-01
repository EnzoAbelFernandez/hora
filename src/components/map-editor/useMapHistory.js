import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 50;

export default function useMapHistory(initialState) {
  const [state, setState] = useState(initialState);
  const historyRef = useRef([JSON.parse(JSON.stringify(initialState))]);
  const pointerRef = useRef(0);

  const set = useCallback((newState) => {
    const clone = JSON.parse(JSON.stringify(newState));
    historyRef.current = historyRef.current.slice(0, pointerRef.current + 1);
    historyRef.current.push(clone);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      pointerRef.current += 1;
    }
    setState(newState);
  }, []);

  const undo = useCallback(() => {
    if (pointerRef.current <= 0) return;
    pointerRef.current -= 1;
    const prev = JSON.parse(JSON.stringify(historyRef.current[pointerRef.current]));
    setState(prev);
    return prev;
  }, []);

  const redo = useCallback(() => {
    if (pointerRef.current >= historyRef.current.length - 1) return;
    pointerRef.current += 1;
    const next = JSON.parse(JSON.stringify(historyRef.current[pointerRef.current]));
    setState(next);
    return next;
  }, []);

  const canUndo = pointerRef.current > 0;
  const canRedo = pointerRef.current < historyRef.current.length - 1;

  const reset = useCallback((newState) => {
    const clone = JSON.parse(JSON.stringify(newState));
    historyRef.current = [clone];
    pointerRef.current = 0;
    setState(newState);
  }, []);

  return { state, set, undo, redo, canUndo, canRedo, reset };
}
