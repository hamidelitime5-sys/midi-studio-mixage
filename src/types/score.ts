import { ParsedMidiSong } from './midi';

export type ScoreType = 'chordpro' | 'pdf' | 'image';

export interface ScoreItem {
  id: string;
  title: string;
  artist?: string;
  type: ScoreType;
  content: string; // Text for chordpro; Data URL / Blob URL for PDF & Image
  fileName: string;
  fileSize: number;
  dateAdded: number;
  originalKey?: string;
  currentTranspose?: number; // Semitones offset (-12 to +12)
  bpm?: number;
  notes?: string;
  tags?: string[];
  midiSongId?: string; // Optional linkage to a loaded MIDI song (e.g. demo song id)
  midiFileName?: string; // Attached MIDI file name
  parsedMidi?: ParsedMidiSong; // Attached parsed MIDI file data ready for playback
}

export interface Setlist {
  id: string;
  name: string;
  scoreIds: string[];
  createdAt: number;
}

