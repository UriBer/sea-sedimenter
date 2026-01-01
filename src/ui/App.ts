import { SensorManager } from '../sensor/SensorManager';
import { IMUProcessor } from '../sensor/IMUProcessor';
import { SessionManager } from '../session/SessionManager';
import { MeasurementCalculator } from '../measurement/MeasurementCalculator';
import { Controls } from './Controls';
import { Metrics } from './Metrics';
import { SessionView } from './SessionView';
import { ResultCard } from './ResultCard';
import { History } from './History';
import { LanguageSelector } from './LanguageSelector';
import { Help } from './Help';
import { HistoryStorage } from '../utils/storage';
import { i18n } from '../utils/i18n';
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
  private history: History;
  private languageSelector: LanguageSelector;
  private help: Help;

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
  private batchNumberInput: HTMLInputElement;

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
      this.resultCard.setMotionCorrection(motionCorrection);
      this.resultCard.show(result);
      
      // Save to history if reliable
      if (result.isReliable) {
        const batchNumber = this.batchNumberInput.value.trim() || HistoryStorage.getNextBatchNumber();
        HistoryStorage.save({
          batchNumber,
          result,
          scaleReading: this.getCurrentScaleReading(),
          bias,
          motionCorrectionEnabled: motionCorrection,
        });
        this.history.refresh();
        // Auto-increment batch number for next measurement
        // If user entered a manual number, try to increment it; otherwise use auto-generated
        if (this.batchNumberInput.value.trim()) {
          this.batchNumberInput.value = HistoryStorage.incrementBatchNumber(this.batchNumberInput.value);
        } else {
          this.batchNumberInput.value = HistoryStorage.getNextBatchNumber();
        }
      }
    });

    // Initialize UI
    this.initializeUI();
    this.setupEventListeners();
    this.updateUI();
    this.updateUITexts(); // Initialize translated texts
  }

  private initializeUI(): void {
    // Check HTTPS and show warning if needed
    if (!this.sensorManager.isHTTPS()) {
      this.showHTTPSWarning();
    }

    // Get containers
    const languageContainer = document.getElementById('language-container')!;
    const helpContainer = document.getElementById('help-container')!;
    const controlsContainer = document.getElementById('controls-container')!;
    const metricsContainer = document.getElementById('metrics-container')!;
    const sessionContainer = document.getElementById('session-container')!;
    const resultContainer = document.getElementById('result-container')!;
    const historyContainer = document.getElementById('history-container')!;

    // Create UI components
    this.languageSelector = new LanguageSelector(languageContainer);
    this.help = new Help(helpContainer);
    this.controls = new Controls(controlsContainer);
    this.metrics = new Metrics(metricsContainer);
    this.sessionView = new SessionView(sessionContainer);
    this.resultCard = new ResultCard(resultContainer);
    this.history = new History(historyContainer);

    // Listen for language changes to update UI
    window.addEventListener('languagechange', () => {
      this.updateUITexts();
    });

    // Get input elements
    this.scaleInput = document.getElementById('scale-reading') as HTMLInputElement;
    this.sampleMassInput = document.getElementById('sample-mass') as HTMLInputElement;
    this.biasInput = document.getElementById('bias') as HTMLInputElement;
    this.motionCorrectionToggle = document.getElementById('motion-correction') as HTMLInputElement;
    this.batchNumberInput = document.getElementById('batch-number') as HTMLInputElement;

    // Set defaults
    this.scaleInput.value = '0';
    this.sampleMassInput.value = this.config.sample_mass_default.toString();
    this.biasInput.value = '0';
    this.motionCorrectionToggle.checked = true;
    this.batchNumberInput.value = HistoryStorage.getNextBatchNumber();

    // Setup batch number reset button
    const resetBatchBtn = document.getElementById('btn-reset-batch') as HTMLButtonElement;
    if (resetBatchBtn) {
      resetBatchBtn.title = i18n.t('resetToAuto');
      resetBatchBtn.addEventListener('click', () => {
        this.batchNumberInput.value = HistoryStorage.getNextBatchNumber();
        this.batchNumberInput.focus();
      });
      // Update button title on language change
      window.addEventListener('languagechange', () => {
        resetBatchBtn.title = i18n.t('resetToAuto');
      });
    }

    // Initialize history
    this.history.refresh();
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
    const motionCorrectionEnabled = this.motionCorrectionToggle?.checked ?? true;
    // If motion correction is enabled, we need sensors running
    if (motionCorrectionEnabled && !this.sensorsRunning) return;
    
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

  private updateUITexts(): void {
    // Update header
    const header = document.querySelector('.app-header h1');
    const subtitle = document.querySelector('.app-header .subtitle');
    if (header) header.textContent = i18n.t('appName');
    if (subtitle) subtitle.textContent = i18n.t('subtitle');

    // Update input section title
    const inputTitle = document.getElementById('input-section-title');
    if (inputTitle) inputTitle.textContent = i18n.t('measurementInput');

    // Update input labels
    const batchLabel = document.querySelector('label[for="batch-number"]');
    const scaleLabel = document.querySelector('label[for="scale-reading"]');
    const sampleMassLabel = document.querySelector('label[for="sample-mass"]');
    const biasLabel = document.querySelector('label[for="bias"]');
    const motionLabel = document.querySelector('label[for="motion-correction"]');
    const batchInput = document.getElementById('batch-number') as HTMLInputElement;
    
    if (batchLabel) batchLabel.textContent = i18n.t('batchNumber');
    if (scaleLabel) scaleLabel.textContent = i18n.t('scaleReading');
    if (sampleMassLabel) sampleMassLabel.textContent = i18n.t('baseSampleWeight');
    if (biasLabel) biasLabel.textContent = i18n.t('biasTare');
    if (batchInput) {
      batchInput.placeholder = i18n.t('autoGenerated');
    }
    const resetBatchBtn = document.getElementById('btn-reset-batch');
    if (resetBatchBtn) {
      resetBatchBtn.title = i18n.t('resetToAuto');
    }
    if (motionLabel) {
      const checkbox = document.getElementById('motion-correction') as HTMLInputElement;
      const isChecked = checkbox?.checked || false;
      motionLabel.innerHTML = `<input type="checkbox" id="motion-correction" ${isChecked ? 'checked' : ''}> ${i18n.t('motionCorrection')}`;
      // Re-attach event listener if needed
      const newCheckbox = document.getElementById('motion-correction') as HTMLInputElement;
      if (newCheckbox && this.motionCorrectionToggle) {
        newCheckbox.checked = isChecked;
      }
    }
  }

  private updateUI(): void {
    const status = this.sensorManager.getStatus();
    // Allow MEASURE button when motion correction is disabled, even without sensors
    const motionCorrectionEnabled = this.motionCorrectionToggle?.checked ?? true;
    const canMeasure = status.sensorsRunning || !motionCorrectionEnabled;
    this.controls.updateStatus(status, this.sessionActive, canMeasure);
    
    if (!this.sensorsRunning) {
      this.metrics.update(null);
      this.sessionView.update(false, 0, 0, 0);
    } else if (!this.sessionActive) {
      this.sessionView.update(false, 0, 0, 0);
    }
  }
}

