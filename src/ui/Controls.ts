import type { SensorStatus } from '../types';
import { i18n } from '../utils/i18n';

export class Controls {
  private container: HTMLElement;
  private enableBtn: HTMLButtonElement;
  private startBtn: HTMLButtonElement;
  private stopBtn: HTMLButtonElement;
  private measureBtn: HTMLButtonElement;
  private stopMeasureBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.updateTexts();
    
    // Listen for language changes
    window.addEventListener('languagechange', () => this.updateTexts());
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="controls-bar">
        <button id="btn-enable" class="btn btn-primary"></button>
        <button id="btn-start" class="btn btn-primary" disabled></button>
        <button id="btn-stop" class="btn btn-secondary" disabled></button>
        <button id="btn-measure" class="btn btn-success" disabled></button>
        <button id="btn-stop-measure" class="btn btn-warning" disabled></button>
        <button id="btn-reset" class="btn btn-secondary"></button>
      </div>
    `;

    this.enableBtn = this.container.querySelector('#btn-enable') as HTMLButtonElement;
    this.startBtn = this.container.querySelector('#btn-start') as HTMLButtonElement;
    this.stopBtn = this.container.querySelector('#btn-stop') as HTMLButtonElement;
    this.measureBtn = this.container.querySelector('#btn-measure') as HTMLButtonElement;
    this.stopMeasureBtn = this.container.querySelector('#btn-stop-measure') as HTMLButtonElement;
    this.resetBtn = this.container.querySelector('#btn-reset') as HTMLButtonElement;
  }

  private updateTexts(): void {
    this.startBtn.textContent = i18n.t('start');
    this.stopBtn.textContent = i18n.t('stop');
    this.measureBtn.textContent = i18n.t('measure');
    this.stopMeasureBtn.textContent = i18n.t('stop');
    this.resetBtn.textContent = i18n.t('reset');
  }

  onEnable(callback: () => void): void {
    this.enableBtn.addEventListener('click', callback);
  }

  onStart(callback: () => void): void {
    this.startBtn.addEventListener('click', callback);
  }

  onStop(callback: () => void): void {
    this.stopBtn.addEventListener('click', callback);
  }

  onMeasure(callback: () => void): void {
    this.measureBtn.addEventListener('click', callback);
  }

  onStopMeasure(callback: () => void): void {
    this.stopMeasureBtn.addEventListener('click', callback);
  }

  onReset(callback: () => void): void {
    this.resetBtn.addEventListener('click', callback);
  }

  updateStatus(status: SensorStatus, sessionActive: boolean, canMeasure: boolean = true): void {
    this.enableBtn.disabled = status.permissionGranted;
    this.startBtn.disabled = !status.permissionGranted || status.sensorsRunning;
    this.stopBtn.disabled = !status.sensorsRunning;
    this.measureBtn.disabled = !canMeasure || sessionActive;
    this.stopMeasureBtn.disabled = !sessionActive;
    
    if (status.permissionGranted) {
      this.enableBtn.textContent = i18n.t('enabled');
      this.enableBtn.classList.add('btn-success');
    } else {
      this.enableBtn.textContent = i18n.t('enable');
      this.enableBtn.classList.remove('btn-success');
    }
  }
}

