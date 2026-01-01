export class SessionView {
  private container: HTMLElement;
  private statusEl: HTMLElement;
  private elapsedEl: HTMLElement;
  private progressEl: HTMLElement;
  private qualityEl: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="session-view">
        <h3>Measurement Session</h3>
        <div id="session-status" class="session-status">Ready</div>
        <div class="session-info">
          <div>Elapsed: <span id="session-elapsed">0.0</span>s</div>
          <div>Samples: <span id="session-samples">0</span> (<span id="session-good">0</span> good)</div>
        </div>
        <div class="progress-bar">
          <div id="session-progress" class="progress-fill" style="width: 0%"></div>
        </div>
        <div id="session-quality" class="session-quality">Quality: --</div>
      </div>
    `;

    this.statusEl = this.container.querySelector('#session-status') as HTMLElement;
    this.elapsedEl = this.container.querySelector('#session-elapsed') as HTMLElement;
    this.progressEl = this.container.querySelector('#session-progress') as HTMLElement;
    this.qualityEl = this.container.querySelector('#session-quality') as HTMLElement;
  }

  update(active: boolean, elapsed: number, sampleCount: number, goodCount: number, targetDuration: number = 10): void {
    if (active) {
      this.statusEl.textContent = 'Measuring...';
      this.statusEl.className = 'session-status measuring';
      this.elapsedEl.textContent = elapsed.toFixed(1);
      
      const samplesEl = this.container.querySelector('#session-samples') as HTMLElement;
      const goodEl = this.container.querySelector('#session-good') as HTMLElement;
      if (samplesEl) samplesEl.textContent = sampleCount.toString();
      if (goodEl) goodEl.textContent = goodCount.toString();
      
      const progress = Math.min(100, (elapsed / targetDuration) * 100);
      this.progressEl.style.width = `${progress}%`;
      
      const percentGood = sampleCount > 0 ? (goodCount / sampleCount) * 100 : 0;
      this.qualityEl.textContent = `Quality: ${percentGood.toFixed(1)}% good`;
      
      if (percentGood > 80) {
        this.qualityEl.className = 'session-quality good';
      } else if (percentGood > 50) {
        this.qualityEl.className = 'session-quality moderate';
      } else {
        this.qualityEl.className = 'session-quality poor';
      }
    } else {
      this.statusEl.textContent = 'Ready';
      this.statusEl.className = 'session-status ready';
      this.elapsedEl.textContent = '0.0';
      this.progressEl.style.width = '0%';
      this.qualityEl.textContent = 'Quality: --';
      this.qualityEl.className = 'session-quality';
    }
  }
}

