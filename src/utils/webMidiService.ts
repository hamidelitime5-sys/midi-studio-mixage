import { MidiOutputDevice, MidiChannelConfig } from '../types/midi';

export class WebMidiService {
  private midiAccess: any = null;
  private selectedOutputId: string | null = null;
  private onDevicesChangeCallbacks: Array<(devices: MidiOutputDevice[]) => void> = [];
  private hasSysex = false;

  constructor() {
    this.selectedOutputId = localStorage.getItem('midi_karaoke_selected_output') || null;
  }

  public async initialize(): Promise<{ supported: boolean; error?: string }> {
    if (typeof navigator === 'undefined' || !(navigator as any).requestMIDIAccess) {
      return { supported: false, error: 'Web MIDI API is not supported in this browser. Please use Chrome, Edge, or Opera.' };
    }

    try {
      try {
        // First try with sysex support for GM reset commands
        this.midiAccess = await (navigator as any).requestMIDIAccess({ sysex: true });
        this.hasSysex = true;
      } catch {
        // Fallback without sysex
        this.midiAccess = await (navigator as any).requestMIDIAccess({ sysex: false });
        this.hasSysex = false;
      }

      if (this.midiAccess) {
        this.midiAccess.onstatechange = () => {
          this.notifyDevicesChanged();
        };
      }

      // If stored output is still available, select it; otherwise pick first available
      const devices = this.getOutputDevices();
      if (devices.length > 0) {
        const match = devices.find((d) => d.id === this.selectedOutputId);
        if (!match) {
          this.selectedOutputId = devices[0].id;
          localStorage.setItem('midi_karaoke_selected_output', this.selectedOutputId);
        }
      }

      return { supported: true };
    } catch (err: any) {
      return { supported: false, error: err?.message || 'Access to MIDI devices was denied or unavailable' };
    }
  }

  public getOutputDevices(): MidiOutputDevice[] {
    if (!this.midiAccess) return [];
    const devices: MidiOutputDevice[] = [];
    const outputs = this.midiAccess.outputs.values();
    for (const output of outputs) {
      devices.push({
        id: output.id,
        name: output.name || `MIDI Output (${output.id})`,
        manufacturer: output.manufacturer || undefined,
        state: output.state || 'connected',
      });
    }
    return devices;
  }

  public getSelectedOutput(): any {
    if (!this.midiAccess) return null;
    if (this.selectedOutputId) {
      const output = this.midiAccess.outputs.get(this.selectedOutputId);
      if (output) return output;
    }
    // Fallback to first available output
    const first = this.midiAccess.outputs.values().next().value;
    return first || null;
  }

  public selectOutput(deviceId: string) {
    this.selectedOutputId = deviceId;
    localStorage.setItem('midi_karaoke_selected_output', deviceId);
  }

  public onDevicesChanged(cb: (devices: MidiOutputDevice[]) => void) {
    this.onDevicesChangeCallbacks.push(cb);
    // Initial call
    cb(this.getOutputDevices());
  }

  private notifyDevicesChanged() {
    const devices = this.getOutputDevices();
    this.onDevicesChangeCallbacks.forEach((cb) => cb(devices));
  }

  /**
   * CRITICAL FOR SYNTHFONT2 / SF2 SOUNDFONTS:
   * Sends Bank Select MSB (CC 0), Bank Select LSB (CC 32), and Program Change
   * in the exact required order so SynthFont2 switches presets flawlessly.
   */
  public sendProgramChange(
    channel: number,
    program: number,
    bankMsb = 0,
    bankLsb = 0
  ) {
    const output = this.getSelectedOutput();
    if (!output) return;

    const ch = channel & 0x0f; // 0-15
    const cleanProg = Math.max(0, Math.min(127, Math.round(program)));
    const cleanMsb = Math.max(0, Math.min(128, Math.round(bankMsb))); // 128 allowed for SF2 Drum bank
    const cleanLsb = Math.max(0, Math.min(127, Math.round(bankLsb)));

    try {
      // 1. Bank Select MSB (CC 0)
      output.send([0xb0 | ch, 0, cleanMsb]);
      // 2. Bank Select LSB (CC 32)
      output.send([0xb0 | ch, 32, cleanLsb]);
      // 3. Program Change
      output.send([0xc0 | ch, cleanProg]);
    } catch (e) {
      console.warn('[WebMidi] Error sending Program Change:', e);
    }
  }

  public sendControlChange(channel: number, controller: number, value: number) {
    const output = this.getSelectedOutput();
    if (!output) return;
    const ch = channel & 0x0f;
    const cc = controller & 0x7f;
    const val = Math.max(0, Math.min(127, Math.round(value)));
    try {
      output.send([0xb0 | ch, cc, val]);
    } catch (e) {
      console.warn('[WebMidi] Error sending CC:', e);
    }
  }

  public sendVolume(channel: number, volume: number) {
    this.sendControlChange(channel, 7, volume);
  }

