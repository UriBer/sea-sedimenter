import type { SensorStatus } from '../types';

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
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="controls-bar">
        <button id="btn-enable" class="btn btn-primary">Enable Sensors</button>
        <button id="btn-start" class="btn btn-primary" disabled>Start Sensors</button>
        <button id="btn-stop" class="btn btn-secondary" disabled>Stop Sensors</button>
        <button id="btn-measure" class="btn btn-success" disabled>MEASURE</button>
        <button id="btn-stop-measure" class="btn btn-warning" disabled>STOP MEASURING</button>
        <button id="btn-reset" class="btn btn-secondary">Reset</button>
      </div>
    `;

    this.enableBtn = this.container.querySelector('#btn-enable') as HTMLButtonElement;
    this.startBtn = this.container.querySelector('#btn-start') as HTMLButtonElement;
    this.stopBtn = this.container.querySelector('#btn-stop') as HTMLButtonElement;
    this.measureBtn = this.container.querySelector('#btn-measure') as HTMLButtonElement;
    this.stopMeasureBtn = this.container.querySelector('#btn-stop-measure') as HTMLButtonElement;
    this.resetBtn = this.container.querySelector('#btn-reset') as HTMLButtonElement;
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

  updateStatus(status: SensorStatus, sessionActive: boolean): void {
    this.enableBtn.disabled = status.permissionGranted;
    this.startBtn.disabled = !status.permissionGranted || status.sensorsRunning;
    this.stopBtn.disabled = !status.sensorsRunning;
    this.measureBtn.disabled = !status.sensorsRunning || sessionActive;
    this.stopMeasureBtn.disabled = !sessionActive;
    
    if (status.permissionGranted) {
      this.enableBtn.textContent = 'Sensors Enabled';
      this.enableBtn.classList.add('btn-success');
    } else {
      this.enableBtn.textContent = 'Enable Sensors';
      this.enableBtn.classList.remove('btn-success');
    }
  }
}

