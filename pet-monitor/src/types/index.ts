import type { DataConnection, MediaConnection } from 'peerjs';

export type AppMode = 'home' | 'camera' | 'viewer';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type VideoQuality = '480p' | '720p' | '1080p';

export type MotionSensitivity = 'low' | 'medium' | 'high';

export interface VideoConstraints {
  width: number;
  height: number;
  frameRate: number;
}

export const VIDEO_QUALITY_MAP: Record<VideoQuality, VideoConstraints> = {
  '480p': { width: 854, height: 480, frameRate: 30 },
  '720p': { width: 1280, height: 720, frameRate: 30 },
  '1080p': { width: 1920, height: 1080, frameRate: 30 },
};

export const MOTION_SENSITIVITY_MAP: Record<MotionSensitivity, number> = {
  low: 0.15,
  medium: 0.08,
  high: 0.03,
};

export interface PeerConnection {
  peerId: string;
  dataConnection: DataConnection | null;
  mediaConnection: MediaConnection | null;
  status: ConnectionStatus;
}

export interface ViewerInfo {
  peerId: string;
  connectedAt: Date;
  dataConnection: DataConnection;
  mediaConnection: MediaConnection;
}

export interface MotionEvent {
  timestamp: Date;
  sensitivity: MotionSensitivity;
  changePercentage: number;
}

export interface Recording {
  id: string;
  blob: Blob;
  timestamp: Date;
  duration: number;
  thumbnail?: string;
  motionTriggered: boolean;
}

export interface DataMessage {
  type: DataMessageType;
  payload?: unknown;
  timestamp: number;
}

export type DataMessageType =
  | 'motion-alert'
  | 'viewer-joined'
  | 'viewer-left'
  | 'fcm-token'
  | 'settings-update'
  | 'ping'
  | 'pong';

export interface MotionAlertPayload {
  roomCode: string;
  timestamp: number;
  sensitivity: MotionSensitivity;
}

export interface FCMTokenPayload {
  token: string;
  deviceId: string;
}

export interface AppSettings {
  videoQuality: VideoQuality;
  motionSensitivity: MotionSensitivity;
  motionDetectionEnabled: boolean;
  audioEnabled: boolean;
  recordingEnabled: boolean;
  recordingDuration: number;
  notificationsEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  videoQuality: '720p',
  motionSensitivity: 'medium',
  motionDetectionEnabled: true,
  audioEnabled: true,
  recordingEnabled: true,
  recordingDuration: 10,
  notificationsEnabled: true,
};

export interface AppState {
  mode: AppMode;
  roomCode: string | null;
  isStreaming: boolean;
  isMuted: boolean;
  settings: AppSettings;
  viewers: ViewerInfo[];
  connectionStatus: ConnectionStatus;
  lastMotionEvent: MotionEvent | null;
  error: string | null;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
