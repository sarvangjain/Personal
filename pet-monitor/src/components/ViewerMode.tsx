import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { PeerService } from '../services/peerService';
import { playAlertSound } from '../services/notifications';
import { DataMessage, MotionAlertPayload } from '../types';

interface ViewerModeProps {
  roomCode: string;
}

type ConnectionState = 'connecting' | 'waiting-stream' | 'playing' | 'error';

export function ViewerMode({ roomCode }: ViewerModeProps) {
  const { setConnectionStatus, setMode, setMotionEvent } = useApp();

  const videoRef = useRef<HTMLVideoElement>(null);
  const peerServiceRef = useRef<PeerService | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMotionAlert, setShowMotionAlert] = useState(false);
  const [volume, setVolume] = useState(1);
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...');

  const setupVideo = useCallback((stream: MediaStream) => {
    console.log('[ViewerMode] Setting up video with stream');
    setDebugInfo(`Stream received: ${stream.getTracks().length} tracks`);
    
    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    
    console.log('[ViewerMode] Video tracks:', videoTracks.length, videoTracks.map(t => ({ enabled: t.enabled, muted: t.muted, readyState: t.readyState })));
    console.log('[ViewerMode] Audio tracks:', audioTracks.length, audioTracks.map(t => ({ enabled: t.enabled, muted: t.muted, readyState: t.readyState })));

    if (!videoRef.current) {
      console.error('[ViewerMode] Video ref not available');
      setDebugInfo('Error: Video element not found');
      return;
    }

    streamRef.current = stream;
    
    // Clear any existing source
    videoRef.current.srcObject = null;
    
    // Set the new stream
    videoRef.current.srcObject = stream;
    videoRef.current.muted = true; // Must be muted for autoplay
    videoRef.current.playsInline = true;
    videoRef.current.autoplay = true;

    setDebugInfo('Stream attached, attempting to play...');
    setConnectionState('waiting-stream');

    // Try to play
    const playVideo = async () => {
      try {
        if (videoRef.current) {
          await videoRef.current.play();
          console.log('[ViewerMode] Video playing successfully');
          setDebugInfo('Playing');
          setConnectionState('playing');
          setConnectionStatus('connected');
        }
      } catch (err) {
        console.error('[ViewerMode] Play failed:', err);
        setDebugInfo(`Play error: ${(err as Error).message}`);
        
        // Try with load first
        try {
          if (videoRef.current) {
            videoRef.current.load();
            await videoRef.current.play();
            setConnectionState('playing');
            setConnectionStatus('connected');
          }
        } catch (err2) {
          console.error('[ViewerMode] Retry play failed:', err2);
        }
      }
    };

    // Handle video events
    videoRef.current.onloadedmetadata = () => {
      console.log('[ViewerMode] Video metadata loaded');
      setDebugInfo('Metadata loaded, playing...');
      playVideo();
    };

    videoRef.current.onplaying = () => {
      console.log('[ViewerMode] Video is playing');
      setConnectionState('playing');
      setDebugInfo('Live');
    };

    videoRef.current.onerror = (e) => {
      console.error('[ViewerMode] Video error:', e);
      setDebugInfo(`Video error: ${videoRef.current?.error?.message || 'Unknown'}`);
    };

    videoRef.current.onstalled = () => {
      console.log('[ViewerMode] Video stalled');
      setDebugInfo('Buffering...');
    };

    // If metadata is already loaded, play immediately
    if (videoRef.current.readyState >= 1) {
      playVideo();
    }
  }, [setConnectionStatus]);

  const connectToCamera = useCallback(async () => {
    setConnectionState('connecting');
    setConnectionError(null);
    setDebugInfo('Connecting to camera...');
    setConnectionStatus('connecting');

    const peerService = new PeerService();
    peerServiceRef.current = peerService;

    peerService.onMessage((_peerId, message: DataMessage) => {
      if (message.type === 'motion-alert') {
        const payload = message.payload as MotionAlertPayload;
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
      setConnectionState('error');
      setConnectionStatus('error');
      setDebugInfo(`Error: ${error.message}`);
    });

    peerService.onStream((stream) => {
      console.log('[ViewerMode] onStream callback');
      setDebugInfo('Stream callback received');
      setupVideo(stream);
    });

    try {
      setDebugInfo('Initializing viewer peer...');
      const stream = await peerService.initializeAsViewer(roomCode);
      console.log('[ViewerMode] Got stream from initializeAsViewer');
      setDebugInfo('Got stream from connection');
      setupVideo(stream);
    } catch (error) {
      console.error('[ViewerMode] Connection failed:', error);
      setConnectionError((error as Error).message);
      setConnectionState('error');
      setConnectionStatus('error');
      setDebugInfo(`Connection failed: ${(error as Error).message}`);
    }
  }, [roomCode, setConnectionStatus, setMotionEvent, setupVideo]);

  useEffect(() => {
    connectToCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      peerServiceRef.current?.disconnect();
    };
  }, [connectToCamera]);

  const handleBack = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    peerServiceRef.current?.disconnect();
    setMode('home');
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
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
    try {
      if (!document.fullscreenElement) {
        await videoRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('[ViewerMode] Fullscreen error:', err);
    }
  };

  const handleRetry = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    peerServiceRef.current?.disconnect();
    setConnectionError(null);
    connectToCamera();
  };

  if (connectionState === 'error' && connectionError) {
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
    <div className="h-full flex flex-col bg-black relative">
      {/* Video element - always rendered */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className={`absolute inset-0 w-full h-full object-contain bg-black ${
          connectionState === 'playing' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Loading overlay */}
      {connectionState !== 'playing' && connectionState !== 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
          <div className="w-20 h-20 relative mb-6">
            {/* Outer ring */}
            <div className="absolute inset-0 border-4 border-primary-500/30 rounded-full"></div>
            {/* Spinning ring */}
            <div className="absolute inset-0 border-4 border-transparent border-t-primary-500 rounded-full animate-spin"></div>
            {/* Inner icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-xl font-semibold mb-2">
            {connectionState === 'connecting' && 'Connecting to Camera'}
            {connectionState === 'waiting-stream' && 'Loading Stream'}
          </h2>
          
          <p className="text-gray-400 mb-4">Room: {roomCode}</p>
          
          <div className="bg-gray-800 px-4 py-2 rounded-full">
            <p className="text-sm text-gray-400">{debugInfo}</p>
          </div>

          <button 
            onClick={handleBack}
            className="mt-8 text-gray-500 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Motion alert banner */}
      {showMotionAlert && (
        <div className="absolute top-0 left-0 right-0 p-4 bg-yellow-500 text-black font-bold text-center animate-pulse z-30 safe-area-inset-top">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Motion Detected!</span>
          </div>
        </div>
      )}

      {/* Top controls - only show when playing */}
      {connectionState === 'playing' && (
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-20 safe-area-inset-top">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="btn-icon bg-black/40 hover:bg-black/60"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">LIVE</span>
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
      )}

      {/* Bottom controls - only show when playing */}
      {connectionState === 'playing' && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20 safe-area-inset-bottom">
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

            <p className="text-xs text-gray-400">Tap speaker to unmute</p>
          </div>
        </div>
      )}
    </div>
  );
}
