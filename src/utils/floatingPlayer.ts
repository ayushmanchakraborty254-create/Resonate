import type { Track } from '../types';

export interface FloatingPlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
}

export interface FloatingPlayerActions {
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
}

class FloatingPlayerManager {
  private pipWindow: any = null;
  private state: FloatingPlayerState = {
    currentTrack: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
  };
  private actions: FloatingPlayerActions | null = null;
  private autoFloatEnabled = true;

  constructor() {
    this.setupVisibilityListener();
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'documentPictureInPicture' in window;
  }

  isOpen(): boolean {
    return this.pipWindow !== null && !this.pipWindow.closed;
  }

  setActions(actions: FloatingPlayerActions) {
    this.actions = actions;
  }

  updateState(state: Partial<FloatingPlayerState>) {
    this.state = { ...this.state, ...state };
    this.render();
  }

  private setupVisibilityListener() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', async () => {
      if (!this.autoFloatEnabled || !this.isSupported()) return;

      if (document.hidden && this.state.isPlaying && this.state.currentTrack) {
        // Tab switched / minimized -> Auto Float
        if (!this.isOpen()) {
          try {
            await this.open();
          } catch (e) {
            console.log('Auto-float prevented by browser policy (requires user gesture):', e);
          }
        }
      } else if (!document.hidden && this.isOpen()) {
        // Returned to tab -> Auto re-dock
        this.close();
      }
    });
  }

  async open(): Promise<boolean> {
    if (!this.isSupported() || !this.state.currentTrack) return false;
    if (this.isOpen()) return true;

    try {
      const pipOptions = {
        width: 380,
        height: 120,
        disallowReturnToOpener: false,
      };

      this.pipWindow = await (window as any).documentPictureInPicture.requestWindow(pipOptions);

      // Inject styling
      const style = this.pipWindow.document.createElement('style');
      style.textContent = `
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body {
          background: #0f0f0f;
          color: #fff;
          height: 100vh;
          display: flex;
          align-items: center;
          padding: 12px 16px;
          user-select: none;
          overflow: hidden;
        }
        .pip-container {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }
        .pip-cover {
          width: 56px;
          height: 56px;
          border-radius: 8px;
          object-fit: cover;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        .pip-info {
          flex: 1;
          min-width: 0;
        }
        .pip-title {
          font-size: 14px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pip-artist {
          font-size: 12px;
          color: #aaa;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pip-progress {
          width: 100%;
          height: 4px;
          background: #333;
          border-radius: 2px;
          margin-top: 8px;
          cursor: pointer;
          position: relative;
        }
        .pip-progress-fill {
          height: 100%;
          background: #ff0000;
          border-radius: 2px;
        }
        .pip-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .pip-btn {
          background: transparent;
          border: none;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          transition: background 0.2s;
        }
        .pip-btn:hover {
          background: rgba(255,255,255,0.1);
        }
        .pip-btn-play {
          background: #fff;
          color: #000;
        }
        .pip-btn-play:hover {
          background: #ddd;
        }
      `;
      this.pipWindow.document.head.appendChild(style);

      this.pipWindow.addEventListener('pagehide', () => {
        this.pipWindow = null;
      });

      this.render();
      return true;
    } catch (err) {
      console.warn('Failed to open Document Picture-in-Picture:', err);
      return false;
    }
  }

  close() {
    if (this.isOpen()) {
      try {
        this.pipWindow.close();
      } catch (_) {}
      this.pipWindow = null;
    }
  }

  toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  private render() {
    if (!this.isOpen() || !this.state.currentTrack) return;

    const doc = this.pipWindow.document;
    const track = this.state.currentTrack;
    const progressPercent = this.state.duration > 0
      ? (this.state.progress / this.state.duration) * 100
      : 0;

    doc.body.innerHTML = `
      <div class="pip-container">
        <img class="pip-cover" src="${track.thumbnailUrl}" alt="" />
        <div class="pip-info">
          <div class="pip-title">${track.title}</div>
          <div class="pip-artist">${track.artist}</div>
          <div class="pip-progress" id="pip-progress-bar">
            <div class="pip-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
        </div>
        <div class="pip-controls">
          <button class="pip-btn" id="pip-prev" title="Previous">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
          </button>
          <button class="pip-btn pip-btn-play" id="pip-play" title="${this.state.isPlaying ? 'Pause' : 'Play'}">
            ${this.state.isPlaying
              ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>'
              : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>'}
          </button>
          <button class="pip-btn" id="pip-next" title="Next">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
          </button>
        </div>
      </div>
    `;

    // Bind actions
    doc.getElementById('pip-play')?.addEventListener('click', () => {
      this.actions?.onTogglePlay();
    });
    doc.getElementById('pip-prev')?.addEventListener('click', () => {
      this.actions?.onPrev();
    });
    doc.getElementById('pip-next')?.addEventListener('click', () => {
      this.actions?.onNext();
    });
    doc.getElementById('pip-progress-bar')?.addEventListener('click', (e: MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      this.actions?.onSeek(Math.floor(ratio * this.state.duration));
    });
  }
}

export const floatingPlayer = new FloatingPlayerManager();