  public sendPan(channel: number, pan: number) {
    this.sendControlChange(channel, 10, pan);
  }

  public sendMasterVolume(volume0to127: number) {
    const output = this.getSelectedOutput();
    if (!output) return;
    const vol = Math.max(0, Math.min(127, Math.round(volume0to127)));
    try {
      if (this.hasSysex) {
        // Universal Real Time SysEx Master Volume: F0 7F 7F 04 01 ll mm F7
        output.send([0xf0, 0x7f, 0x7f, 0x04, 0x01, 0, vol, 0xf7]);
      }
    } catch (e) {
      console.warn('[WebMidi] sendMasterVolume error:', e);
    }
  }

  public sendMute(channel: number, muted: boolean, restoreVolume = 100) {
    if (muted) {
      this.allNotesOff(channel);
      this.sendControlChange(channel, 7, 0);
    } else {
      const vol = Math.max(0, Math.min(127, Math.round(restoreVolume)));
      this.sendControlChange(channel, 7, vol);
    }
  }

  public sendNoteOn(channel: number, midiPitch: number, velocity: number) {
    const output = this.getSelectedOutput();
    if (!output) return;
    const ch = channel & 0x0f;
    const note = Math.max(0, Math.min(127, Math.round(midiPitch)));
    const vel = Math.max(0, Math.min(127, Math.round(velocity * 127)));
    try {
      output.send([0x90 | ch, note, vel]);
    } catch (e) {
      console.warn('[WebMidi] Error sending Note On:', e);
    }
  }

  public sendNoteOff(channel: number, midiPitch: number) {
    const output = this.getSelectedOutput();
    if (!output) return;
    const ch = channel & 0x0f;
    const note = Math.max(0, Math.min(127, Math.round(midiPitch)));
    try {
      output.send([0x80 | ch, note, 0]);
    } catch (e) {
      console.warn('[WebMidi] Error sending Note Off:', e);
    }
  }

  public sendPitchBend(channel: number, lsb = 0, msb = 64) {
    const output = this.getSelectedOutput();
    if (!output) return;
    const ch = channel & 0x0f;
    try {
      output.send([0xe0 | ch, lsb & 0x7f, msb & 0x7f]);
    } catch (e) {
      console.warn('[WebMidi] Error sending Pitch Bend:', e);
    }
  }

  /**
   * Reset All Controllers & Turn All Notes Off across channels
   */
  public allNotesOff(channel?: number) {
    const output = this.getSelectedOutput();
    if (!output) return;

    const channels = channel !== undefined ? [channel] : Array.from({ length: 16 }, (_, i) => i);

    for (const ch of channels) {
      try {
        // Sustain off
        output.send([0xb0 | ch, 64, 0]);
        // All Notes Off
        output.send([0xb0 | ch, 123, 0]);
        // All Sound Off
        output.send([0xb0 | ch, 120, 0]);
        // Reset All Controllers
        output.send([0xb0 | ch, 121, 0]);
        // Pitch Bend Center
        output.send([0xe0 | ch, 0, 64]);
      } catch (e) {
        // Ignore individual channel send errors
      }
    }
  }

  /**
   * General MIDI System Reset SysEx (Initializes SynthFont2 / GS / XG)
   */
  public sendGmReset() {
    this.allNotesOff();
    const output = this.getSelectedOutput();
    if (!output || !this.hasSysex) return;

    try {
      // GM1 System On SysEx
      output.send([0xf0, 0x7e, 0x7f, 0x09, 0x01, 0xf7]);
      // GS Reset
      output.send([0xf0, 0x41, 0x10, 0x42, 0x12, 0x40, 0x00, 0x7f, 0x00, 0x41, 0xf7]);
    } catch (e) {
      console.warn('[WebMidi] Sysex not supported or failed:', e);
    }
  }

  /**
   * State Chase: Transmits the current Bank, Program Change, Volume, and Pan
   * for all active channels so SynthFont2 is 100% in sync upon Play / Seek.
   */
  public chaseState(channels: MidiChannelConfig[]) {
    this.allNotesOff();
    for (const config of channels) {
      const ch = config.channel;
      // 1. Program & Bank
      this.sendProgramChange(ch, config.program, config.bankMsb, config.bankLsb);
      // 2. Volume (CC 7)
      this.sendControlChange(ch, 7, config.volume);
      // 3. Pan (CC 10)
      this.sendControlChange(ch, 10, config.pan);
      // 4. Expression (CC 11)
      this.sendControlChange(ch, 11, 127);
    }
  }

  /**
   * Audition test note to check sound from SynthFont2
   */
  public testAudition(channel: number, pitch = 60, durationMs = 600) {
    this.sendNoteOn(channel, pitch, 0.85);
    setTimeout(() => {
      this.sendNoteOff(channel, pitch);
    }, durationMs);
  }
}

export const webMidi = new WebMidiService();
