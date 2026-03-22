import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { PeerService } from '../services/peerService';
import { getFCMToken, onForegroundMessage, playAlertSound, showLocalNotification } from '../services/notifications';
import { DataMessage, MotionAlertPayload } from '../types';

interface ViewerModeProps {
  roomCode: string;
}

export function ViewerMode({ roomCode }: ViewerModeProps) {
  const { setConnectionStatus, setError, setMode, setMotionEvent } = useApp();

  const videoRef = useRef<HTMLVideoElement>(null);
  const peerServiceRef = useRef<PeerService | null>(null);

  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMotionAlert, setShowMotionAlert] = useState(false);
  const [volume, setVolume] = useState(1);

  const connectToCamera = useCallback(async () => {
    setIsConnecting(true);
    setConnectionError(null);
    setConnectionStatus('connecting');

    const peerService = new PeerService();
    peerServiceRef.current = peerService;

    peerService.onMessage((_peerId, message: DataMessage) => {
      console.log('[ViewerMode] Message from camera:', message);

      if (message.type === 'motion-alert') {
        const payload = message.payload as MotionAlertPayload;
        console.log('[ViewerMode] Motion alert received:', payload);

        setShowMotionAlert(true);
        playAlertSound();

        setMotionEvent({
          timestamp: new Date(payload.timestamp),
          sensitivity: payload.sensitivity,
          changePercentage: 0,
        });

        setTimeout(() => setShowMotionAlert(false), 5000);
      }
    });

    peerService.onPeerError((error) => {
      console.error('[ViewerMode] Peer error:', error);
      setConnectionError(error.message);
      setConnectionStatus('error');
      setIsConnecting(false);
    });

    peerService.onStream((stream) => {
      console.log('[ViewerMode] Received stream');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsConnecting(false);
      setConnectionStatus('connected');
    });

    try {
      const stream = await peerService.initializeAsViewer(roomCode);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const fcmToken = await getFCMToken();
      if (fcmToken) {
        const dataConn = peerService['peer']?.connections[`petmon-${roomCode}`]?.[0];
        if (dataConn) {
          peerService.sendMessage(dataConn, {
            type: 'fcm-token',
            payload: { token: fcmToken, deviceId: navigator.userAgent },
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      console.error('[ViewerMode] Connection failed:', error);
      setConnectionError((error as Error).message);
      setConnectionStatus('error');
      setIsConnecting(false);
    }
  }, [roomCode, setConnectionStatus, setMotionEvent]);

  useEffect(() => {
    connectToCamera();

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('[ViewerMode] Foreground notification:', payload);
      if (payload.title) {
        showLocalNotification(payload.title, payload.body || '');
        setShowMotionAlert(true);
        playAlertSound();
        setTimeout(() => setShowMotionAlert(false), 5000);
      }
    });

    return () => {
      peerServiceRef.current?.disconnect();
      unsubscribe?.();
    };
  }, [connectToCamera]);

  const handleBack = () => {
    peerServiceRef.current?.disconnect();
    setMode('home');
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleToggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleRetry = () => {
    setConnectionError(null);
    connectToCamera();
  };

  if (isConnecting) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 mb-2">Connecting to camera...</p>
          <p className="text-gray-500 text-sm font-mono">{roomCode}</p>
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 p-6">
        <div className="card text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Connection Failed</h2>
          <p className="text-gray-400 mb-6">{connectionError}</p>
          <div className="flex gap-3">
            <button onClick={handleBack} className="btn-secondary flex-1">
              Go Back
            </button>
            <button onClick={handleRetry} className="btn-primary flex-1">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="relative flex-1">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain bg-black"
        />

        {showMotionAlert && (
          <div className="absolute top-0 left-0 right-0 p-4 bg-yellow-500 text-black font-bold text-center animate-pulse safe-area-inset-top">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Motion Detected!</span>
            </div>
          </div>
        )}

        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent safe-area-inset-top">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="btn-icon bg-black/40 hover:bg-black/60"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <div className="status-indicator online" />
              <span className="text-sm font-medium">Live</span>
            </div>

            <button
              onClick={handleToggleFullscreen}
              className="btn-icon bg-black/40 hover:bg-black/60"
            >
              {isFullscreen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="floating-controls safe-area-inset-bottom">
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={handleToggleMute}
              className={`btn-icon ${isMuted ? 'bg-red-500' : 'bg-white/20'}`}
            >
              {isMuted ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>

            <div className="flex items-center gap-2 bg-black/40 rounded-full px-4 py-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m0-12v12" />
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 accent-primary-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
