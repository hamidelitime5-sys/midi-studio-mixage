export interface GMInstrument {
  id: number; // 0 to 127
  name: string;
  category: string;
}

export interface DrumKit {
  id: number; // Program number, e.g. 0 = Standard, 8 = Room, etc.
  name: string;
}

export interface MidiNoteEvent {
  time: number; // in seconds
  duration: number; // in seconds
  midi: number; // 0-127 pitch
  name: string; // e.g. "C4"
  velocity: number; // 0-1
  channel: number; // 0-15 (0-indexed)
  trackIndex: number;
}

export interface MidiControlChangeEvent {
  time: number;
  channel: number;
  controller: number; // e.g. 0 (Bank MSB), 32 (Bank LSB), 7 (Volume), 10 (Pan)
  value: number; // 0-127
}

export interface MidiProgramChangeEvent {
  time: number;
  channel: number;
  program: number; // 0-127
  bankMsb?: number;
  bankLsb?: number;
}

export interface KaraokeLyricEvent {
  time: number; // in seconds
  text: string;
  lineIndex: number;
  isLineBreak: boolean;
  isParagraphBreak: boolean;
}

export interface CustomSf2SoundFont {
  fileName: string;
  fileSize?: number;
  bankMsb: number; // e.g. 0 or custom bank
  bankLsb: number;
  presetProgram: number; // 0-127
  presetName: string;
  loadedAt?: string;
  presetsList?: Array<{ program: number; name: string; bank: number }>;
}

export interface MidiChannelConfig {
  channel: number; // 0 to 15
  name: string;
  roleTitle?: string; // e.g. "Pianiste / Claviste", "Bassiste"
  categoryTag?: string; // e.g. "Claviers", "Basse", "Cuivres"
  iconKey?: string; // identifier for color drawing / photo
  customImageUrl?: string; // user custom photo/drawing URL
  program: number; // 0 to 127 (GM instrument or Drum Kit)
  bankMsb: number; // 0 to 127 (or 128 for Drums in SF2)
  bankLsb: number; // 0 to 127
  isDrum: boolean; // true for Channel 10 (index 9)
  volume: number; // 0 to 127 (default ~100)
  pan: number; // 0 to 127 (default 64)
  muted: boolean;
  solo: boolean;
  activeNoteCount: number; // for visual meter
  lastActivityTime: number;
  customSf2?: CustomSf2SoundFont; // Custom personal SF2 assigned to this channel
}

export interface ParsedMidiSong {
  title: string;
  artist?: string;
  duration: number; // total duration in seconds
  bpm: number;
  timeSignature: [number, number];
  tracksCount: number;
  notes: MidiNoteEvent[];
  lyrics: KaraokeLyricEvent[];
  channels: MidiChannelConfig[];
  programChanges: MidiProgramChangeEvent[];
  controlChanges: MidiControlChangeEvent[];
  rawMidiData?: Uint8Array;
}

export interface MidiOutputDevice {
  id: string;
  name: string;
  manufacturer?: string;
  state: string;
}
