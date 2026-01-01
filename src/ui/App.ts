import { SensorManager } from '../sensor/SensorManager';
import { IMUProcessor } from '../sensor/IMUProcessor';
import { ManualSessionManager } from '../session/ManualSessionManager';
import { SessionCalculator } from '../measurement/SessionCalculator';
import { RatioCalculator } from '../measurement/RatioCalculator';
import { Controls } from './Controls';
import { Metrics } from './Metrics';
import { SessionView } from './SessionView';
import { ResultCard } from './ResultCard';
import { History } from './History';
import { LanguageSelector } from './LanguageSelector';
import { Help } from './Help';
import { SessionPanel } from './SessionPanel';
import { HistoryStorage } from '../utils/storage';
import { i18n } from '../utils/i18n';
import { DEFAULT_CONFIG } from '../utils/config';
import type { Config, SessionResult } from '../types';

export class App {
  private sensorManager: SensorManager;
  private imuProcessor: IMUProcessor;
  private baseSessionManager: ManualSessionManager;
  private finalSessionManager: ManualSessionManager;
  private sessionCalculator: SessionCalculator;
  private ratioCalculator: RatioCalculator;
  private config: Config;

  // UI Components
  private controls!: Controls;
  private metrics!: Metrics;
  private sessionView!: SessionView;
  private resultCard!: ResultCard;
  private history!: History;
  private basePanel!: SessionPanel;
  private finalPanel!: SessionPanel;

  // State
  private sensorsRunning = false;
  private baseSessionResult: SessionResult | null = null;
  private finalSessionResult: SessionResult | null = null;

  // Input elements
  private batchNumberInput!: HTMLInputElement;
  private computeResultBtn!: HTMLButtonElement;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    
    // Initialize managers
    this.sensorManager = new SensorManager();
    this.imuProcessor = new IMUProcessor(this.config);
    this.baseSessionManager = new ManualSessionManager('base');
    this.finalSessionManager = new ManualSessionManager('final');
    this.sessionCalculator = new SessionCalculator(0.10);
    this.ratioCalculator = new RatioCalculator();

    // Setup IMU processor callbacks (optional, for quality guidance)
    this.imuProcessor.onProcessed(() => {
      this.updateUI();
    });

    this.imuProcessor.onMetrics((metrics) => {
      this.metrics.update(metrics);
    });

    // Initialize UI
    this.initializeUI();
    this.setupEventListeners();
    this.updateUI();
    this.updateUITexts();
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
    const baseContainer = document.getElementById('base-session-container')!;
    const finalContainer = document.getElementById('final-session-container')!;

    // Create UI components
    new LanguageSelector(languageContainer);
    new Help(helpContainer);
    this.controls = new Controls(controlsContainer);
    this.metrics = new Metrics(metricsContainer);
    this.sessionView = new SessionView(sessionContainer);
    this.resultCard = new ResultCard(resultContainer);
    this.history = new History(historyContainer);
    this.basePanel = new SessionPanel(baseContainer, 'base');
    this.finalPanel = new SessionPanel(finalContainer, 'final');

    // Listen for language changes
    window.addEventListener('languagechange', () => {
      this.updateUITexts();
    });

    // Get input elements
    this.batchNumberInput = document.getElementById('batch-number') as HTMLInputElement;

    // Set defaults
    this.batchNumberInput.value = HistoryStorage.getNextBatchNumber();

    // Setup batch number reset button
    const resetBatchBtn = document.getElementById('btn-reset-batch') as HTMLButtonElement;
    if (resetBatchBtn) {
      resetBatchBtn.title = i18n.t('resetToAuto');
      resetBatchBtn.addEventListener('click', () => {
        this.batchNumberInput.value = HistoryStorage.getNextBatchNumber();
        this.batchNumberInput.focus();
      });
    }

    // Setup base panel callbacks
    this.setupSessionPanelCallbacks(this.basePanel, this.baseSessionManager, 'base');
    
    // Setup final panel callbacks
    this.setupSessionPanelCallbacks(this.finalPanel, this.finalSessionManager, 'final');

    // Add compute result button
    this.addComputeResultButton();

