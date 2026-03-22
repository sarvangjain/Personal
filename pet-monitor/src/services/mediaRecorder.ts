import { Recording } from '../types';
import { saveRecording } from './storage';

interface RecorderOptions {
  stream: MediaStream;
  duration?: number;
  onRecordingComplete?: (recording: Recording) => void;
  onError?: (error: Error) => void;
}

export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream;
  private duration: number;
  private isRecording = false;
  private recordingTimeout: number | null = null;
  private startTime: number = 0;

  private onRecordingComplete?: (recording: Recording) => void;
  private onError?: (error: Error) => void;

  constructor(options: RecorderOptions) {
    this.stream = options.stream;
    this.duration = options.duration || 10;
    this.onRecordingComplete = options.onRecordingComplete;
    this.onError = options.onError;
  }

  async start(motionTriggered: boolean = false): Promise<void> {
    if (this.isRecording) {
      console.log('[VideoRecorder] Already recording');
      return;
    }

    try {
      const mimeType = this.getSupportedMimeType();
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        videoBitsPerSecond: 2500000,
      });

      this.chunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(this.chunks, { type: mimeType });
        const recording: Recording = {
          id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          blob,
          timestamp: new Date(this.startTime),
          duration: (Date.now() - this.startTime) / 1000,
          motionTriggered,
        };

        try {
          await saveRecording(recording);
          this.onRecordingComplete?.(recording);
          console.log('[VideoRecorder] Recording saved:', recording.id);
        } catch (error) {
          console.error('[VideoRecorder] Failed to save recording:', error);
          this.onError?.(error as Error);
        }

        this.isRecording = false;
        this.chunks = [];
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('[VideoRecorder] Recording error:', event);
        this.onError?.(new Error('Recording failed'));
        this.isRecording = false;
      };

      this.mediaRecorder.start(1000);
      this.isRecording = true;

      console.log(`[VideoRecorder] Started recording for ${this.duration}s`);

      this.recordingTimeout = window.setTimeout(() => {
        this.stop();
      }, this.duration * 1000);
    } catch (error) {
      console.error('[VideoRecorder] Failed to start recording:', error);
      this.onError?.(error as Error);
    }
  }

  stop(): void {
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }

    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      console.log('[VideoRecorder] Stopped recording');
    }
  }

  private getSupportedMimeType(): string {
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        console.log('[VideoRecorder] Using MIME type:', mimeType);
        return mimeType;
      }
    }

    return 'video/webm';
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  setDuration(duration: number): void {
    this.duration = duration;
  }

  destroy(): void {
    this.stop();
    this.mediaRecorder = null;
    this.chunks = [];
  }
}

export function createVideoRecorder(options: RecorderOptions): VideoRecorder {
  return new VideoRecorder(options);
}

export async function generateThumbnail(
  blob: Blob,
  timestamp: number = 0
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = timestamp;
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        URL.revokeObjectURL(video.src);
        resolve(thumbnail);
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(blob);
  });
}
