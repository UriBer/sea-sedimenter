import { SensorManager } from '../sensor/SensorManager';
import { IMUProcessor } from '../sensor/IMUProcessor';
import { SessionManager } from '../session/SessionManager';
import { MeasurementCalculator } from '../measurement/MeasurementCalculator';
import { Controls } from './Controls';
import { Metrics } from './Metrics';
import { SessionView } from './SessionView';
import { ResultCard } from './ResultCard';
import { DebugView } from './DebugView';
import { DEFAULT_CONFIG } from '../utils/config';
import type { RawSensorData, ProcessedIMUData, LiveMetrics, MeasurementResult, Config } from '../types';

export class App {
  private sensorManager: SensorManager;
  private imuProcessor: IMUProcessor;
  private sessionManager: SessionManager;
  private calculator: MeasurementCalculator;
  private config: Config;

  // UI Components
  private controls: Controls;
  private metrics: Metrics;
  private sessionView: SessionView;
  private resultCard: ResultCard;
  private debugView: DebugView;

  // State
  private sensorsRunning = false;
  private sessionActive = false;
  private currentRawData: RawSensorData | null = null;
  private currentProcessedData: ProcessedIMUData | null = null;

  // Input elements
  private scaleInput: HTMLInputElement;
  private sampleMassInput: HTMLInputElement;
  private biasInput: HTMLInputElement;
  private motionCorrectionToggle: HTMLInputElement;
  private gravityAlphaSlider: HTMLInputElement;
  private configPanel: HTMLElement;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    
    // Initialize managers
    this.sensorManager = new SensorManager();
    this.imuProcessor = new IMUProcessor(this.config);
    this.sessionManager = new SessionManager(() => this.getCurrentScaleReading(), this.config);
    this.calculator = new MeasurementCalculator(this.config);

    // Setup IMU processor callbacks
    this.imuProcessor.onProcessed((data) => {
      this.currentProcessedData = data;
      if (this.sessionActive) {
        this.sessionManager.addIMUSample(data);
      }
      this.updateUI();
    });

    this.imuProcessor.onMetrics((metrics) => {
      this.metrics.update(metrics);
    });

    // Setup session manager callback
    this.sessionManager.onData((sessionData) => {
      const bias = parseFloat(this.biasInput.value) || 0;
      const motionCorrection = this.motionCorrectionToggle.checked;
      const result = this.calculator.compute(sessionData, bias, motionCorrection);
      this.resultCard.show(result);
    });

