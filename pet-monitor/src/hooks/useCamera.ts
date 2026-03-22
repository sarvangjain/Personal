import { useState, useCallback, useRef, useEffect } from 'react';
import { VideoQuality, VIDEO_QUALITY_MAP } from '../types';

interface UseCameraOptions {
  quality?: VideoQuality;
  audioEnabled?: boolean;
  facingMode?: 'user' | 'environment';
}

interface UseCameraReturn {
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  toggleCamera: () => Promise<void>;
  toggleAudio: () => void;
  setQuality: (quality: VideoQuality) => Promise<void>;
  isAudioEnabled: boolean;
  facingMode: 'user' | 'environment';
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const {
    quality = '720p',
    audioEnabled = true,
    facingMode: initialFacingMode = 'environment',
  } = options;

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(audioEnabled);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(initialFacingMode);
  const [currentQuality, setCurrentQuality] = useState<VideoQuality>(quality);

  const streamRef = useRef<MediaStream | null>(null);

  const getConstraints = useCallback(
    (facing: 'user' | 'environment', videoQuality: VideoQuality): MediaStreamConstraints => {
      const qualityConfig = VIDEO_QUALITY_MAP[videoQuality];
      return {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: qualityConfig.width },
          height: { ideal: qualityConfig.height },
          frameRate: { ideal: qualityConfig.frameRate },
        },
        audio: isAudioEnabled
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : false,
      };
    },
    [isAudioEnabled]
  );

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints = getConstraints(facingMode, currentQuality);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setHasPermission(true);
      setError(null);
    } catch (err) {
      const error = err as Error;
      console.error('[useCamera] Error accessing camera:', error);

      if (error.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access.');
      } else if (error.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (error.name === 'NotReadableError') {
        setError('Camera is already in use by another application.');
      } else if (error.name === 'OverconstrainedError') {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: isAudioEnabled,
          });
          streamRef.current = fallbackStream;
          setStream(fallbackStream);
          setHasPermission(true);
          setError(null);
          return;
        } catch {
          setError('Failed to access camera with requested settings.');
        }
      } else {
        setError(`Failed to access camera: ${error.message}`);
      }

      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, currentQuality, getConstraints, isAudioEnabled]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    if (stream) {
      setIsLoading(true);
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const constraints = getConstraints(newFacingMode, currentQuality);
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

        streamRef.current = mediaStream;
        setStream(mediaStream);
      } catch (err) {
        console.error('[useCamera] Error toggling camera:', err);
        setError('Failed to switch camera.');
      } finally {
        setIsLoading(false);
      }
    }
  }, [facingMode, stream, currentQuality, getConstraints]);

  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled((prev) => !prev);
    }
  }, []);

  const setQuality = useCallback(
    async (newQuality: VideoQuality) => {
      setCurrentQuality(newQuality);

      if (stream) {
        setIsLoading(true);
        try {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }

          const constraints = getConstraints(facingMode, newQuality);
          const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

          streamRef.current = mediaStream;
          setStream(mediaStream);
        } catch (err) {
          console.error('[useCamera] Error changing quality:', err);
          setError('Failed to change video quality.');
        } finally {
          setIsLoading(false);
        }
      }
    },
    [stream, facingMode, getConstraints]
  );

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    stream,
    isLoading,
    error,
    hasPermission,
    startCamera,
    stopCamera,
    toggleCamera,
    toggleAudio,
    setQuality,
    isAudioEnabled,
    facingMode,
  };
}
