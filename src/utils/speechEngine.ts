export class MedicalAudioSynthesizer {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play tap interaction beep
  playBeep() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch {
      // Audio context restricted
    }
  }

  // Play heart beat beep for vitals monitor
  playHeartbeat() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {
      // Audio context might be restricted
    }
  }

  // Play emergency red-flag alert strobe sound
  playRedFlagAlarm() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(440, this.ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.32);
    } catch {
      // Audio context restricted
    }
  }

  // Play pleasant chime on AI question or verification complete
  playConfirmChime() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.15, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.26);
      });
    } catch {
      // Audio context restricted
    }
  }
}

export const audioSynth = new MedicalAudioSynthesizer();

// Text-to-speech in Indian languages / dialects using browser Web Speech
export function speakLocalText(text: string, language: string = 'Hindi') {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  utterance.pitch = 1.0;

  // Language mapping
  const langMap: Record<string, string> = {
    Hindi: 'hi-IN',
    Bhojpuri: 'hi-IN',
    Awadhi: 'hi-IN',
    Braj: 'hi-IN',
    Haryanvi: 'hi-IN',
    Bengali: 'bn-IN',
    Marathi: 'mr-IN',
    Tamil: 'ta-IN',
    Telugu: 'te-IN',
    Gujarati: 'gu-IN',
    Punjabi: 'pa-IN',
    Kannada: 'kn-IN',
    Malayalam: 'ml-IN',
    Odia: 'or-IN',
    English: 'en-IN',
  };

  utterance.lang = langMap[language] || 'hi-IN';

  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find((v) => v.lang.startsWith(utterance.lang.slice(0, 2)));
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  window.speechSynthesis.speak(utterance);
}

// Robust wrapper with optional onEnd callback
export function speakTextNative(
  text: string,
  language: string = 'Hindi',
  onEnd?: () => void
) {
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  utterance.pitch = 1.0;

  const langMap: Record<string, string> = {
    Hindi: 'hi-IN',
    Bhojpuri: 'hi-IN',
    Awadhi: 'hi-IN',
    Braj: 'hi-IN',
    Haryanvi: 'hi-IN',
    Bengali: 'bn-IN',
    Marathi: 'mr-IN',
    Tamil: 'ta-IN',
    Telugu: 'te-IN',
    Gujarati: 'gu-IN',
    Punjabi: 'pa-IN',
    Kannada: 'kn-IN',
    Malayalam: 'ml-IN',
    Odia: 'or-IN',
    English: 'en-IN',
  };

  utterance.lang = langMap[language] || 'hi-IN';

  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find((v) => v.lang.startsWith(utterance.lang.slice(0, 2)));
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  utterance.onend = () => {
    if (onEnd) onEnd();
  };
  utterance.onerror = () => {
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
}

export interface SpeechRecognizerOptions {
  language: string;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: any) => void;
  onEnd?: () => void;
}

export function startSpeechRecognizer(options: SpeechRecognizerOptions): { stop: () => void } | null {
  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRec) {
    return null;
  }

  const langMap: Record<string, string> = {
    Hindi: 'hi-IN',
    Bhojpuri: 'hi-IN',
    Awadhi: 'hi-IN',
    Braj: 'hi-IN',
    Haryanvi: 'hi-IN',
    Bengali: 'bn-IN',
    Marathi: 'mr-IN',
    Tamil: 'ta-IN',
    Telugu: 'te-IN',
    Gujarati: 'gu-IN',
    Punjabi: 'pa-IN',
    Kannada: 'kn-IN',
    Malayalam: 'ml-IN',
    Odia: 'or-IN',
    English: 'en-IN',
  };

  try {
    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = langMap[options.language] || 'hi-IN';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      const text = finalTranscript || interimTranscript;
      options.onResult(text, Boolean(finalTranscript));
    };

    recognition.onerror = (event: any) => {
      if (options.onError) options.onError(event);
    };

    recognition.onend = () => {
      if (options.onEnd) options.onEnd();
    };

    recognition.start();
    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      },
    };
  } catch (err) {
    if (options.onError) options.onError(err);
    return null;
  }
}
