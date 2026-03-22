import { MotionSensitivity, MOTION_SENSITIVITY_MAP } from '../types';

interface MotionDetectionOptions {
  sensitivity?: MotionSensitivity;
  detectionInterval?: number;
  debounceTime?: number;
  onMotionDetected?: (changePercentage: number) => void;
}

export class MotionDetector {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private previousFrame: ImageData | null = null;
  private isRunning = false;
  private animationFrameId: number | null = null;
  private lastDetectionTime = 0;
  private lastMotionTime = 0;

  private sensitivity: MotionSensitivity = 'medium';
  private detectionInterval: number = 200;
  private debounceTime: number = 5000;
  private onMotionDetected?: (changePercentage: number) => void;

  constructor(options: MotionDetectionOptions = {}) {
    this.sensitivity = options.sensitivity || 'medium';
    this.detectionInterval = options.detectionInterval || 200;
    this.debounceTime = options.debounceTime || 5000;
    this.onMotionDetected = options.onMotionDetected;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 320;
    this.canvas.height = 240;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  setVideoElement(video: HTMLVideoElement): void {
    this.videoElement = video;
  }

  setSensitivity(sensitivity: MotionSensitivity): void {
    this.sensitivity = sensitivity;
  }

  setDebounceTime(time: number): void {
    this.debounceTime = time;
  }

  setOnMotionDetected(callback: (changePercentage: number) => void): void {
    this.onMotionDetected = callback;
  }

  start(): void {
    if (this.isRunning || !this.videoElement) return;

    this.isRunning = true;
    this.previousFrame = null;
    this.lastDetectionTime = 0;
    this.lastMotionTime = 0;

    this.detect();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.previousFrame = null;
  }

  private detect = (): void => {
    if (!this.isRunning || !this.videoElement) return;

    const now = performance.now();

    if (now - this.lastDetectionTime >= this.detectionInterval) {
      this.lastDetectionTime = now;
      this.processFrame();
    }

    this.animationFrameId = requestAnimationFrame(this.detect);
  };

  private processFrame(): void {
    if (!this.videoElement || this.videoElement.readyState < 2) return;

    this.ctx.drawImage(
      this.videoElement,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    const currentFrame = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    if (this.previousFrame) {
      const changePercentage = this.compareFrames(
        this.previousFrame,
        currentFrame
      );

      const threshold = MOTION_SENSITIVITY_MAP[this.sensitivity];

      if (changePercentage > threshold) {
        const now = Date.now();

        if (now - this.lastMotionTime >= this.debounceTime) {
          this.lastMotionTime = now;
          console.log(
            `[MotionDetector] Motion detected! Change: ${(changePercentage * 100).toFixed(2)}%`
          );
          this.onMotionDetected?.(changePercentage);
        }
      }
    }

    this.previousFrame = currentFrame;
  }

  private compareFrames(prev: ImageData, curr: ImageData): number {
    const data1 = prev.data;
    const data2 = curr.data;
    const pixelCount = data1.length / 4;
    let changedPixels = 0;

    const pixelThreshold = 30;

    for (let i = 0; i < data1.length; i += 4) {
      const gray1 = (data1[i] + data1[i + 1] + data1[i + 2]) / 3;
      const gray2 = (data2[i] + data2[i + 1] + data2[i + 2]) / 3;

      if (Math.abs(gray1 - gray2) > pixelThreshold) {
        changedPixels++;
      }
    }

    return changedPixels / pixelCount;
  }

  isDetecting(): boolean {
    return this.isRunning;
  }

  destroy(): void {
    this.stop();
    this.videoElement = null;
    this.onMotionDetected = undefined;
  }
}

export function createMotionDetector(
  options: MotionDetectionOptions = {}
): MotionDetector {
  return new MotionDetector(options);
}
