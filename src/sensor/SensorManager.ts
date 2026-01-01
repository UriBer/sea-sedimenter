import type { RawSensorData, SensorStatus, PermissionStatus } from '../types';

export type SensorDataCallback = (data: RawSensorData) => void;

/**
 * Manages device motion/orientation sensor access with iOS permission handling
 */
export class SensorManager {
  private motionListener: ((event: DeviceMotionEvent) => void) | null = null;
  private orientationListener: ((event: DeviceOrientationEvent) => void) | null = null;
  private callback: SensorDataCallback | null = null;
  private permissionStatus: PermissionStatus = 'prompt';
  private sensorsRunning = false;

  /**
   * Request permissions (required on iOS)
   */
  async requestPermissions(): Promise<PermissionStatus> {
    if (typeof DeviceMotionEvent === 'undefined' || !DeviceMotionEvent.requestPermission) {
      // Android Chrome or unsupported
      this.permissionStatus = 'granted';
      return 'granted';
    }

    try {
      const motionPermission = await DeviceMotionEvent.requestPermission();
      const orientationPermission = DeviceOrientationEvent.requestPermission
        ? await DeviceOrientationEvent.requestPermission()
        : 'granted';

      if (motionPermission === 'granted' && orientationPermission === 'granted') {
        this.permissionStatus = 'granted';
        return 'granted';
      } else {
        this.permissionStatus = 'denied';
        return 'denied';
      }
    } catch (error) {
      console.error('Permission request error:', error);
      this.permissionStatus = 'denied';
      return 'denied';
    }
  }

  /**
   * Check if sensors are supported
   */
  isSupported(): boolean {
    return typeof DeviceMotionEvent !== 'undefined';
  }

  /**
   * Check if running over HTTPS (required for sensors)
   */
  isHTTPS(): boolean {
    return window.location.protocol === 'https:';
  }

  /**
   * Start sensor subscriptions
   */
  start(callback: SensorDataCallback): boolean {
    if (!this.isSupported()) {
      return false;
    }

    if (this.permissionStatus !== 'granted') {
      // On Android, permission is granted automatically on user gesture
      // Try to start anyway
      this.permissionStatus = 'granted';
    }

    this.callback = callback;
    this.sensorsRunning = true;

    // DeviceMotion event handler
    this.motionListener = (event: DeviceMotionEvent) => {
      if (!this.sensorsRunning || !this.callback) return;

      const accel = event.accelerationIncludingGravity;
      const rotation = event.rotationRate;
      const interval = event.interval;

      this.callback({
        accelerationIncludingGravity: accel
          ? { x: accel.x ?? 0, y: accel.y ?? 0, z: accel.z ?? 0 }
          : null,
        rotationRate: rotation
          ? { x: rotation.alpha ?? 0, y: rotation.beta ?? 0, z: rotation.gamma ?? 0 }
          : null,
        interval: interval ?? null,
        timestamp: Date.now(),
      });
    };

    // DeviceOrientation event handler (optional, for additional data)
    this.orientationListener = () => {
      // Orientation data is optional, we primarily use DeviceMotion
    };

    // Subscribe to events
    window.addEventListener('devicemotion', this.motionListener);
    if (this.orientationListener) {
      window.addEventListener('deviceorientation', this.orientationListener);
    }

    return true;
  }

  /**
   * Stop sensor subscriptions
   */
  stop(): void {
    this.sensorsRunning = false;

    if (this.motionListener) {
      window.removeEventListener('devicemotion', this.motionListener);
      this.motionListener = null;
    }

    if (this.orientationListener) {
      window.removeEventListener('deviceorientation', this.orientationListener);
      this.orientationListener = null;
    }

    this.callback = null;
  }

  /**
   * Get current status
   */
  getStatus(): SensorStatus {
    return {
      permissionGranted: this.permissionStatus === 'granted',
      sensorsEnabled: this.isSupported(),
      sensorsRunning: this.sensorsRunning,
      permissionStatus: this.permissionStatus,
      error: !this.isSupported() ? 'Sensors not supported on this device' : null,
    };
  }
}

