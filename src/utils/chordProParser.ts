export interface ChordProLineSegment {
  chord?: string;
  text: string;
}

export interface ChordProLine {
  type: 'directive' | 'lyric' | 'comment' | 'empty' | 'chorus-start' | 'chorus-end';
  directiveKey?: string;
  directiveVal?: string;
  segments?: ChordProLineSegment[];
  raw?: string;
}

export interface ParsedChordPro {
  title: string;
  artist?: string;
  key?: string;
  tempo?: number;
  lines: ChordProLine[];
  metadata: Record<string, string>;
}

const CHROMATIC_SCALE_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC_SCALE_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_INDEX: Record<string, number> = {
  C: 0,
  'B#': 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  'E#': 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

/**
 * Transpose a single note name by `semitones`
 */
export function transposeNote(note: string, semitones: number, preferFlat = false): string {
  if (semitones === 0) return note;
  const idx = NOTE_INDEX[note];
  if (idx === undefined) return note;

  let newIdx = (idx + semitones) % 12;
  if (newIdx < 0) newIdx += 12;

  return preferFlat ? CHROMATIC_SCALE_FLAT[newIdx] : CHROMATIC_SCALE_SHARP[newIdx];
}

/**
 * Transpose a chord string like "Am7", "F#m", "D/F#", "Bbmaj7" by `semitones`
 */
export function transposeChord(chord: string, semitones: number): string {
  if (!chord || semitones === 0) return chord;

  // Handle slash chords like D/F#
  if (chord.includes('/')) {
    const parts = chord.split('/');
    return `${transposeChord(parts[0], semitones)}/${transposeChord(parts[1], semitones)}`;
  }

  // Regex to extract root note (e.g. C#, Bb, F) and chord quality (e.g. m7, maj7, dim, 7sus4)
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord;

  const root = match[1];
  const suffix = match[2];
  const isFlatOriginal = root.includes('b');
  const newRoot = transposeNote(root, semitones, isFlatOriginal);

  return `${newRoot}${suffix}`;
}

/**
 * Parse raw ChordPro text into structured lines and segments
 */
export function parseChordPro(chordProText: string): ParsedChordPro {
  const rawLines = chordProText.split(/\r?\n/);

  let title = 'Untitled Score';
  let artist = '';
  let key = '';
  let tempo: number | undefined;
  const metadata: Record<string, string> = {};
  const lines: ChordProLine[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i].trim();

    if (!raw) {
      lines.push({ type: 'empty' });
      continue;
    }

    // Check for directive: {key: value} or {key}
    const directiveMatch = raw.match(/^\{([a-zA-Z0-9_-]+)(?::\s*(.*))?\}$/);
    if (directiveMatch) {
      const dKey = directiveMatch[1].toLowerCase();
      const dVal = (directiveMatch[2] || '').trim();

      if (dKey === 'title' || dKey === 't') {
        title = dVal;
        metadata['title'] = dVal;
      } else if (dKey === 'subtitle' || dKey === 'st' || dKey === 'artist') {
        artist = dVal;
        metadata['artist'] = dVal;
      } else if (dKey === 'key') {
        key = dVal;
        metadata['key'] = dVal;
      } else if (dKey === 'tempo' || dKey === 'bpm') {
        const parsed = parseInt(dVal, 10);
        if (!isNaN(parsed)) tempo = parsed;
        metadata['tempo'] = dVal;
      } else if (dKey === 'comment' || dKey === 'c') {
        lines.push({ type: 'comment', directiveVal: dVal });
        continue;
      } else if (dKey === 'soc' || dKey === 'start_of_chorus') {
        lines.push({ type: 'chorus-start' });
        continue;
      } else if (dKey === 'eoc' || dKey === 'end_of_chorus') {
        lines.push({ type: 'chorus-end' });
        continue;
      } else {
        metadata[dKey] = dVal;
      }

      lines.push({ type: 'directive', directiveKey: dKey, directiveVal: dVal });
      continue;
    }

    // Otherwise, it's a lyrics line potentially containing [Chords]
    // Parse bracketed chords
    const segments: ChordProLineSegment[] = [];
    const regex = /\[([A-G][^\]]*)\]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    let pendingChord: string | undefined = undefined;

    while ((match = regex.exec(raw)) !== null) {
      const textBefore = raw.substring(lastIndex, match.index);
      if (textBefore.length > 0 || pendingChord !== undefined) {
        segments.push({
          chord: pendingChord,
          text: textBefore,
        });
        pendingChord = undefined;
      }

      pendingChord = match[1];
      lastIndex = regex.lastIndex;
    }

    // Remaining text after last chord
    const remainingText = raw.substring(lastIndex);
    if (remainingText.length > 0 || pendingChord !== undefined) {
      segments.push({
        chord: pendingChord,
        text: remainingText,
      });
    }

    lines.push({
      type: 'lyric',
      segments: segments.length > 0 ? segments : [{ text: raw }],
      raw,
    });
  }

  return {
    title,
    artist,
    key,
    tempo,
    lines,
    metadata,
  };
}
