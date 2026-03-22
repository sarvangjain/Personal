import Peer, { DataConnection, MediaConnection } from 'peerjs';
import type { DataMessage, ViewerInfo } from '../types';

export const ROOM_CODE = 'SJ2108';

// ICE server configuration with free STUN/TURN servers
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // OpenRelay TURN servers (free)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export class PeerService {
  private peer: Peer | null = null;
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
      const peerId = `petmon-${roomCode}`;

      console.log('[PeerService] Initializing camera with peer ID:', peerId);

      this.peer = new Peer(peerId, {
        debug: 2,
        config: {
          iceServers: ICE_SERVERS,
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
      const viewerId = `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const cameraPeerId = `petmon-${roomCode}`;

      console.log('[PeerService] Initializing viewer:', viewerId, 'connecting to:', cameraPeerId);

      let resolved = false;
      let timeoutId: number;

      this.peer = new Peer(viewerId, {
        debug: 2,
        config: {
          iceServers: ICE_SERVERS,
        }
      });

      this.peer.on('open', (id) => {
        console.log('[PeerService] Viewer peer opened with ID:', id);
        this.onOpen?.(id);

        // Connect data channel first
        console.log('[PeerService] Connecting data channel to camera...');
        const dataConn = this.peer!.connect(cameraPeerId, {
          reliable: true,
        });

        dataConn.on('open', () => {
          console.log('[PeerService] Data connection established with camera');
          // Notify camera we've joined
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
            reject(new Error('Failed to connect to camera. Please try again.'));
          }
        });

        dataConn.on('close', () => {
          console.log('[PeerService] Data connection closed');
        });
      });

      // Handle incoming media call from camera
      this.peer.on('call', (mediaConn: MediaConnection) => {
        console.log('[PeerService] Receiving media call from camera');
        
        // Answer the call (we don't send anything back)
        mediaConn.answer();
        console.log('[PeerService] Answered media call, waiting for stream...');
        
        mediaConn.on('stream', (remoteStream) => {
          console.log('[PeerService] Stream received from camera:', {
            id: remoteStream.id,
            active: remoteStream.active,
            videoTracks: remoteStream.getVideoTracks().length,
            audioTracks: remoteStream.getAudioTracks().length,
          });

          // Verify the stream has tracks
          const videoTracks = remoteStream.getVideoTracks();
          const audioTracks = remoteStream.getAudioTracks();
          
          if (videoTracks.length > 0) {
            console.log('[PeerService] Video track:', {
              label: videoTracks[0].label,
              enabled: videoTracks[0].enabled,
              readyState: videoTracks[0].readyState,
              muted: videoTracks[0].muted,
            });
            
            // Ensure video track is enabled
            videoTracks[0].enabled = true;
          } else {
            console.warn('[PeerService] No video tracks in stream!');
          }
          
          if (audioTracks.length > 0) {
            audioTracks[0].enabled = true;
          }
          
          // Call the stream callback
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
            reject(new Error('Media connection failed: ' + err.message));
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
            reject(new Error('Camera not found. Make sure the camera is active.'));
          } else {
            reject(new Error('Connection error: ' + err.message));
          }
        }
      });

      // Timeout after 30 seconds
      timeoutId = window.setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.error('[PeerService] Connection timeout');
          reject(new Error('Connection timeout. Camera may be offline or network is blocking.'));
        }
      }, 30000);
    });
  }

  private setupCameraListeners(): void {
    if (!this.peer) return;

    this.peer.on('connection', (dataConn: DataConnection) => {
      console.log('[PeerService] Incoming data connection from viewer:', dataConn.peer);

      dataConn.on('open', () => {
        console.log('[PeerService] Data connection opened with:', dataConn.peer);
        
        // Stream the video to this viewer
        if (this.localStream && !this.pendingViewers.has(dataConn.peer)) {
          this.pendingViewers.add(dataConn.peer);
          
          // Small delay to ensure viewer is ready
          setTimeout(() => {
            this.callViewer(dataConn.peer, dataConn);
          }, 300);
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
        console.error('[PeerService] Data connection error with viewer:', err);
        this.pendingViewers.delete(dataConn.peer);
      });
    });
  }

  private callViewer(viewerId: string, dataConn: DataConnection): void {
    if (!this.peer || !this.localStream) {
      console.warn('[PeerService] Cannot call viewer - peer or stream not available');
      this.pendingViewers.delete(viewerId);
      return;
    }

    // Verify stream is active
    if (!this.localStream.active) {
      console.error('[PeerService] Local stream is not active!');
      this.pendingViewers.delete(viewerId);
      return;
    }

    const videoTracks = this.localStream.getVideoTracks();
    const audioTracks = this.localStream.getAudioTracks();
    
    console.log('[PeerService] Calling viewer:', viewerId, {
      streamActive: this.localStream.active,
      videoTracks: videoTracks.length,
      audioTracks: audioTracks.length,
      videoEnabled: videoTracks[0]?.enabled,
      videoReadyState: videoTracks[0]?.readyState,
    });

    // Make sure tracks are enabled
    videoTracks.forEach(track => { track.enabled = true; });
    audioTracks.forEach(track => { track.enabled = true; });
    
    const mediaConn = this.peer.call(viewerId, this.localStream);

    mediaConn.on('stream', () => {
      console.log('[PeerService] Media stream established with viewer:', viewerId);
    });
    
    mediaConn.on('error', (err) => {
      console.error('[PeerService] Media call error to viewer:', viewerId, err);
      this.pendingViewers.delete(viewerId);
    });

    mediaConn.on('close', () => {
      console.log('[PeerService] Media connection closed with viewer:', viewerId);
      this.pendingViewers.delete(viewerId);
    });

    const viewerInfo: ViewerInfo = {
      peerId: viewerId,
      connectedAt: new Date(),
      dataConnection: dataConn,
      mediaConnection: mediaConn,
    };

    this.viewers.set(viewerId, viewerInfo);
    this.onViewerConnected?.(viewerInfo);
    this.pendingViewers.delete(viewerId);
  }

  private removeViewer(peerId: string): void {
    const viewer = this.viewers.get(peerId);
    if (viewer) {
      viewer.mediaConnection?.close();
      viewer.dataConnection?.close();
      this.viewers.delete(peerId);
      this.onViewerDisconnected?.(peerId);
    }
  }

  setLocalStream(stream: MediaStream): void {
    console.log('[PeerService] Setting local stream:', {
      id: stream.id,
      active: stream.active,
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
    });
    this.localStream = stream;
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

  broadcastToViewers(message: DataMessage): void {
    this.viewers.forEach((viewer) => {
      this.sendMessage(viewer.dataConnection, message);
    });
  }

  private sendMessage(conn: DataConnection, message: DataMessage): void {
    if (conn.open) {
      conn.send(message);
    } else {
      console.warn('[PeerService] Cannot send message - connection not open');
    }
  }

  disconnect(): void {
    console.log('[PeerService] Disconnecting...');
    this.viewers.forEach((_, peerId) => {
      this.removeViewer(peerId);
    });
    this.peer?.destroy();
    this.peer = null;
    this.localStream = null;
    this.pendingViewers.clear();
  }
}
