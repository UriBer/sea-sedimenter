import type { RawSensorData, ProcessedIMUData } from '../types';

export class DebugView {
  private container: HTMLElement;
  private expanded = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="debug-view">
        <button id="debug-toggle" class="btn btn-secondary">Show Debug</button>
        <div id="debug-content" class="debug-content" style="display: none;">
          <h4>Raw Sensor Data</h4>
          <div id="debug-raw" class="debug-section">--</div>
          <h4>Processed IMU Data</h4>
          <div id="debug-processed" class="debug-section">--</div>
        </div>
      </div>
    `;

    const toggle = this.container.querySelector('#debug-toggle') as HTMLButtonElement;
    toggle.addEventListener('click', () => {
      this.expanded = !this.expanded;
      const content = this.container.querySelector('#debug-content') as HTMLElement;
      content.style.display = this.expanded ? 'block' : 'none';
      toggle.textContent = this.expanded ? 'Hide Debug' : 'Show Debug';
    });
  }

  update(rawData: RawSensorData | null, processedData: ProcessedIMUData | null): void {
    const rawEl = this.container.querySelector('#debug-raw') as HTMLElement;
    const processedEl = this.container.querySelector('#debug-processed') as HTMLElement;

    if (rawData) {
      rawEl.innerHTML = `
        <pre>${JSON.stringify({
          accelerationIncludingGravity: rawData.accelerationIncludingGravity,
          rotationRate: rawData.rotationRate,
          interval: rawData.interval,
          timestamp: new Date(rawData.timestamp).toISOString(),
        }, null, 2)}</pre>
      `;
    } else {
      rawEl.textContent = '--';
    }

    if (processedData) {
      processedEl.innerHTML = `
        <pre>${JSON.stringify({
          a_z: processedData.a_z.toFixed(4),
          roll: processedData.roll.toFixed(2),
          pitch: processedData.pitch.toFixed(2),
          g_est: {
            x: processedData.g_est.x.toFixed(4),
            y: processedData.g_est.y.toFixed(4),
            z: processedData.g_est.z.toFixed(4),
          },
          g_unit: {
            x: processedData.g_unit.x.toFixed(4),
            y: processedData.g_unit.y.toFixed(4),
            z: processedData.g_unit.z.toFixed(4),
          },
          a_lin: {
            x: processedData.a_lin.x.toFixed(4),
            y: processedData.a_lin.y.toFixed(4),
            z: processedData.a_lin.z.toFixed(4),
          },
          timestamp: new Date(processedData.timestamp).toISOString(),
        }, null, 2)}</pre>
      `;
    } else {
      processedEl.textContent = '--';
    }
  }
}

