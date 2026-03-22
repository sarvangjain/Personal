import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useCamera } from '../hooks/useCamera';
import { PeerService, generateRoomCode } from '../services/peerService';
import { MotionDetector, createMotionDetector } from '../services/motionDetection';
import { VideoRecorder, createVideoRecorder } from '../services/mediaRecorder';
import { sendMotionNotification, playAlertSound } from '../services/notifications';
import { VideoQuality, MotionSensitivity, Recording, DataMessage } from '../types';

export function CameraMode() {
  const { state, setRoomCode, setStreaming, setMuted, updateSettings, addViewer, removeViewer, setConnectionStatus, setMotionEvent, setError, setMode } = useApp();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerServiceRef = useRef<PeerService | null>(null);
  const motionDetectorRef = useRef<MotionDetector | null>(null);
  const recorderRef = useRef<VideoRecorder | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [fcmTokens, setFcmTokens] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const {
    stream,
    isLoading,
    error: cameraError,
    startCamera,
    stopCamera,
    toggleCamera,
    toggleAudio,
    setQuality,
    isAudioEnabled,
  } = useCamera({
    quality: state.settings.videoQuality,
    audioEnabled: state.settings.audioEnabled,
    facingMode: 'environment',
  });

  const initializePeer = useCallback(async () => {
    if (!stream) return;

    const roomCode = generateRoomCode();
    const peerService = new PeerService();
    peerServiceRef.current = peerService;

    peerService.setLocalStream(stream);

    peerService.onViewerConnect((viewer) => {
      console.log('[CameraMode] Viewer connected:', viewer.peerId);
      addViewer(viewer);
    });

    peerService.onViewerDisconnect((peerId) => {
      console.log('[CameraMode] Viewer disconnected:', peerId);
      removeViewer(peerId);
    });

    peerService.onMessage((peerId, message: DataMessage) => {
      console.log('[CameraMode] Message from viewer:', peerId, message);
      if (message.type === 'fcm-token') {
        const payload = message.payload as { token: string };
        setFcmTokens(prev => [...new Set([...prev, payload.token])]);
      }
    });

    peerService.onPeerError((error) => {
      console.error('[CameraMode] Peer error:', error);
      setError(error.message);
      setConnectionStatus('error');
    });

    try {
      setConnectionStatus('connecting');
      await peerService.initializeAsCamera(roomCode);
      setRoomCode(roomCode);
      setStreaming(true);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('[CameraMode] Failed to initialize peer:', error);
      setError((error as Error).message);
      setConnectionStatus('error');
    }
  }, [stream, addViewer, removeViewer, setRoomCode, setStreaming, setConnectionStatus, setError]);

  const handleMotionDetected = useCallback((changePercentage: number) => {
    console.log('[CameraMode] Motion detected:', changePercentage);
    
    const event = {
      timestamp: new Date(),
      sensitivity: state.settings.motionSensitivity,
      changePercentage,
    };
    setMotionEvent(event);

    peerServiceRef.current?.broadcastToViewers({
      type: 'motion-alert',
      payload: {
        roomCode: state.roomCode,
        timestamp: Date.now(),
        sensitivity: state.settings.motionSensitivity,
      },
      timestamp: Date.now(),
    });

    if (state.settings.notificationsEnabled && fcmTokens.length > 0) {
      sendMotionNotification(fcmTokens, state.roomCode || '');
    }

    if (state.settings.recordingEnabled && stream && !isRecording) {
      startRecording();
    }

    playAlertSound();
  }, [state.settings, state.roomCode, fcmTokens, stream, isRecording, setMotionEvent]);

  const startRecording = useCallback(() => {
    if (!stream || isRecording) return;

    const recorder = createVideoRecorder({
      stream,
      duration: state.settings.recordingDuration,
      onRecordingComplete: (recording: Recording) => {
        console.log('[CameraMode] Recording complete:', recording.id);
        setIsRecording(false);
      },
      onError: (error) => {
        console.error('[CameraMode] Recording error:', error);
        setIsRecording(false);
      },
    });

    recorderRef.current = recorder;
    recorder.start(true);
    setIsRecording(true);
  }, [stream, isRecording, state.settings.recordingDuration]);

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
      peerServiceRef.current?.disconnect();
      motionDetectorRef.current?.destroy();
      recorderRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      initializePeer();
    }
  }, [stream, initializePeer]);

  useEffect(() => {
    if (stream && videoRef.current && state.settings.motionDetectionEnabled) {
      const detector = createMotionDetector({
        sensitivity: state.settings.motionSensitivity,
        onMotionDetected: handleMotionDetected,
      });
      detector.setVideoElement(videoRef.current);
      detector.start();
      motionDetectorRef.current = detector;

      return () => {
        detector.destroy();
      };
    }
  }, [stream, state.settings.motionDetectionEnabled, state.settings.motionSensitivity, handleMotionDetected]);

  const handleCopyRoomCode = async () => {
    if (state.roomCode) {
      await navigator.clipboard.writeText(state.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBack = () => {
    stopCamera();
    peerServiceRef.current?.disconnect();
    motionDetectorRef.current?.destroy();
    recorderRef.current?.destroy();
    setMode('home');
  };

  const handleToggleAudio = () => {
    toggleAudio();
    setMuted(!isAudioEnabled);
  };

  const handleQualityChange = (quality: VideoQuality) => {
    setQuality(quality);
    updateSettings({ videoQuality: quality });
  };

  const handleSensitivityChange = (sensitivity: MotionSensitivity) => {
    updateSettings({ motionSensitivity: sensitivity });
    motionDetectorRef.current?.setSensitivity(sensitivity);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Starting camera...</p>
        </div>
      </div>
    );
  }

  if (cameraError) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 p-6">
        <div className="card text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Camera Error</h2>
          <p className="text-gray-400 mb-6">{cameraError}</p>
          <button onClick={handleBack} className="btn-secondary w-full">
            Go Back
          </button>
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
          muted
          className="w-full h-full object-cover"
        />

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
              <div className={`status-indicator ${state.connectionStatus === 'connected' ? 'online' : state.connectionStatus === 'connecting' ? 'connecting' : 'offline'}`} />
              <span className="text-sm font-medium">
                {state.viewers.length} viewer{state.viewers.length !== 1 ? 's' : ''}
              </span>
            </div>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn-icon bg-black/40 hover:bg-black/60"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {state.roomCode && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2">
            <button
              onClick={handleCopyRoomCode}
              className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2"
            >
              <span className="font-mono font-bold text-lg tracking-wider">{state.roomCode}</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {copied ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                )}
              </svg>
            </button>
          </div>
        )}

        {isRecording && (
          <div className="absolute top-20 right-4 flex items-center gap-2 bg-red-500 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium">REC</span>
          </div>
        )}

        {state.lastMotionEvent && Date.now() - state.lastMotionEvent.timestamp.getTime() < 3000 && (
          <div className="absolute inset-0 border-4 border-yellow-500 animate-pulse pointer-events-none" />
        )}

        <div className="floating-controls safe-area-inset-bottom">
          <div className="flex justify-center gap-4">
            <button
              onClick={handleToggleAudio}
              className={`btn-icon ${isAudioEnabled ? 'bg-white/20' : 'bg-red-500'}`}
            >
              {isAudioEnabled ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )}
            </button>

            <button
              onClick={toggleCamera}
              className="btn-icon bg-white/20"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={() => updateSettings({ motionDetectionEnabled: !state.settings.motionDetectionEnabled })}
              className={`btn-icon ${state.settings.motionDetectionEnabled ? 'bg-primary-500' : 'bg-white/20'}`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-end">
            <div className="bg-gray-800 w-full rounded-t-3xl p-6 max-h-[70%] overflow-auto safe-area-inset-bottom">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Settings</h2>
                <button onClick={() => setShowSettings(false)} className="btn-icon bg-gray-700">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Video Quality</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['480p', '720p', '1080p'] as VideoQuality[]).map((q) => (
                      <button
                        key={q}
                        onClick={() => handleQualityChange(q)}
                        className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                          state.settings.videoQuality === q
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Motion Sensitivity</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['low', 'medium', 'high'] as MotionSensitivity[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSensitivityChange(s)}
                        className={`py-2 px-4 rounded-lg font-medium capitalize transition-colors ${
                          state.settings.motionSensitivity === s
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Recording on Motion</span>
                  <button
                    onClick={() => updateSettings({ recordingEnabled: !state.settings.recordingEnabled })}
                    className={`w-12 h-7 rounded-full transition-colors relative ${
                      state.settings.recordingEnabled ? 'bg-primary-500' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${
                        state.settings.recordingEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Push Notifications</span>
                  <button
                    onClick={() => updateSettings({ notificationsEnabled: !state.settings.notificationsEnabled })}
                    className={`w-12 h-7 rounded-full transition-colors relative ${
                      state.settings.notificationsEnabled ? 'bg-primary-500' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${
                        state.settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
