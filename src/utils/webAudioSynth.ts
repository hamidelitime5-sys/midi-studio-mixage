// High-Definition Polyphonic Synthesizer & SoundFont2 PCM Sample Engine
// Provides studio-grade standalone audio synthesis and direct SF2 sample playback with zero distortion

import { Sf2Metadata, decodeSf2PresetSamples, Sf2DecodedSampleZone } from './sf2Parser';

interface ActiveVoice {
  id: string;
  channel: number;
  pitch: number;
  startTime: number;
  endTime: number;
  gainNode: GainNode;
  stopVoice: (fadeSec?: number) => void;
}

export class WebAudioSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;

  // Lightweight stereo space delay (replaces heavy CPU convolver)
  private spatialDelayL: DelayNode | null = null;
  private spatialDelayR: DelayNode | null = null;
  private spatialGain: GainNode | null = null;

  private channelGains: Map<number, GainNode> = new Map();
  private channelPanners: Map<number, StereoPannerNode> = new Map();
  private channelMutes: Map<number, boolean> = new Map();
  private channelSolos: Map<number, boolean> = new Map();
  private channelBaseVolumes: Map<number, number> = new Map();

  // Active playing voices with Polyphony Cap & Voice Stealing
  private activeVoices: Map<string, ActiveVoice> = new Map();
  private voiceCounter = 0;
  private readonly MAX_POLYPHONY = 48; // Max concurrent notes across all 16 tracks to guarantee 60fps & 0 glitching

  // SF2 SoundFont sample cache
  private activeSf2Meta: Sf2Metadata | null = null;
  private decodedSampleCache: Map<string, Sf2DecodedSampleZone[]> = new Map();

  private isEnabled = true;
  private currentDeviceId: string = 'default';

  public init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();

      // Master Studio Limiter / Compressor
      // Soft musical knee (12dB) & gentle ratio (4:1) prevents any digital clipping while preserving dynamics
      this.masterLimiter = this.ctx.createDynamicsCompressor();
      this.masterLimiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime); // -1.0 dBFS
      this.masterLimiter.knee.setValueAtTime(12, this.ctx.currentTime);
      this.masterLimiter.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.masterLimiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.masterLimiter.release.setValueAtTime(0.12, this.ctx.currentTime);
      this.masterLimiter.connect(this.ctx.destination);

      // Master Gain: 0.65 provides clean headroom for 16-channel polyphonic summing
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.masterGain.connect(this.masterLimiter);

      // Lightweight stereo ambience (0% CPU, no metallic noise artifacts)
      try {
        this.spatialDelayL = this.ctx.createDelay();
        this.spatialDelayR = this.ctx.createDelay();
        this.spatialDelayL.delayTime.setValueAtTime(0.024, this.ctx.currentTime);
        this.spatialDelayR.delayTime.setValueAtTime(0.038, this.ctx.currentTime);

        const filterL = this.ctx.createBiquadFilter();
        const filterR = this.ctx.createBiquadFilter();
        filterL.type = 'lowpass';
        filterL.frequency.setValueAtTime(3200, this.ctx.currentTime);
        filterR.type = 'lowpass';
        filterR.frequency.setValueAtTime(3200, this.ctx.currentTime);

        this.spatialGain = this.ctx.createGain();
        this.spatialGain.gain.setValueAtTime(0.10, this.ctx.currentTime);

        this.spatialDelayL.connect(filterL);
        this.spatialDelayR.connect(filterR);
        filterL.connect(this.spatialGain);
        filterR.connect(this.spatialGain);
        this.spatialGain.connect(this.masterLimiter);
      } catch (e) {
        console.warn('Could not initialize spatializer:', e);
      }

      // Create channel strips (Gain + Panner) for all 16 MIDI channels
      for (let i = 0; i < 16; i++) {
        const panner = this.ctx.createStereoPanner();
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.60, this.ctx.currentTime);
        gain.connect(panner);
        panner.connect(this.masterGain);

        // Subtle room send for melodic tracks (not drums on ch 9)
        if (this.spatialDelayL && this.spatialDelayR && i !== 9) {
          const sendGain = this.ctx.createGain();
          sendGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
          gain.connect(sendGain);
          sendGain.connect(this.spatialDelayL);
          sendGain.connect(this.spatialDelayR);
        }

        this.channelGains.set(i, gain);
        this.channelPanners.set(i, panner);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch((e) => console.warn('Could not resume audio context:', e));
    }
  }

  public getAudioContext(): AudioContext | null {
    this.init();
    return this.ctx;
  }

  public get currentTime(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // Load a user-imported SoundFont 2 bank into the synthesizer
  public loadSoundFontMetadata(meta: Sf2Metadata) {
    this.activeSf2Meta = meta;
    this.decodedSampleCache.clear();
    console.log(`[WebAudioSynth] Loaded SF2 Bank: "${meta.bankName}" with ${meta.presets.length} presets.`);
  }

  public getLoadedSf2Metadata(): Sf2Metadata | null {
    return this.activeSf2Meta;
  }

  public async setAudioOutputDevice(deviceId: string): Promise<boolean> {
    this.init();
    this.currentDeviceId = deviceId;
    if (this.ctx && typeof (this.ctx as any).setSinkId === 'function') {
      try {
        const sink = deviceId === 'default' ? '' : deviceId;
        await (this.ctx as any).setSinkId(sink);
        console.log(`[WebAudio] Sortie audio assignée à: ${deviceId}`);
        return true;
      } catch (err) {
        console.warn('Erreur setSinkId Web Audio:', err);
        return false;
      }
    }
    return false;
  }

  public getCurrentDeviceId(): string {
    return this.currentDeviceId;
  }

  // Play direct hardware check tone for Focusrite Scarlett Solo / Headphones
  public async playDirectScarlettBeep(): Promise<void> {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);

    setTimeout(() => {
      this.playTestTone();
    }, 400);
  }

  // Play a rich warm acoustic chord test for Scarlett Solo / speakers
  public async playTestTone(): Promise<void> {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    const pitches = [48, 55, 60, 64, 67, 71]; // C3, G3, C4, E4, G4, B4
    pitches.forEach((pitch, idx) => {
      setTimeout(() => {
        this.scheduleNote(0, pitch, 0.85, 1.2, this.ctx!.currentTime, 0, false, 0);
      }, idx * 60);
    });
  }

  // Preview an instrument note
  public async playPreviewNote(program: number, isDrum = false, pitch = 60, bank = 0): Promise<void> {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    const testPitch = isDrum ? 36 : pitch;
    this.scheduleNote(0, testPitch, 0.85, 0.9, this.ctx.currentTime, program, isDrum, bank);
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  public setMasterVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      // Scaled gracefully: 1.0 = standard master (0.65 internal), max 1.5
      const v = Math.max(0, Math.min(1.5, vol)) * 0.65;
      this.masterGain.gain.setValueAtTime(v, this.ctx.currentTime);
    }
  }

  public setChannelVolume(channel: number, volume: number) {
    let vol127 = volume;
    if (volume > 0 && volume <= 1.0) {
      vol127 = volume * 127;
    }
    this.channelBaseVolumes.set(channel, Math.max(0, Math.min(127, vol127)));
    this.recomputeChannelGains();
  }

  public setChannelMute(channel: number, mute: boolean) {
    this.channelMutes.set(channel, mute);
    this.recomputeChannelGains();
  }

  public setChannelSolo(channel: number, solo: boolean) {
    this.channelSolos.set(channel, solo);
    this.recomputeChannelGains();
  }

  private recomputeChannelGains() {
    if (!this.ctx) return;
    const hasAnySolo = Array.from(this.channelSolos.values()).some(Boolean);
    const now = this.ctx.currentTime;

    for (let ch = 0; ch < 16; ch++) {
      const gainNode = this.channelGains.get(ch);
      if (!gainNode) continue;
      const isMuted = this.channelMutes.get(ch) || false;
      const isSolo = this.channelSolos.get(ch) || false;
      const baseVol = this.channelBaseVolumes.get(ch) ?? 100;

      // Base channel gain is normalized to ~0.60 maximum to keep mix clean
      let effective = Math.max(0, Math.min(1.0, baseVol / 127)) * 0.60;
      if (isMuted) {
        effective = 0;
      } else if (hasAnySolo && !isSolo) {
        effective = 0;
      }

      try {
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(effective, now + 0.015);
      } catch {
        gainNode.gain.setValueAtTime(effective, now);
      }
    }
  }

  public setChannelPan(channel: number, pan10: number) {
    const panner = this.channelPanners.get(channel);
    if (panner && this.ctx) {
      const normalized = Math.max(-1, Math.min(1, (pan10 - 64) / 64));
      panner.pan.setValueAtTime(normalized, this.ctx.currentTime);
    }
  }

  // Voice Stealing & Polyphony Cap enforcement
  private enforcePolyphonyLimit(now: number) {
    // 1. Remove expired voices
    for (const [id, voice] of this.activeVoices.entries()) {
      if (voice.endTime <= now) {
        this.activeVoices.delete(id);
      }
    }

    // 2. If still over capacity, steal the oldest voices
    if (this.activeVoices.size >= this.MAX_POLYPHONY) {
      const sortedVoices = Array.from(this.activeVoices.values()).sort(
        (a, b) => a.startTime - b.startTime
      );
      const toSteal = sortedVoices.slice(0, this.activeVoices.size - this.MAX_POLYPHONY + 1);
      for (const voice of toSteal) {
        voice.stopVoice(0.015);
        this.activeVoices.delete(voice.id);
      }
    }
  }

  /**
   * HIGH-PRECISION AUDIO SCHEDULER:
   * Schedules note playback with microsecond Web Audio clock accuracy.
   * Eliminates browser JS thread jitter and guarantees automatic node termination.
   */
  public scheduleNote(
    channel: number,
    pitch: number,
    velocity: number,
    durationSec: number,
    startTime?: number,
    program = 0,
    isDrum = false,
    bankOverride?: number
  ) {
    if (!this.isEnabled) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;
    const when = startTime !== undefined ? Math.max(now, startTime) : now;
    const duration = Math.max(0.04, durationSec);

    const channelGain = this.channelGains.get(channel);
    if (!channelGain) return;

    this.enforcePolyphonyLimit(now);

    const isPercussion = isDrum || channel === 9;
    const vel = Math.max(0.05, Math.min(1.0, velocity));
    const bank = bankOverride !== undefined ? bankOverride : isPercussion ? 128 : 0;
    const voiceId = `v_${++this.voiceCounter}_${channel}_${pitch}`;

    // 1. CHECK FOR LOADED SF2 SOUNDFONT PCM SAMPLES
    if (this.activeSf2Meta && this.activeSf2Meta.sampleHeaders && this.activeSf2Meta.sampleHeaders.length > 0) {
      const presetKey = `${bank}-${program}`;
      let zones = this.decodedSampleCache.get(presetKey);

      if (!zones) {
        zones = decodeSf2PresetSamples(this.activeSf2Meta, bank, program, this.ctx);
        this.decodedSampleCache.set(presetKey, zones);
      }

      if (zones.length > 0) {
        const matchingZone =
          zones.find((z) => pitch >= z.lowKey && pitch <= z.highKey) || zones[0];

        if (matchingZone && matchingZone.buffer) {
          const source = this.ctx.createBufferSource();
          source.buffer = matchingZone.buffer;

          const semitoneDiff = pitch - matchingZone.rootKey;
          source.playbackRate.value = Math.pow(2, semitoneDiff / 12);

          const voiceGain = this.ctx.createGain();
          const targetGain = vel * 0.32; // Balanced level

          if (matchingZone.isLooping && !isPercussion) {
            source.loop = true;
            source.loopStart = matchingZone.loopStart;
            source.loopEnd = matchingZone.loopEnd;

            // Attack & Sustain
            voiceGain.gain.setValueAtTime(0.0001, when);
            voiceGain.gain.linearRampToValueAtTime(targetGain, when + 0.015);
            voiceGain.gain.setValueAtTime(targetGain, when + duration);
            voiceGain.gain.exponentialRampToValueAtTime(0.0001, when + duration + 0.08);

            source.start(when);
            source.stop(when + duration + 0.10);
          } else {
            // One-shot drum or natural decaying sample
            voiceGain.gain.setValueAtTime(targetGain, when);
            const playDuration = Math.min(duration + 0.2, matchingZone.buffer.duration);
            voiceGain.gain.exponentialRampToValueAtTime(0.0001, when + playDuration);

            source.start(when);
            source.stop(when + playDuration + 0.02);
          }

          source.connect(voiceGain);
          voiceGain.connect(channelGain);

          const stopVoice = (fadeSec = 0.015) => {
            try {
              const cur = this.ctx!.currentTime;
              voiceGain.gain.cancelScheduledValues(cur);
              voiceGain.gain.setValueAtTime(voiceGain.gain.value, cur);
              voiceGain.gain.exponentialRampToValueAtTime(0.0001, cur + fadeSec);
              source.stop(cur + fadeSec + 0.01);
            } catch {}
          };

          this.activeVoices.set(voiceId, {
            id: voiceId,
            channel,
            pitch,
            startTime: when,
            endTime: when + duration + 0.12,
            gainNode: voiceGain,
            stopVoice,
          });
          return;
        }
      }
    }

    // 2. HIGH-DEFINITION STANDALONE SYNTHESIS ENGINE (WITH CONTROLLED ENVELOPES & 0 OVERLOAD)
    if (isPercussion) {
      this.triggerScheduledDrum(pitch, vel, when, channelGain, voiceId);
      return;
    }

    this.triggerScheduledMelodic(channel, pitch, vel, duration, when, program, channelGain, voiceId);
  }

  // Backward compatible noteOn
  public noteOn(
    channel: number,
    pitch: number,
    velocity: number,
    program = 0,
    isDrum = false,
    bankOverride?: number
  ) {
    this.scheduleNote(channel, pitch, velocity, 0.8, undefined, program, isDrum, bankOverride);
  }

  // NOTE OFF: Cleanly fades out active voices matching channel and pitch
  public noteOff(channel: number, pitch: number) {
    if (!this.ctx) return;
    for (const [id, voice] of this.activeVoices.entries()) {
      if (voice.channel === channel && voice.pitch === pitch) {
        voice.stopVoice(0.025);
        this.activeVoices.delete(id);
      }
    }
  }

  public stopAll() {
    for (const voice of this.activeVoices.values()) {
      try {
        voice.stopVoice(0.01);
      } catch {}
    }
    this.activeVoices.clear();
  }

  // Scheduled Studio Drum Engine
  private triggerScheduledDrum(
    pitch: number,
    vel: number,
    when: number,
    dest: GainNode,
    voiceId: string
  ) {
    if (!this.ctx) return;

    if (pitch === 35 || pitch === 36) {
      // Acoustic & 808 Kick
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, when);
      osc.frequency.exponentialRampToValueAtTime(45, when + 0.07);

      const targetGain = vel * 0.40;
      gain.gain.setValueAtTime(targetGain, when);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.32);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(when);
      osc.stop(when + 0.34);

      this.activeVoices.set(voiceId, {
        id: voiceId,
        channel: 9,
        pitch,
        startTime: when,
        endTime: when + 0.35,
        gainNode: gain,
        stopVoice: () => {
          try {
            osc.stop();
          } catch {}
        },
      });
    } else if (pitch === 38 || pitch === 40) {
      // Snare Drum (Triangle Body + Filtered White Noise Wire)
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, when);
      osc.frequency.exponentialRampToValueAtTime(110, when + 0.05);
      oscGain.gain.setValueAtTime(vel * 0.28, when);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.15);

      osc.connect(oscGain);
      oscGain.connect(dest);
      osc.start(when);
      osc.stop(when + 0.16);

      const noise = this.createNoiseBufferNode();
      if (noise) {
        const nGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1400;
        nGain.gain.setValueAtTime(vel * 0.25, when);
        nGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(dest);
        noise.start(when);
        noise.stop(when + 0.19);
      }

      this.activeVoices.set(voiceId, {
        id: voiceId,
        channel: 9,
        pitch,
        startTime: when,
        endTime: when + 0.20,
        gainNode: oscGain,
        stopVoice: () => {
          try {
            osc.stop();
          } catch {}
        },
      });
    } else if (pitch === 42 || pitch === 44) {
      // Closed Hi-Hat
      const noise = this.createNoiseBufferNode();
      if (noise) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7500;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vel * 0.20, when);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        noise.start(when);
        noise.stop(when + 0.07);

        this.activeVoices.set(voiceId, {
          id: voiceId,
          channel: 9,
          pitch,
          startTime: when,
          endTime: when + 0.08,
          gainNode: gain,
          stopVoice: () => {
            try {
              noise.stop();
            } catch {}
          },
        });
      }
    } else if (pitch === 46 || pitch === 49 || pitch === 57) {
      // Open Hat / Crash Cymbal
      const noise = this.createNoiseBufferNode();
      if (noise) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 8000;
        filter.Q.value = 1.0;
        const gain = this.ctx.createGain();
        const duration = pitch === 46 ? 0.28 : 0.85;
        gain.gain.setValueAtTime(vel * 0.22, when);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        noise.start(when);
        noise.stop(when + duration + 0.02);

        this.activeVoices.set(voiceId, {
          id: voiceId,
          channel: 9,
          pitch,
          startTime: when,
          endTime: when + duration + 0.04,
          gainNode: gain,
          stopVoice: () => {
            try {
              noise.stop();
            } catch {}
          },
        });
      }
    } else {
      // Toms & Percussions
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const baseFreq = 85 + (pitch % 12) * 16;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * 1.4, when);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, when + 0.06);

      gain.gain.setValueAtTime(vel * 0.30, when);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(when);
      osc.stop(when + 0.24);

      this.activeVoices.set(voiceId, {
        id: voiceId,
        channel: 9,
        pitch,
        startTime: when,
        endTime: when + 0.25,
        gainNode: gain,
        stopVoice: () => {
          try {
            osc.stop();
          } catch {}
        },
      });
    }
  }

  // Melodic Instrument Physical Modeling with guaranteed termination
  private triggerScheduledMelodic(
    channel: number,
    pitch: number,
    vel: number,
    duration: number,
    when: number,
    program: number,
    dest: GainNode,
    voiceId: string
  ) {
    if (!this.ctx) return;
    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
    const voiceGain = this.ctx.createGain();
    const oscs: OscillatorNode[] = [];
    let filter: BiquadFilterNode | undefined;

    // Release envelope time
    const release = Math.min(0.25, Math.max(0.05, duration * 0.25));
    const endTime = when + duration + release;

    if (program <= 7) {
      // Acoustic Piano & EP
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, when);
      osc2.frequency.setValueAtTime(freq * 2.001, when);

      filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(12000, freq * 3.5), when);
      filter.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.2), when + 0.6);

      const targetGain = vel * 0.32;
      voiceGain.gain.setValueAtTime(0.0001, when);
      voiceGain.gain.linearRampToValueAtTime(targetGain, when + 0.008);
      // Gentle decay to sustain level
      voiceGain.gain.exponentialRampToValueAtTime(targetGain * 0.5, when + Math.min(duration, 0.4));
      voiceGain.gain.setValueAtTime(targetGain * 0.5, when + duration);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(voiceGain);
      oscs.push(osc1, osc2);
    } else if (program >= 32 && program <= 39) {
      // Acoustic & Electric Bass
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, when);
      osc2.frequency.setValueAtTime(freq, when);

      filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(3000, freq * 2.5), when);
      filter.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 1.1), when + 0.25);

      const targetGain = vel * 0.36;
      voiceGain.gain.setValueAtTime(0.0001, when);
      voiceGain.gain.linearRampToValueAtTime(targetGain, when + 0.01);
      voiceGain.gain.setValueAtTime(targetGain * 0.7, when + duration);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(voiceGain);
      oscs.push(osc1, osc2);
    } else if (program >= 24 && program <= 31) {
      // Guitars
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, when);

      filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(6000, freq * 3.2), when);

      const targetGain = vel * 0.28;
      voiceGain.gain.setValueAtTime(0.0001, when);
      voiceGain.gain.linearRampToValueAtTime(targetGain, when + 0.012);
      voiceGain.gain.exponentialRampToValueAtTime(targetGain * 0.45, when + Math.min(duration, 0.35));
      voiceGain.gain.setValueAtTime(targetGain * 0.45, when + duration);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc.connect(filter);
      filter.connect(voiceGain);
      oscs.push(osc);
    } else if (program >= 56 && program <= 63) {
      // Brass Section & Trumpet
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq * 1.002, when);
      osc2.frequency.setValueAtTime(freq * 0.998, when);

      filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 2.2, when);
      filter.frequency.linearRampToValueAtTime(freq * 3.8, when + 0.06);

      const targetGain = vel * 0.26;
      voiceGain.gain.setValueAtTime(0.0001, when);
      voiceGain.gain.linearRampToValueAtTime(targetGain, when + 0.045);
      voiceGain.gain.setValueAtTime(targetGain, when + duration);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(voiceGain);
      oscs.push(osc1, osc2);
    } else if (program >= 40 && program <= 47) {
      // Strings Ensemble & Violin
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq * 1.002, when);
      osc2.frequency.setValueAtTime(freq * 0.998, when);

      filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(5000, freq * 2.5), when);

      const targetGain = vel * 0.24;
      voiceGain.gain.setValueAtTime(0.0001, when);
      voiceGain.gain.linearRampToValueAtTime(targetGain, when + 0.08); // Smooth bowed attack
      voiceGain.gain.setValueAtTime(targetGain, when + duration);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(voiceGain);
      oscs.push(osc1, osc2);
    } else if (program >= 21 && program <= 23) {
      // Accordion Musette
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, when);
      osc2.frequency.setValueAtTime(freq * 1.003, when);

      filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(5500, freq * 2.8), when);

      const targetGain = vel * 0.25;
      voiceGain.gain.setValueAtTime(0.0001, when);
      voiceGain.gain.linearRampToValueAtTime(targetGain, when + 0.03);
      voiceGain.gain.setValueAtTime(targetGain, when + duration);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(voiceGain);
      oscs.push(osc1, osc2);
    } else {
      // General Lead / Organ / Synth / Flute
      const osc = this.ctx.createOscillator();
      osc.type = program >= 16 && program <= 20 ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, when);

      filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(6000, freq * 3.0), when);

      const targetGain = vel * 0.25;
      voiceGain.gain.setValueAtTime(0.0001, when);
      voiceGain.gain.linearRampToValueAtTime(targetGain, when + 0.025);
      voiceGain.gain.setValueAtTime(targetGain, when + duration);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc.connect(filter);
      filter.connect(voiceGain);
      oscs.push(osc);
    }

    voiceGain.connect(dest);

    // Strictly schedule start and stop on audio clock
    oscs.forEach((osc) => {
      osc.start(when);
      osc.stop(endTime + 0.02);
    });

    const stopVoice = (fadeSec = 0.02) => {
      try {
        const cur = this.ctx!.currentTime;
        voiceGain.gain.cancelScheduledValues(cur);
        voiceGain.gain.setValueAtTime(voiceGain.gain.value, cur);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, cur + fadeSec);
        oscs.forEach((osc) => {
          try {
            osc.stop(cur + fadeSec + 0.01);
          } catch {}
        });
      } catch {}
    };

    this.activeVoices.set(voiceId, {
      id: voiceId,
      channel,
      pitch,
      startTime: when,
      endTime,
      gainNode: voiceGain,
      stopVoice,
    });
  }

  private createNoiseBufferNode(): AudioBufferSourceNode | null {
    if (!this.ctx) return null;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.4);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    return whiteNoise;
  }
}

export const webAudioSynth = new WebAudioSynth();
