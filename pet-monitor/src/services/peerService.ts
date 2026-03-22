import Peer, { DataConnection, MediaConnection } from 'peerjs';
import type { DataMessage, ViewerInfo } from '../types';

export const ROOM_CODE = 'SJ2108';

export class PeerService {
  private peer: Peer | null = null;
  private roomCode: string | null = null;
  private viewers: Map<string, ViewerInfo> = new Map();
  private localStream: MediaStream | null = null;
  private pendingViewers: Set<string> = new Set();
  
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
        debug: 2,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
          ]
        }
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

      this.peer.on('disconnected', () => {
        console.log('[PeerService] Peer disconnected, attempting to reconnect...');
        this.peer?.reconnect();
      });
    });
  }

  async initializeAsViewer(roomCode: string): Promise<MediaStream> {
    return new Promise((resolve, reject) => {
      this.roomCode = roomCode;
      const viewerId = `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const cameraPeerId = `petmon-${roomCode}`;

      let resolved = false;
      let timeoutId: number;

      this.peer = new Peer(viewerId, {
        debug: 2,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
          ]
        }
      });

      this.peer.on('open', (id) => {
        console.log('[PeerService] Viewer peer opened with ID:', id);
        this.onOpen?.(id);

        const dataConn = this.peer!.connect(cameraPeerId, {
          reliable: true,
        });

        dataConn.on('open', () => {
          console.log('[PeerService] Data connection opened to camera');
          this.sendMessage(dataConn, { 
            type: 'viewer-joined', 
            payload: { viewerId: id },
            timestamp: Date.now() 
          });
        });

        dataConn.on('data', (data) => {
          const message = data as DataMessage;
          console.log('[PeerService] Received message from camera:', message.type);
          this.onDataMessage?.(cameraPeerId, message);
        });

        dataConn.on('error', (err) => {
          console.error('[PeerService] Data connection error:', err);
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            reject(new Error('Failed to connect to camera.'));
          }
        });

        dataConn.on('close', () => {
          console.log('[PeerService] Data connection closed');
        });
      });

      this.peer.on('call', (mediaConn: MediaConnection) => {
        console.log('[PeerService] Receiving call from camera');
        
        mediaConn.answer();
        
        mediaConn.on('stream', (remoteStream) => {
          console.log('[PeerService] Received stream from camera');
          this.onRemoteStream?.(remoteStream);
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            resolve(remoteStream);
          }
        });

        mediaConn.on('error', (err) => {
          console.error('[PeerService] Media connection error:', err);
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            reject(err);
          }
        });

        mediaConn.on('close', () => {
          console.log('[PeerService] Media connection closed');
        });
      });

      this.peer.on('error', (err) => {
        console.error('[PeerService] Peer error:', err);
        this.onError?.(err);
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          if (err.type === 'peer-unavailable') {
            reject(new Error('Camera not found. Please check the room code.'));
          } else {
            reject(err);
          }
        }
      });

      timeoutId = window.setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('Connection timeout. Camera may be offline.'));
        }
      }, 30000);
    });
  }

  private setupCameraListeners(): void {
    if (!this.peer) return;

    this.peer.on('connection', (dataConn: DataConnection) => {
      console.log('[PeerService] Incoming data connection from:', dataConn.peer);

      dataConn.on('open', () => {
        console.log('[PeerService] Data connection opened with viewer:', dataConn.peer);
        
        if (this.localStream && !this.pendingViewers.has(dataConn.peer)) {
          this.pendingViewers.add(dataConn.peer);
          
          setTimeout(() => {
            this.callViewer(dataConn.peer, dataConn);
          }, 500);
        }
      });

      dataConn.on('data', (data) => {
        const message = data as DataMessage;
        console.log('[PeerService] Received data from viewer:', message.type);
        this.onDataMessage?.(dataConn.peer, message);
      });

      dataConn.on('close', () => {
        console.log('[PeerService] Data connection closed with:', dataConn.peer);
        this.pendingViewers.delete(dataConn.peer);
        this.removeViewer(dataConn.peer);
      });

      dataConn.on('error', (err) => {
        console.error('[PeerService] Data connection error:', err);
        this.pendingViewers.delete(dataConn.peer);
      });
    });
  }

  private callViewer(viewerId: string, dataConn: DataConnection): void {
    if (!this.peer || !this.localStream) {
      console.warn('[PeerService] Cannot call viewer - no peer or stream');
      return;
    }

    console.log('[PeerService] Calling viewer:', viewerId);
    
    const mediaConn = this.peer.call(viewerId, this.localStream);

    mediaConn.on('stream', () => {
      console.log('[PeerService] Media connection established with viewer');
    });

    const viewerInfo: ViewerInfo = {
      peerId: viewerId,
      connectedAt: new Date(),
      dataConnection: dataConn,
      mediaConnection: mediaConn,
    };

    this.viewers.set(viewerId, viewerInfo);
    this.pendingViewers.delete(viewerId);
    this.onViewerConnected?.(viewerInfo);

    mediaConn.on('close', () => {
      console.log('[PeerService] Media connection closed with:', viewerId);
      this.removeViewer(viewerId);
    });

    mediaConn.on('error', (err) => {
      console.error('[PeerService] Media connection error with viewer:', err);
    });
  }

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    console.log('[PeerService] Local stream set, tracks:', stream.getTracks().map(t => t.kind).join(', '));
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
    } else {
      console.warn('[PeerService] Cannot send message - connection not open');
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
    this.pendingViewers.clear();

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
