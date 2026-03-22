import Peer, { DataConnection, MediaConnection } from 'peerjs';
import type { DataMessage, ViewerInfo } from '../types';

const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length));
  }
  return code;
}

export function formatRoomCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code.toUpperCase());
}

export class PeerService {
  private peer: Peer | null = null;
  private roomCode: string | null = null;
  private viewers: Map<string, ViewerInfo> = new Map();
  private localStream: MediaStream | null = null;
  
  private onViewerConnected?: (viewer: ViewerInfo) => void;
  private onViewerDisconnected?: (peerId: string) => void;
  private onDataMessage?: (peerId: string, message: DataMessage) => void;
  private onError?: (error: Error) => void;
  private onOpen?: (id: string) => void;
  private onRemoteStream?: (stream: MediaStream) => void;

  constructor() {
    this.peer = null;
  }

  async initializeAsCamera(roomCode: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.roomCode = roomCode;
      const peerId = `petmon-${roomCode}`;

      this.peer = new Peer(peerId, {
        debug: 1,
      });

      this.peer.on('open', (id) => {
        console.log('[PeerService] Camera peer opened with ID:', id);
        this.setupCameraListeners();
        this.onOpen?.(id);
        resolve(id);
      });

      this.peer.on('error', (err) => {
        console.error('[PeerService] Peer error:', err);
        this.onError?.(err);
        if (err.type === 'unavailable-id') {
          reject(new Error('Room code already in use. Please try a different code.'));
        } else {
          reject(err);
        }
      });
    });
  }

  async initializeAsViewer(roomCode: string): Promise<MediaStream> {
    return new Promise((resolve, reject) => {
      this.roomCode = roomCode;
      const viewerId = `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const cameraPeerId = `petmon-${roomCode}`;

      this.peer = new Peer(viewerId, {
        debug: 1,
      });

      this.peer.on('open', (id) => {
        console.log('[PeerService] Viewer peer opened with ID:', id);
        this.onOpen?.(id);

        const dataConn = this.peer!.connect(cameraPeerId, {
          reliable: true,
        });

        dataConn.on('open', () => {
          console.log('[PeerService] Data connection opened to camera');
          this.sendMessage(dataConn, { type: 'viewer-joined', timestamp: Date.now() });
        });

        dataConn.on('data', (data) => {
          const message = data as DataMessage;
          this.onDataMessage?.(cameraPeerId, message);
        });

        dataConn.on('error', (err) => {
          console.error('[PeerService] Data connection error:', err);
          this.onError?.(err);
        });

        const mediaConn = this.peer!.call(cameraPeerId, new MediaStream());

        mediaConn.on('stream', (remoteStream) => {
          console.log('[PeerService] Received remote stream from camera');
          this.onRemoteStream?.(remoteStream);
          resolve(remoteStream);
        });

        mediaConn.on('error', (err) => {
          console.error('[PeerService] Media connection error:', err);
          this.onError?.(err);
          reject(err);
        });

        mediaConn.on('close', () => {
          console.log('[PeerService] Media connection closed');
        });
      });

      this.peer.on('error', (err) => {
        console.error('[PeerService] Peer error:', err);
        this.onError?.(err);
        if (err.type === 'peer-unavailable') {
          reject(new Error('Camera not found. Please check the room code.'));
        } else {
          reject(err);
        }
      });

      setTimeout(() => {
        reject(new Error('Connection timeout. Camera may be offline.'));
      }, 30000);
    });
  }

  private setupCameraListeners(): void {
    if (!this.peer) return;

    this.peer.on('connection', (dataConn: DataConnection) => {
      console.log('[PeerService] Incoming data connection from:', dataConn.peer);

      dataConn.on('open', () => {
        console.log('[PeerService] Data connection opened with:', dataConn.peer);
      });

      dataConn.on('data', (data) => {
        const message = data as DataMessage;
        console.log('[PeerService] Received data from viewer:', message);
        this.onDataMessage?.(dataConn.peer, message);
      });

      dataConn.on('close', () => {
        console.log('[PeerService] Data connection closed with:', dataConn.peer);
        this.removeViewer(dataConn.peer);
      });

      dataConn.on('error', (err) => {
        console.error('[PeerService] Data connection error:', err);
      });
    });

    this.peer.on('call', (mediaConn: MediaConnection) => {
      console.log('[PeerService] Incoming call from:', mediaConn.peer);

      if (this.localStream) {
        mediaConn.answer(this.localStream);
        console.log('[PeerService] Answered call with local stream');

        const existingViewer = this.viewers.get(mediaConn.peer);
        const viewerInfo: ViewerInfo = {
          peerId: mediaConn.peer,
          connectedAt: existingViewer?.connectedAt || new Date(),
          dataConnection: existingViewer?.dataConnection || null!,
          mediaConnection: mediaConn,
        };

        this.viewers.set(mediaConn.peer, viewerInfo);
        this.onViewerConnected?.(viewerInfo);

        mediaConn.on('close', () => {
          console.log('[PeerService] Media connection closed with:', mediaConn.peer);
          this.removeViewer(mediaConn.peer);
        });

        mediaConn.on('error', (err) => {
          console.error('[PeerService] Media connection error:', err);
        });
      } else {
        console.warn('[PeerService] No local stream available to answer call');
      }
    });
  }

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
  }

  private removeViewer(peerId: string): void {
    if (this.viewers.has(peerId)) {
      this.viewers.delete(peerId);
      this.onViewerDisconnected?.(peerId);
    }
  }

  sendMessage(connection: DataConnection, message: DataMessage): void {
    if (connection.open) {
      connection.send(message);
    }
  }

  broadcastToViewers(message: DataMessage): void {
    this.viewers.forEach((viewer) => {
      if (viewer.dataConnection?.open) {
        viewer.dataConnection.send(message);
      }
    });
  }

  getViewers(): ViewerInfo[] {
    return Array.from(this.viewers.values());
  }

  getViewerCount(): number {
    return this.viewers.size;
  }

  getRoomCode(): string | null {
    return this.roomCode;
  }

  disconnect(): void {
    console.log('[PeerService] Disconnecting...');
    
    this.viewers.forEach((viewer) => {
      viewer.dataConnection?.close();
      viewer.mediaConnection?.close();
    });
    this.viewers.clear();

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    this.localStream = null;
    this.roomCode = null;
  }

  onViewerConnect(callback: (viewer: ViewerInfo) => void): void {
    this.onViewerConnected = callback;
  }

  onViewerDisconnect(callback: (peerId: string) => void): void {
    this.onViewerDisconnected = callback;
  }

  onMessage(callback: (peerId: string, message: DataMessage) => void): void {
    this.onDataMessage = callback;
  }

  onPeerError(callback: (error: Error) => void): void {
    this.onError = callback;
  }

  onPeerOpen(callback: (id: string) => void): void {
    this.onOpen = callback;
  }

  onStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStream = callback;
  }
}

export const peerService = new PeerService();
