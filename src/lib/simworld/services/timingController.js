function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function nextFrame() {
  if (typeof window !== "undefined" && window.requestAnimationFrame) {
    return new Promise((resolve) => window.requestAnimationFrame(resolve));
  }
  return new Promise((resolve) => setTimeout(() => resolve(now()), 16));
}

function assertNotAborted(signal) {
  if (signal?.aborted) {
    throw new Error("Operation cancelled.");
  }
}

export class TimingController {
  constructor() {
    this.paused = false;
    this.speed = 1;
  }

  setPaused(nextPaused) {
    this.paused = Boolean(nextPaused);
  }

  setSpeed(multiplier) {
    this.speed = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  }

  async wait(durationMs, options = {}) {
    const duration = Math.max(0, durationMs);
    let elapsed = 0;
    let last = now();

    while (elapsed < duration) {
      assertNotAborted(options.signal);
      const current = await nextFrame();
      const delta = Math.max(0, current - last);
      last = current;

      if (this.paused) {
        continue;
      }

      elapsed += delta * this.speed;
      if (typeof options.onTick === "function") {
        options.onTick(Math.min(1, elapsed / duration));
      }
    }
  }

  async tween({ from, to, durationMs, signal, onUpdate }) {
    const start = { x: from.x, y: from.y };
    const end = { x: to.x, y: to.y };

    await this.wait(durationMs, {
      signal,
      onTick: (progress) => {
        const position = {
          x: start.x + (end.x - start.x) * progress,
          y: start.y + (end.y - start.y) * progress,
        };
        onUpdate?.(position, progress);
      },
    });

    onUpdate?.({ x: end.x, y: end.y }, 1);
  }
}
