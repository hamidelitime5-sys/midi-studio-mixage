// Preset map and definitions for E-KETRON-SD2-SBA-1.0.7b_2.sf2
// The acclaimed Ketron SD2 sound engine soundfont by SBA
// Featuring authentic Italian accordions, live guitars, saxophones, solo brass, live strings,
// live basses, and complete Western & Oriental / Arabian percussion kits.

export interface KetronPresetItem {
  name: string;
  program: number;
  bank: number;
  category: string;
  isDrum?: boolean;
}

export const KETRON_SD2_PRESETS: KetronPresetItem[] = [
  // ==========================================
  // BANK 0: KETRON SD2 GM / CORE REAL VOICES
  // ==========================================
  // Pianos
  { name: 'Grand Piano SD2', program: 0, bank: 0, category: 'Piano' },
  { name: 'Bright Piano Ketron', program: 1, bank: 0, category: 'Piano' },
  { name: 'Electric Grand SD2', program: 2, bank: 0, category: 'Piano' },
  { name: 'Honky Tonk Ketron', program: 3, bank: 0, category: 'Piano' },
  { name: 'Rhodes EP1 SD2', program: 4, bank: 0, category: 'Piano' },
  { name: 'FM E-Piano 2', program: 5, bank: 0, category: 'Piano' },
  { name: 'Harpsichord SD2', program: 6, bank: 0, category: 'Piano' },
  { name: 'Clavinet SD2 Live', program: 7, bank: 0, category: 'Piano' },

  // Chromatic Percussion
  { name: 'Celesta SD2', program: 8, bank: 0, category: 'Chromatic Percussion' },
  { name: 'Glockenspiel', program: 9, bank: 0, category: 'Chromatic Percussion' },
  { name: 'Music Box SD2', program: 10, bank: 0, category: 'Chromatic Percussion' },
  { name: 'Vibraphone Ketron', program: 11, bank: 0, category: 'Chromatic Percussion' },
  { name: 'Marimba SD2', program: 12, bank: 0, category: 'Chromatic Percussion' },
  { name: 'Xylophone SD2', program: 13, bank: 0, category: 'Chromatic Percussion' },
  { name: 'Tubular Bells', program: 14, bank: 0, category: 'Chromatic Percussion' },
  { name: 'Dulcimer Santur', program: 15, bank: 0, category: 'Chromatic Percussion' },

  // Organs & Accordions (Ketron Speciality!)
  { name: 'Drawbar Jazz Organ', program: 16, bank: 0, category: 'Organ' },
  { name: 'Percussive B3 Organ', program: 17, bank: 0, category: 'Organ' },
  { name: 'Rock Rotary Organ', program: 18, bank: 0, category: 'Organ' },
  { name: 'Church Cathedral Organ', program: 19, bank: 0, category: 'Organ' },
  { name: 'Reed Harmonium', program: 20, bank: 0, category: 'Organ' },
  { name: 'Accordion Musette Ketron', program: 21, bank: 0, category: 'Organ' },
  { name: 'Harmonica Blues SD2', program: 22, bank: 0, category: 'Organ' },
  { name: 'Tango Accordion Bandoneon', program: 23, bank: 0, category: 'Organ' },

  // Guitars (Ketron Live Guitars!)
  { name: 'Acoustic Folk Steel SD2', program: 24, bank: 0, category: 'Guitar' },
  { name: 'Acoustic Nylon Spanish', program: 25, bank: 0, category: 'Guitar' },
  { name: 'Jazz Hollowbody SD2', program: 26, bank: 0, category: 'Guitar' },
  { name: 'Clean Stratocaster SD2', program: 27, bank: 0, category: 'Guitar' },
  { name: 'Muted Funk Guitar', program: 28, bank: 0, category: 'Guitar' },
  { name: 'Overdrive Solo Guitar', program: 29, bank: 0, category: 'Guitar' },
  { name: 'Distortion Rock Guitar', program: 30, bank: 0, category: 'Guitar' },
  { name: 'Guitar Harmonics SD2', program: 31, bank: 0, category: 'Guitar' },

  // Basses (Ketron Deep Punch Basses)
  { name: 'Acoustic Upright Bass SD2', program: 32, bank: 0, category: 'Bass' },
  { name: 'Fingered Jazz Bass SD2', program: 33, bank: 0, category: 'Bass' },
  { name: 'Pick Rock Bass SD2', program: 34, bank: 0, category: 'Bass' },
  { name: 'Fretless Jaco Bass', program: 35, bank: 0, category: 'Bass' },
  { name: 'Slap Bass Funk 1', program: 36, bank: 0, category: 'Bass' },
  { name: 'Slap Bass Pop 2', program: 37, bank: 0, category: 'Bass' },
  { name: 'Synth Bass SD2 Moog', program: 38, bank: 0, category: 'Bass' },
  { name: 'Synth Bass Sub Low', program: 39, bank: 0, category: 'Bass' },

  // Solo Strings
  { name: 'Solo Violin Live SD2', program: 40, bank: 0, category: 'Strings' },
  { name: 'Solo Viola Warm', program: 41, bank: 0, category: 'Strings' },
  { name: 'Solo Cello Ketron', program: 42, bank: 0, category: 'Strings' },
  { name: 'Contrabass Bowed', program: 43, bank: 0, category: 'Strings' },
  { name: 'Tremolo Strings SD2', program: 44, bank: 0, category: 'Strings' },
  { name: 'Pizzicato Strings Ketron', program: 45, bank: 0, category: 'Strings' },
  { name: 'Orchestral Harp SD2', program: 46, bank: 0, category: 'Strings' },
  { name: 'Timpani Concert', program: 47, bank: 0, category: 'Strings' },

  // Ensemble
  { name: 'Ketron Live Strings 1', program: 48, bank: 0, category: 'Ensemble' },
  { name: 'Slow Warm Strings SD2', program: 49, bank: 0, category: 'Ensemble' },
  { name: 'Synth Strings Analog', program: 50, bank: 0, category: 'Ensemble' },
  { name: 'Synth Strings 2 Fast', program: 51, bank: 0, category: 'Ensemble' },
  { name: 'Choir Aahs SD2', program: 52, bank: 0, category: 'Ensemble' },
  { name: 'Voice Oohs Natural', program: 53, bank: 0, category: 'Ensemble' },
  { name: 'Synth Voice Pad', program: 54, bank: 0, category: 'Ensemble' },
  { name: 'Orchestra Hit Ketron', program: 55, bank: 0, category: 'Ensemble' },

  // Brass (Ketron Punchy Brass)
  { name: 'Trumpet Solo Live SD2', program: 56, bank: 0, category: 'Brass' },
  { name: 'Trombone Solo Warm', program: 57, bank: 0, category: 'Brass' },
  { name: 'Tuba Low Brass', program: 58, bank: 0, category: 'Brass' },
  { name: 'Muted Miles Trumpet', program: 59, bank: 0, category: 'Brass' },
  { name: 'French Horn Section', program: 60, bank: 0, category: 'Brass' },
  { name: 'Ketron Brass Section SD2', program: 61, bank: 0, category: 'Brass' },
  { name: 'Synth Brass Power 1', program: 62, bank: 0, category: 'Brass' },
  { name: 'Synth Brass Fat 2', program: 63, bank: 0, category: 'Brass' },

  // Reed & Woodwinds (Ketron Live Saxes)
  { name: 'Soprano Sax Live SD2', program: 64, bank: 0, category: 'Reed' },
  { name: 'Alto Sax Live Ketron', program: 65, bank: 0, category: 'Reed' },
  { name: 'Tenor Sax Breath SD2', program: 66, bank: 0, category: 'Reed' },
  { name: 'Baritone Sax Growl', program: 67, bank: 0, category: 'Reed' },
  { name: 'Oboe Solo Woodwind', program: 68, bank: 0, category: 'Reed' },
  { name: 'English Horn Pastoral', program: 69, bank: 0, category: 'Reed' },
  { name: 'Bassoon Classical', program: 70, bank: 0, category: 'Reed' },
  { name: 'Clarinet Live SD2', program: 71, bank: 0, category: 'Reed' },

  // Pipes
  { name: 'Piccolo Flute', program: 72, bank: 0, category: 'Pipe' },
  { name: 'Flute Concert SD2', program: 73, bank: 0, category: 'Pipe' },
  { name: 'Recorder Wood', program: 74, bank: 0, category: 'Pipe' },
  { name: 'Pan Flute Andean SD2', program: 75, bank: 0, category: 'Pipe' },
  { name: 'Blown Bottle Wood', program: 76, bank: 0, category: 'Pipe' },
  { name: 'Shakuhachi Bamboo', program: 77, bank: 0, category: 'Pipe' },
  { name: 'Whistle Irish Flute', program: 78, bank: 0, category: 'Pipe' },
  { name: 'Ocarina SD2', program: 79, bank: 0, category: 'Pipe' },

  // World, Ethnic & Oriental Instruments
  { name: 'Sitar Indian Classical', program: 104, bank: 0, category: 'World / Ethnic' },
  { name: 'Banjo Country 5-String', program: 105, bank: 0, category: 'World / Ethnic' },
  { name: 'Shamisen Japanese', program: 106, bank: 0, category: 'World / Ethnic' },
  { name: 'Koto Japanese 13-Str', program: 107, bank: 0, category: 'World / Ethnic' },
  { name: 'Kalimba African Thumb', program: 108, bank: 0, category: 'World / Ethnic' },
  { name: 'Bagpipe Scottish Great', program: 109, bank: 0, category: 'World / Ethnic' },
  { name: 'Fiddle Folk Country', program: 110, bank: 0, category: 'World / Ethnic' },
  { name: 'Shanai Asian Horn', program: 111, bank: 0, category: 'World / Ethnic' },

  // ==========================================
  // BANK 1: KETRON MASTER SOLO & ACCORDION BANK
  // ==========================================
  { name: 'Accordion Master SD2', program: 21, bank: 1, category: 'Organ' },
  { name: 'Accordion French Musette', program: 22, bank: 1, category: 'Organ' },
  { name: 'Accordion Castelfidardo', program: 23, bank: 1, category: 'Organ' },
  { name: 'Accordion Cassotto Double', program: 24, bank: 1, category: 'Organ' },
  { name: 'Accordion Steirisch Alpine', program: 25, bank: 1, category: 'Organ' },
  { name: 'Accordion Raï / Oriental', program: 26, bank: 1, category: 'Organ' },
  { name: 'Bandoneon Astor Live', program: 27, bank: 1, category: 'Organ' },
  { name: 'Flamenco Guitar Ketron', program: 24, bank: 1, category: 'Guitar' },
  { name: 'Mandolin Tremolo Folk', program: 25, bank: 1, category: 'Guitar' },
  { name: 'Stratocaster Overdrive Live', program: 29, bank: 1, category: 'Guitar' },
  { name: 'Bouzouki Greek Live', program: 104, bank: 1, category: 'World / Ethnic' },
  { name: 'Oud Arabic Solo SD2', program: 105, bank: 1, category: 'World / Ethnic' },
  { name: 'Kanoun / Qanun Tremolo', program: 106, bank: 1, category: 'World / Ethnic' },
  { name: 'Ney Arabic Bamboo Flute', program: 75, bank: 1, category: 'World / Ethnic' },
  { name: 'Zurna Folk Horn', program: 111, bank: 1, category: 'World / Ethnic' },
  { name: 'Tenor Sax Vintage Live', program: 66, bank: 1, category: 'Reed' },
  { name: 'Trumpet Muted Harmon', program: 59, bank: 1, category: 'Brass' },
  { name: 'Ketron Big Brass Live', program: 61, bank: 1, category: 'Brass' },

  // ==========================================
  // BANK 2: KETRON ETHNIC & WORLD VOICES
  // ==========================================
  { name: 'Saz / Baglama Long Neck', program: 104, bank: 2, category: 'World / Ethnic' },
  { name: 'Cumbus Turkish Lute', program: 105, bank: 2, category: 'World / Ethnic' },
  { name: 'Balalaika Russian', program: 106, bank: 2, category: 'World / Ethnic' },
  { name: 'Duduk Armenian Woodwind', program: 75, bank: 2, category: 'World / Ethnic' },
  { name: 'Oriental Strings Ensemble', program: 48, bank: 2, category: 'Ensemble' },
  { name: 'Oriental Solo Violin Arab', program: 40, bank: 2, category: 'Strings' },
  { name: 'Slap Bass Mark King', program: 36, bank: 2, category: 'Bass' },
  { name: 'Jazz Guitar George Benson', program: 26, bank: 2, category: 'Guitar' },

  // ==========================================
  // BANK 128: KETRON SD2 DRUM & PERCUSSION KITS
  // (Famous for live rock, dance, folk, and Arabian percussions)
  // ==========================================
  { name: 'Ketron SD2 Standard Drum Kit', program: 0, bank: 128, category: 'Drums', isDrum: true },
  { name: 'Ketron Live Rock Drum Kit', program: 16, bank: 128, category: 'Drums', isDrum: true },
  { name: 'Ketron Dance & House Kit', program: 25, bank: 128, category: 'Drums', isDrum: true },
  { name: 'Ketron Jazz & Brush Drum Kit', program: 32, bank: 128, category: 'Drums', isDrum: true },
  { name: 'Ketron Folk & Country Kit', program: 40, bank: 128, category: 'Drums', isDrum: true },
  { name: 'Ketron Acoustic Studio Kit', program: 48, bank: 128, category: 'Drums', isDrum: true },
  { name: 'Oriental & Raï Percussion Kit (Darbuka/Riq/Bendir)', program: 56, bank: 128, category: 'Drums', isDrum: true },
  { name: 'Latin & Cuban Percussion Kit', program: 64, bank: 128, category: 'Drums', isDrum: true },
  { name: 'Arabic Dahola & Tabla Solo Kit', program: 72, bank: 128, category: 'Drums', isDrum: true },
];

export const KETRON_SD2_FILE_NAME = 'E-KETRON-SD2-SBA-1.0.7b_2.sf2';

import { CustomSf2SoundFont } from '../types/midi';

export function createKetronSd2CustomSf2(): CustomSf2SoundFont {
  return {
    fileName: KETRON_SD2_FILE_NAME,
    fileSize: 48 * 1024 * 1024, // ~48 MB
    bankMsb: 0,
    bankLsb: 0,
    presetProgram: 0,
    presetName: 'Grand Piano SD2',
    loadedAt: new Date().toISOString(),
    presetsList: KETRON_SD2_PRESETS.map((p) => ({
      name: p.name,
      program: p.program,
      bank: p.bank,
    })),
  };
}