    // Initialize history
    this.history.refresh();
  }

  private setupSessionPanelCallbacks(
    panel: SessionPanel,
    manager: ManualSessionManager,
    kind: 'base' | 'final'
  ): void {
    // Use tare callback
    panel.onUseTare(() => {
      // Tare is locked per session
      this.updateUI();
    });

    // Start session callback
    panel.onStartSession(() => {
      const tareEstimate = panel.getLockedTareEstimate() || {
        count: 0,
        biasMedian: 0,
        tareUncertainty95: 0,
        tareSigma: 0,
        method: 'userEntered' as const,
      };

      manager.startSession(tareEstimate.biasMedian, tareEstimate.tareUncertainty95);
      panel.startSession(tareEstimate.biasMedian, tareEstimate.tareUncertainty95);
      this.updateUI();
    });

    // Stop session callback
    panel.onStopSession(() => {
      const measurements = manager.stopSession();
      panel.stopSession();

      if (measurements.length === 0) {
        alert(i18n.t('noMeasurementsToCalculate'));
        if (kind === 'base') {
          this.baseSessionResult = null;
        } else {
          this.finalSessionResult = null;
        }
        this.updateUI();
        return;
      }

      // Calculate session result
      const result = this.sessionCalculator.compute(measurements);
      panel.setSessionResult(result);

      if (kind === 'base') {
        this.baseSessionResult = result;
      } else {
        this.finalSessionResult = result;
      }

      this.updateUI();
      this.tryComputeRatio();
    });

    // Add measurement callback
    panel.onAddMeasurement(() => {
      const scaleReading = panel.getCurrentScaleReading();
      if (scaleReading <= 0) {
        alert(i18n.t('invalidScaleReading'));
        return;
      }

      try {
        manager.addMeasurement(scaleReading);
        const measurements = manager.getMeasurements();
        const lastMeasurement = measurements[measurements.length - 1];
        if (lastMeasurement) {
          panel.addMeasurement(lastMeasurement);
        }
        panel.clearScaleInput();
        this.updateUI();
      } catch (error) {
        console.error('Error adding measurement:', error);
        alert(error instanceof Error ? error.message : 'Failed to add measurement');
      }
    });

    // Remove measurement callback
    panel.onRemoveMeasurement((index) => {
      manager.removeMeasurement(index);
      this.updateUI();
    });
  }

  private addComputeResultButton(): void {
    const controlsContainer = document.getElementById('controls-container');
    if (!controlsContainer) return;

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'compute-result-container';
    buttonContainer.innerHTML = `
      <button id="btn-compute-result" class="btn btn-success" disabled>${i18n.t('computeResult')}</button>
      <button id="btn-reset-all" class="btn btn-secondary">${i18n.t('reset')}</button>
    `;
    controlsContainer.appendChild(buttonContainer);

    this.computeResultBtn = document.getElementById('btn-compute-result') as HTMLButtonElement;
    const resetBtn = document.getElementById('btn-reset-all') as HTMLButtonElement;

    if (this.computeResultBtn) {
      this.computeResultBtn.addEventListener('click', () => {
        this.tryComputeRatio();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.handleReset();
      });
    }
  }

  private tryComputeRatio(): void {
    if (!this.baseSessionResult || !this.finalSessionResult) {
      return;
    }

    if (this.baseSessionResult.fixedValue <= 0) {
      alert(i18n.t('baseValueMustBePositive'));
      return;
    }

    const ratioResult = this.ratioCalculator.compute(this.baseSessionResult, this.finalSessionResult);
    this.resultCard.showRatio(ratioResult);

    // Save to history
    const batchNumber = this.batchNumberInput.value.trim() || HistoryStorage.getNextBatchNumber();
    HistoryStorage.save({
      batchNumber,
      result: {
        fixedMeasurement: ratioResult.percent,
        confidence: Math.min(ratioResult.Wbase.confidence, ratioResult.Wfinal.confidence),
        errorBand: ratioResult.errorBand95Percent,
        relativeError: ratioResult.relativeErrorPercent95,
        isReliable: ratioResult.Wbase.confidence > 0.5 && ratioResult.Wfinal.confidence > 0.5,
        diagnostics: {
          nTotal: ratioResult.nEff,
          nGood: ratioResult.nEff,
          percentGood: 100,
          sessionRMS_az: 0,
          sessionRMS_roll: 0,
          sessionRMS_pitch: 0,
          sigma_motion: 0,
          sigma_scale: ratioResult.sigmaRatio1Sigma,
          sigma_total: ratioResult.sigmaRatio1Sigma,
        },
      },
      scaleReading: ratioResult.Wfinal.fixedValue,
      bias: 0,
      motionCorrectionEnabled: false,
    });
    this.history.refresh();

    // Auto-increment batch number
    if (this.batchNumberInput.value.trim()) {
      this.batchNumberInput.value = HistoryStorage.incrementBatchNumber(this.batchNumberInput.value);
    } else {
      this.batchNumberInput.value = HistoryStorage.getNextBatchNumber();
    }
  }

  private setupEventListeners(): void {
    // Optional IMU controls (for quality guidance)
    this.controls.onEnable(() => this.handleEnableSensors());
    this.controls.onStart(() => this.handleStartSensors());
    this.controls.onStop(() => this.handleStopSensors());
  }

  private async handleEnableSensors(): Promise<void> {
    const status = await this.sensorManager.requestPermissions();
    if (status === 'granted') {
      this.updateUI();
    } else {
      alert(i18n.t('sensorPermissionsDenied'));
    }
  }

  private handleStartSensors(): void {
    const started = this.sensorManager.start((rawData) => {
      this.imuProcessor.process(rawData);
    });

    if (started) {
      this.sensorsRunning = true;
      this.updateUI();
    } else {
      alert(i18n.t('failedToStartSensors'));
    }
  }

  private handleStopSensors(): void {
    this.sensorManager.stop();
    this.sensorsRunning = false;
    this.updateUI();
  }

  private handleReset(): void {
    this.resultCard.hide();
    this.baseSessionManager.clear();
    this.finalSessionManager.clear();
    this.baseSessionResult = null;
    this.finalSessionResult = null;
    this.basePanel.setSessionResult(null);
    this.finalPanel.setSessionResult(null);
    this.updateUI();
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

    // Update batch label
    const batchLabel = document.querySelector('label[for="batch-number"]');
    if (batchLabel) batchLabel.textContent = i18n.t('batchNumber');
    
    const batchInput = document.getElementById('batch-number') as HTMLInputElement;
    if (batchInput) {
      batchInput.placeholder = i18n.t('autoGenerated');
    }
    const resetBatchBtn = document.getElementById('btn-reset-batch');
    if (resetBatchBtn) {
      resetBatchBtn.title = i18n.t('resetToAuto');
    }
  }

  private updateUI(): void {
    const status = this.sensorManager.getStatus();
    this.controls.updateStatus(status, false, false, false);
    
    // Update compute result button
    if (this.computeResultBtn) {
      this.computeResultBtn.disabled = !(this.baseSessionResult && this.finalSessionResult);
    }
    
    if (!this.sensorsRunning) {
      this.metrics.update(null);
      this.sessionView.update(false, 0, 0, 0);
    }
  }
}
