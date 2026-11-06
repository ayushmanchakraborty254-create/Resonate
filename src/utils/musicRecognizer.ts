export interface RecognizedTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  thumbnailUrl: string;
  releaseDate?: string;
  recognizedAt: number;
}

export class MusicRecognizer {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private volumeInterval: any = null;
  private peakVolume = 0;
  private volumeSamples: number[] = [];

  /**
   * Start listening via microphone with real-time volume / silence monitoring
   */
  async startListening(onVolumeUpdate?: (volume: number) => void): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone access is not supported in this browser.');
    }

    this.audioChunks = [];
    this.peakVolume = 0;
    this.volumeSamples = [];

    this.audioStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true,
      }
    });

    // Setup Web Audio Analyser to measure true acoustic levels
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      this.volumeInterval = setInterval(() => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

        // Calculate Root-Mean-Square (RMS) amplitude
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += (dataArray[i] / 255) * (dataArray[i] / 255);
        }
        const rms = Math.sqrt(sum / dataArray.length);
        this.volumeSamples.push(rms);
        if (rms > this.peakVolume) {
          this.peakVolume = rms;
        }

        if (onVolumeUpdate) {
          onVolumeUpdate(Math.min(1, rms * 3));
        }
      }, 50);
    } catch (e) {
      console.warn('AudioContext volume monitoring setup failed:', e);
    }

    this.mediaRecorder = new MediaRecorder(this.audioStream);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.audioChunks.push(e.data);
      }
    };

    this.mediaRecorder.start(1000);
  }

  /**
   * Captures an in-flight snapshot blob of audio recorded so far without stopping
   */
  async requestSnapshot(): Promise<Blob | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') return null;
    return new Promise((resolve) => {
      const onData = (e: BlobEvent) => {
        if (e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
        resolve(new Blob(this.audioChunks, { type: 'audio/webm' }));
      };
      this.mediaRecorder!.addEventListener('dataavailable', onData, { once: true });
      try {
        this.mediaRecorder!.requestData();
      } catch (_) {
        resolve(null);
      }
    });
  }

  /**
   * Tests recognition on an in-flight snapshot (returns null instead of throwing)
   */
  async testSnapshotRecognize(snapshotBlob: Blob): Promise<RecognizedTrack | null> {
    try {
      const match = await this.queryRecognitionEngine(snapshotBlob);
      return match;
    } catch (_) {
      return null;
    }
  }

  /**
   * Stop listening and identify the audio
   */
  async stopAndRecognize(): Promise<RecognizedTrack> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        // Clean up intervals and streams
        if (this.volumeInterval) {
          clearInterval(this.volumeInterval);
          this.volumeInterval = null;
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
          try {
            await this.audioContext.close();
          } catch (_) {}
          this.audioContext = null;
        }
        this.audioStream?.getTracks().forEach((track) => track.stop());
        this.audioStream = null;

        // 1. STRICT SILENCE CHECK:
        // Calculate average volume during recording session
        const avgVolume = this.volumeSamples.length > 0
          ? this.volumeSamples.reduce((a, b) => a + b, 0) / this.volumeSamples.length
          : 0;

        console.log(`Audio session metrics: Peak=${this.peakVolume.toFixed(4)}, Avg=${avgVolume.toFixed(4)}`);

        // If total audio is essentially silence or barely microphone noise (less than threshold)
        if (this.peakVolume < 0.018 && avgVolume < 0.01) {
          reject(new Error('No music detected. Please make sure music is playing clearly near your microphone and try again.'));
          return;
        }

        try {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          const track = await this.queryRecognitionEngine(audioBlob);
          this.saveToHistory(track);
          resolve(track);
        } catch (err) {
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Cancel ongoing listening session
   */
  cancel() {
    if (this.volumeInterval) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (_) {}
      this.audioContext = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (_) {}
    }
    this.audioStream?.getTracks().forEach((track) => track.stop());
    this.audioStream = null;
    this.audioChunks = [];
  }

  /**
   * Query AudD, Shazam, or Acoustic analysis engine
   */
  private async queryRecognitionEngine(audioBlob: Blob): Promise<RecognizedTrack> {
    const userAuddKey = localStorage.getItem('resonate_audd_api_key');
    const auddToken = userAuddKey || 'test';

    // 1. Query AudD Music Recognition API (supports webm/wav/mp3)
    try {
      const formData = new FormData();
      formData.append('file', audioBlob);
      formData.append('api_token', auddToken);
      formData.append('return', 'apple_music,spotify');

      const res = await fetch('https://api.audd.io/', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.result) {
          return {
            id: `audd-${Date.now()}`,
            title: data.result.title,
            artist: data.result.artist,
            album: data.result.album || data.result.title,
            thumbnailUrl:
              data.result.spotify?.album?.images?.[0]?.url ||
              data.result.apple_music?.artwork?.url?.replace('{w}x{h}', '400x400') ||
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
            releaseDate: data.result.release_date,
            recognizedAt: Date.now(),
          };
        } else if (data.status === 'error') {
          console.warn('AudD API returned error:', data.error);
          if (data.error?.error_code === 901) {
            throw new Error('AudD token limit reached. Please add your free personal AudD API key in settings (gear icon).');
          }
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('AudD token limit')) {
        throw err;
      }
      console.warn('AudD recognition query failed:', err);
    }

    // 2. Query RapidAPI Shazam Core if configured
    const rapidKey = localStorage.getItem('resonate_rapidapi_key');
    if (rapidKey) {
      try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'sample.wav');

        const res = await fetch('https://shazam-core.p.rapidapi.com/v1/tracks/recognize', {
          method: 'POST',
          headers: {
            'X-RapidAPI-Key': rapidKey,
            'X-RapidAPI-Host': 'shazam-core.p.rapidapi.com',
          },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.track) {
            return {
              id: data.track.key || `rec-${Date.now()}`,
              title: data.track.title || 'Unknown Title',
              artist: data.track.subtitle || 'Unknown Artist',
              album: data.track.sections?.[0]?.metadata?.[0]?.text || data.track.title,
              thumbnailUrl: data.track.images?.coverart || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
              recognizedAt: Date.now(),
            };
          }
        }
      } catch (e) {
        console.warn('RapidAPI Shazam request failed:', e);
      }
    }

    // No fake/dummy fallback: report exact failure so user knows real status
    throw new Error('Music could not be identified from this sample. Please make sure the music is playing loud and clearly, or add an AudD / RapidAPI key in Settings.');
  }

  /**
   * Save recognized track to local history
   */
  saveToHistory(track: RecognizedTrack) {
    try {
      const history = this.getHistory();
      const updated = [track, ...history.filter((t) => t.title !== track.title)].slice(0, 50);
      localStorage.setItem('resonate_recognition_history', JSON.stringify(updated));
    } catch (_) {}
  }

  /**
   * Retrieve recognition history
   */
  getHistory(): RecognizedTrack[] {
    try {
      const saved = localStorage.getItem('resonate_recognition_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear recognition history
   */
  clearHistory() {
    localStorage.removeItem('resonate_recognition_history');
  }
}

export const musicRecognizer = new MusicRecognizer();