    // Initialize UI
    this.initializeUI();
    this.setupEventListeners();
    this.updateUI();
  }

  private initializeUI(): void {
    // Check HTTPS and show warning if needed
    if (!this.sensorManager.isHTTPS()) {
      this.showHTTPSWarning();
    }

    // Get containers
    const controlsContainer = document.getElementById('controls-container')!;
    const metricsContainer = document.getElementById('metrics-container')!;
    const sessionContainer = document.getElementById('session-container')!;
    const resultContainer = document.getElementById('result-container')!;
    const debugContainer = document.getElementById('debug-container')!;

    // Create UI components
    this.controls = new Controls(controlsContainer);
    this.metrics = new Metrics(metricsContainer);
    this.sessionView = new SessionView(sessionContainer);
    this.resultCard = new ResultCard(resultContainer);
    this.debugView = new DebugView(debugContainer);

    // Get input elements
    this.scaleInput = document.getElementById('scale-reading') as HTMLInputElement;
    this.sampleMassInput = document.getElementById('sample-mass') as HTMLInputElement;
    this.biasInput = document.getElementById('bias') as HTMLInputElement;
    this.motionCorrectionToggle = document.getElementById('motion-correction') as HTMLInputElement;
    this.gravityAlphaSlider = document.getElementById('gravity-alpha') as HTMLInputElement;
    this.configPanel = document.getElementById('config-panel')!;

    // Set defaults
    this.scaleInput.value = '0';
    this.sampleMassInput.value = this.config.sample_mass_default.toString();
    this.biasInput.value = '0';
    this.motionCorrectionToggle.checked = true;
    this.gravityAlphaSlider.value = this.config.gravity_filter_alpha.toString();
    this.gravityAlphaSlider.min = '0.90';
    this.gravityAlphaSlider.max = '0.98';
    this.gravityAlphaSlider.step = '0.01';

    // Update gravity alpha display
    const updateAlphaLabel = () => {
      const alpha = parseFloat(this.gravityAlphaSlider.value);
      const label = document.getElementById('gravity-alpha-label')!;
      label.textContent = `Gravity Filter Alpha: ${alpha.toFixed(2)}`;
    };
    updateAlphaLabel(); // Set initial label
    
    this.gravityAlphaSlider.addEventListener('input', () => {
      const alpha = parseFloat(this.gravityAlphaSlider.value);
      this.config.gravity_filter_alpha = alpha;
      this.imuProcessor.updateConfig({ gravity_filter_alpha: alpha });
      updateAlphaLabel();
    });
  }

  private setupEventListeners(): void {
    this.controls.onEnable(() => this.handleEnableSensors());
    this.controls.onStart(() => this.handleStartSensors());
    this.controls.onStop(() => this.handleStopSensors());
    this.controls.onMeasure(() => this.handleStartMeasure());
    this.controls.onStopMeasure(() => this.handleStopMeasure());
    this.controls.onReset(() => this.handleReset());
  }

  private async handleEnableSensors(): Promise<void> {
    const status = await this.sensorManager.requestPermissions();
    if (status === 'granted') {
      this.updateUI();
    } else {
      alert('Sensor permissions denied. Please enable in browser settings.');
    }
  }

  private handleStartSensors(): void {
    const started = this.sensorManager.start((rawData) => {
      this.currentRawData = rawData;
      this.imuProcessor.process(rawData);
      this.debugView.update(rawData, this.currentProcessedData);
    });

    if (started) {
      this.sensorsRunning = true;
      this.updateUI();
    } else {
      alert('Failed to start sensors. Check permissions and device support.');
    }
  }

  private handleStopSensors(): void {
    this.sensorManager.stop();
    this.sensorsRunning = false;
    if (this.sessionActive) {
      this.handleStopMeasure();
    }
    this.updateUI();
  }

  private handleStartMeasure(): void {
    if (!this.sensorsRunning) return;
    this.sessionManager.start();
    this.sessionActive = true;
    this.resultCard.hide();
    this.updateUI();
    this.startSessionUpdateLoop();
  }

  private handleStopMeasure(): void {
    if (!this.sessionActive) return;
    const sessionData = this.sessionManager.stop();
    this.sessionActive = false;
    this.sessionView.update(false, 0, 0, 0);
    this.updateUI();
  }

  private handleReset(): void {
    this.resultCard.hide();
    this.sessionManager.reset();
    this.updateUI();
  }

  private startSessionUpdateLoop(): void {
    const update = () => {
      if (!this.sessionActive) return;
      
      const progress = this.sessionManager.getProgress();
      this.sessionView.update(
        true,
        progress.elapsed,
        progress.sampleCount,
        progress.goodCount,
        10 // target duration
      );
      
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  private getCurrentScaleReading(): number {
    const value = parseFloat(this.scaleInput.value);
    return isNaN(value) ? 0 : value;
  }

  private showHTTPSWarning(): void {
    const warning = document.createElement('div');
    warning.className = 'https-warning';
    warning.innerHTML = `
      <strong>⚠️ HTTP Mode:</strong> Device sensors require HTTPS. 
      Sensors will not work in HTTP mode. 
      Use <code>npm run dev:https</code> for HTTPS or deploy to production.
    `;
    document.body.insertBefore(warning, document.body.firstChild);
  }

  private updateUI(): void {
    const status = this.sensorManager.getStatus();
    this.controls.updateStatus(status, this.sessionActive);
    
    if (!this.sensorsRunning) {
      this.metrics.update(null);
      this.sessionView.update(false, 0, 0, 0);
    } else if (!this.sessionActive) {
      this.sessionView.update(false, 0, 0, 0);
    }
  }
}

