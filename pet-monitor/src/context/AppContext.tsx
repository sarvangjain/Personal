import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import {
  AppState,
  AppMode,
  AppSettings,
  ViewerInfo,
  MotionEvent,
  ConnectionStatus,
  DEFAULT_SETTINGS,
} from '../types';

type AppAction =
  | { type: 'SET_MODE'; payload: AppMode }
  | { type: 'SET_ROOM_CODE'; payload: string | null }
  | { type: 'SET_STREAMING'; payload: boolean }
  | { type: 'SET_MUTED'; payload: boolean }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'ADD_VIEWER'; payload: ViewerInfo }
  | { type: 'REMOVE_VIEWER'; payload: string }
  | { type: 'CLEAR_VIEWERS' }
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'SET_MOTION_EVENT'; payload: MotionEvent | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };

const initialState: AppState = {
  mode: 'home',
  roomCode: null,
  isStreaming: false,
  isMuted: false,
  settings: DEFAULT_SETTINGS,
  viewers: [],
  connectionStatus: 'disconnected',
  lastMotionEvent: null,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'SET_ROOM_CODE':
      return { ...state, roomCode: action.payload };
    case 'SET_STREAMING':
      return { ...state, isStreaming: action.payload };
    case 'SET_MUTED':
      return { ...state, isMuted: action.payload };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'ADD_VIEWER':
      return {
        ...state,
        viewers: [...state.viewers.filter(v => v.peerId !== action.payload.peerId), action.payload],
      };
    case 'REMOVE_VIEWER':
      return {
        ...state,
        viewers: state.viewers.filter(v => v.peerId !== action.payload),
      };
    case 'CLEAR_VIEWERS':
      return { ...state, viewers: [] };
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };
    case 'SET_MOTION_EVENT':
      return { ...state, lastMotionEvent: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  setMode: (mode: AppMode) => void;
  setRoomCode: (code: string | null) => void;
  setStreaming: (streaming: boolean) => void;
  setMuted: (muted: boolean) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  addViewer: (viewer: ViewerInfo) => void;
  removeViewer: (peerId: string) => void;
  clearViewers: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setMotionEvent: (event: MotionEvent | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setMode = useCallback((mode: AppMode) => {
    dispatch({ type: 'SET_MODE', payload: mode });
  }, []);

  const setRoomCode = useCallback((code: string | null) => {
    dispatch({ type: 'SET_ROOM_CODE', payload: code });
  }, []);

  const setStreaming = useCallback((streaming: boolean) => {
    dispatch({ type: 'SET_STREAMING', payload: streaming });
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    dispatch({ type: 'SET_MUTED', payload: muted });
  }, []);

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  const addViewer = useCallback((viewer: ViewerInfo) => {
    dispatch({ type: 'ADD_VIEWER', payload: viewer });
  }, []);

  const removeViewer = useCallback((peerId: string) => {
    dispatch({ type: 'REMOVE_VIEWER', payload: peerId });
  }, []);

  const clearViewers = useCallback(() => {
    dispatch({ type: 'CLEAR_VIEWERS' });
  }, []);

  const setConnectionStatus = useCallback((status: ConnectionStatus) => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
  }, []);

  const setMotionEvent = useCallback((event: MotionEvent | null) => {
    dispatch({ type: 'SET_MOTION_EVENT', payload: event });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const value: AppContextValue = {
    state,
    setMode,
    setRoomCode,
    setStreaming,
    setMuted,
    updateSettings,
    addViewer,
    removeViewer,
    clearViewers,
    setConnectionStatus,
    setMotionEvent,
    setError,
    reset,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
