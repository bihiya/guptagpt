import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { fetchCaptures } from '../services/api';
import type { CaptureItem } from '../types';

interface CapturesState {
  items: CaptureItem[];
  loading: boolean;
  error: string;
  query: string;
}

const initialState: CapturesState = {
  items: [],
  loading: false,
  error: '',
  query: '',
};

type CapturesAction =
  | { type: 'load/start' }
  | { type: 'load/success'; payload: CaptureItem[] }
  | { type: 'load/error'; payload: string }
  | { type: 'query/set'; payload: string };

function capturesReducer(state: CapturesState, action: CapturesAction): CapturesState {
  switch (action.type) {
    case 'load/start':
      return { ...state, loading: true, error: '' };
    case 'load/success':
      return { ...state, loading: false, items: action.payload };
    case 'load/error':
      return { ...state, loading: false, error: action.payload };
    case 'query/set':
      return { ...state, query: action.payload };
    default:
      return state;
  }
}

interface StoreContextValue {
  state: CapturesState;
  dispatch: Dispatch<CapturesAction>;
  loadCaptures: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(capturesReducer, initialState);

  const loadCaptures = async () => {
    dispatch({ type: 'load/start' });
    try {
      const items = await fetchCaptures();
      dispatch({ type: 'load/success', payload: items });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load captures';
      dispatch({ type: 'load/error', payload: message });
    }
  };

  const value = useMemo(() => ({ state, dispatch, loadCaptures }), [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }

  return context;
}

export function selectFilteredCaptures(state: CapturesState) {
  const query = state.query.trim().toLowerCase();
  if (!query) return state.items;

  return state.items.filter(
    (item) => item.title.toLowerCase().includes(query) || item.url.toLowerCase().includes(query),
  );
}
