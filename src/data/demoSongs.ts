import { ParsedMidiSong, MidiChannelConfig, MidiNoteEvent, KaraokeLyricEvent } from '../types/midi';
import { BAND_CHANNELS_TEMPLATE } from './bandTemplate';

// Helper to create 16 channel configs pre-assigned to user's fixed Band Template
function createDefaultChannels(overrides: Partial<MidiChannelConfig>[] = []): MidiChannelConfig[] {
  return Array.from({ length: 16 }, (_, i) => {
    const tpl = BAND_CHANNELS_TEMPLATE[i] || BAND_CHANNELS_TEMPLATE[0];
    const override = overrides.find((o) => o.channel === i);
    const isDrum = i === 9 || tpl.isDrum;
    return {
      channel: i,
      name: override?.name || tpl.instrumentDefault,
      roleTitle: tpl.roleTitle,
      categoryTag: tpl.categoryTag,
      iconKey: tpl.iconKey,
      customImageUrl: override?.customImageUrl,
      program: override?.program !== undefined ? override.program : tpl.program,
      bankMsb: override?.bankMsb !== undefined ? override.bankMsb : tpl.bankMsb,
      bankLsb: override?.bankLsb || 0,
      isDrum,
      volume: override?.volume || 100,
      pan: override?.pan || 64,
      muted: false,
      solo: false,
      activeNoteCount: 0,
      lastActivityTime: 0,
      customSf2: override?.customSf2,
    };
  });
}

// 1. STAND BY ME (Soul Classic with famous Bassline, Acoustic Guitar, Strings, Channel 10 Drums & Lyrics)
export function getStandByMeSong(): ParsedMidiSong {
  const bpm = 118;
  const beatSec = 60 / bpm; // ~0.508s per quarter note
  const notes: MidiNoteEvent[] = [];
  const lyrics: KaraokeLyricEvent[] = [];

  // Channels:
  // Ch 0: Acoustic Guitar (Prog 25)
  // Ch 1: Acoustic Bass (Prog 32)
  // Ch 2: String Ensemble (Prog 48)
  // Ch 3: Vocal Lead Melody (Prog 65 Alto Sax / Vocal guide)
  // Ch 9: Drums (Channel 10, Prog 0 Standard Kit, Bank 128)

  const chordProgression = [
    { root: 48, name: 'C' }, // C3
    { root: 48, name: 'C' },
    { root: 45, name: 'Am' }, // A2
    { root: 45, name: 'Am' },
    { root: 41, name: 'F' }, // F2
    { root: 43, name: 'G' }, // G2
    { root: 48, name: 'C' }, // C3
    { root: 48, name: 'C' },
  ];

  let currentTime = 0;

  // 4 cycles of 8 bars = 32 bars (~65 seconds)
  for (let cycle = 0; cycle < 3; cycle++) {
    for (let bar = 0; bar < chordProgression.length; bar++) {
      const chord = chordProgression[bar];
      const barStart = currentTime;

      // Channel 1: Famous Bass line (Acoustic Bass - Prog 32)
      // Rhythm: 1, 2-and, 3, 4
      const bassNotes = [chord.root - 12, chord.root - 12, chord.root - 12, chord.root - 10, chord.root - 12];
      const bassOffsets = [0, 0.75 * beatSec, 1.5 * beatSec, 2.5 * beatSec, 3.25 * beatSec];
      const bassDurs = [0.6 * beatSec, 0.6 * beatSec, 0.8 * beatSec, 0.6 * beatSec, 0.6 * beatSec];

      for (let b = 0; b < bassNotes.length; b++) {
        notes.push({
          time: barStart + bassOffsets[b],
          duration: bassDurs[b],
          midi: bassNotes[b],
          name: `Bass`,
          velocity: 0.85,
          channel: 1,
          trackIndex: 1,
        });
      }

      // Channel 0: Acoustic Guitar strum / chords (Prog 25)
      for (let beat = 0; beat < 4; beat++) {
        const strumTime = barStart + beat * beatSec;
        [chord.root, chord.root + 4, chord.root + 7].forEach((pitch) => {
          notes.push({
            time: strumTime,
            duration: 0.4 * beatSec,
            midi: pitch + 12,
            name: `Gtr`,
            velocity: beat % 2 === 1 ? 0.75 : 0.6,
            channel: 0,
            trackIndex: 0,
          });
        });
      }

      // Channel 9: Drums (Channel 10)
      // Kick on 1 and 3, Snare/Clap on 2 and 4, Hi-Hat on eighth notes
      for (let beat = 0; beat < 4; beat++) {
        const beatTime = barStart + beat * beatSec;
        // Hi-Hat closed (MIDI 42)
        notes.push({
          time: beatTime,
          duration: 0.1,
          midi: 42,
          name: 'HiHat',
          velocity: 0.7,
          channel: 9,
          trackIndex: 4,
        });
        notes.push({
          time: beatTime + 0.5 * beatSec,
          duration: 0.1,
          midi: 42,
          name: 'HiHat',
          velocity: 0.55,
          channel: 9,
          trackIndex: 4,
        });

        // Bass Drum (MIDI 36) on beats 1 and 3
        if (beat === 0 || beat === 2) {
          notes.push({
            time: beatTime,
            duration: 0.2,
            midi: 36,
            name: 'Kick',
            velocity: 0.9,
            channel: 9,
            trackIndex: 4,
          });
        }
        // Snare (MIDI 38) on beats 2 and 4
        if (beat === 1 || beat === 3) {
          notes.push({
            time: beatTime,
            duration: 0.2,
            midi: 38,
            name: 'Snare',
            velocity: 0.85,
            channel: 9,
            trackIndex: 4,
          });
        }
      }

      // Channel 2: Strings pad in later cycles (Prog 48)
      if (cycle >= 1) {
        [chord.root, chord.root + 7, chord.root + 12].forEach((pitch) => {
          notes.push({
            time: barStart,
            duration: 3.9 * beatSec,
            midi: pitch + 12,
            name: 'Strings',
            velocity: 0.6,
            channel: 2,
            trackIndex: 2,
          });
        });
      }

      currentTime += 4 * beatSec;
    }
  }

  // Channel 3: Vocal Melody & Synchronized Karaoke Lyrics
  // Bar 4 starts singing "When the night has come..."
  const vocalPhrases = [
    // Verse 1
    { time: 8 * beatSec, text: 'When ', dur: 1.0, midi: 60 },
    { time: 9 * beatSec, text: 'the ', dur: 0.5, midi: 62 },
    { time: 9.5 * beatSec, text: 'night ', dur: 1.5, midi: 64 },
    { time: 11.5 * beatSec, text: 'has ', dur: 0.8, midi: 62 },
    { time: 12.5 * beatSec, text: 'come, /', dur: 2.0, midi: 60, break: true },

    { time: 16 * beatSec, text: 'And ', dur: 0.8, midi: 60 },
    { time: 17 * beatSec, text: 'the ', dur: 0.5, midi: 60 },
    { time: 17.5 * beatSec, text: 'land ', dur: 1.5, midi: 60 },
    { time: 19 * beatSec, text: 'is ', dur: 0.8, midi: 62 },
    { time: 20 * beatSec, text: 'dark, /', dur: 2.2, midi: 57, break: true },

    { time: 24 * beatSec, text: 'And ', dur: 0.8, midi: 60 },
    { time: 25 * beatSec, text: 'the ', dur: 0.5, midi: 60 },
    { time: 25.5 * beatSec, text: 'moon ', dur: 1.5, midi: 65 },
    { time: 27 * beatSec, text: 'is ', dur: 0.8, midi: 64 },
    { time: 28 * beatSec, text: 'the ', dur: 0.8, midi: 62 },
    { time: 29 * beatSec, text: 'on-ly ', dur: 1.2, midi: 60 },
    { time: 30.5 * beatSec, text: 'light ', dur: 1.0, midi: 62 },
    { time: 31.5 * beatSec, text: "we'll ", dur: 0.8, midi: 60 },
    { time: 32.5 * beatSec, text: 'see. \\', dur: 2.5, midi: 60, break: true, para: true },

    // Chorus
    { time: 40 * beatSec, text: 'No ', dur: 0.8, midi: 60 },
    { time: 41 * beatSec, text: "I won't ", dur: 1.2, midi: 64 },
    { time: 42.5 * beatSec, text: 'be ', dur: 0.8, midi: 62 },
    { time: 43.5 * beatSec, text: 'a-fraid, /', dur: 2.0, midi: 60, break: true },

    { time: 48 * beatSec, text: 'No ', dur: 0.8, midi: 60 },
    { time: 49 * beatSec, text: "I won't ", dur: 1.2, midi: 64 },
    { time: 50.5 * beatSec, text: 'shed ', dur: 0.8, midi: 62 },
    { time: 51.5 * beatSec, text: 'a tear, /', dur: 2.0, midi: 57, break: true },

    { time: 56 * beatSec, text: 'Just ', dur: 0.8, midi: 60 },
    { time: 57 * beatSec, text: 'as ', dur: 0.5, midi: 62 },
    { time: 57.5 * beatSec, text: 'long ', dur: 1.2, midi: 64 },
    { time: 59 * beatSec, text: 'as ', dur: 0.8, midi: 62 },
    { time: 60 * beatSec, text: 'you ', dur: 0.8, midi: 60 },
    { time: 61 * beatSec, text: 'stand, ', dur: 1.2, midi: 64 },
    { time: 62.5 * beatSec, text: 'stand ', dur: 1.2, midi: 62 },
    { time: 64 * beatSec, text: 'by ', dur: 0.8, midi: 60 },
    { time: 65 * beatSec, text: 'me!', dur: 2.5, midi: 60 },
  ];

  let lineCount = 0;
  vocalPhrases.forEach((v) => {
    // Vocal note
    notes.push({
      time: v.time,
      duration: v.dur * beatSec,
      midi: v.midi,
      name: 'Vocal',
      velocity: 0.9,
      channel: 3,
      trackIndex: 3,
    });

    if (v.break) lineCount++;
    lyrics.push({
      time: v.time,
      text: v.text.replace(/[/|\\]/g, ''),
      lineIndex: lineCount,
      isLineBreak: !!v.break,
      isParagraphBreak: !!v.para,
    });
  });

  notes.sort((a, b) => a.time - b.time);

  const channels = createDefaultChannels([
    { channel: 0, name: 'Acoustic Guitar', program: 25, bankMsb: 0, volume: 95, pan: 40 },
    { channel: 1, name: 'Acoustic Bass', program: 32, bankMsb: 0, volume: 110, pan: 64 },
    { channel: 2, name: 'String Ensemble', program: 48, bankMsb: 0, volume: 80, pan: 85 },
    { channel: 3, name: 'Vocal Guide / Sax', program: 65, bankMsb: 0, volume: 105, pan: 64 },
    { channel: 9, name: 'Drums (Standard Kit)', program: 0, bankMsb: 128, volume: 105, pan: 64, isDrum: true },
  ]);

  return {
    title: 'Stand By Me (Ben E. King)',
    artist: 'Ben E. King',
    duration: currentTime,
    bpm,
    timeSignature: [4, 4],
    tracksCount: 5,
    notes,
    lyrics,
    channels,
    programChanges: [
      { time: 0, channel: 0, program: 25, bankMsb: 0, bankLsb: 0 },
      { time: 0, channel: 1, program: 32, bankMsb: 0, bankLsb: 0 },
      { time: 0, channel: 2, program: 48, bankMsb: 0, bankLsb: 0 },
      { time: 0, channel: 3, program: 65, bankMsb: 0, bankLsb: 0 },
      { time: 0, channel: 9, program: 0, bankMsb: 128, bankLsb: 0 },
    ],
    controlChanges: [
      { time: 0, channel: 0, controller: 7, value: 95 },
      { time: 0, channel: 1, controller: 7, value: 110 },
      { time: 0, channel: 2, controller: 7, value: 80 },
      { time: 0, channel: 3, controller: 7, value: 105 },
      { time: 0, channel: 9, controller: 7, value: 105 },
    ],
  };
}

// 2. LET IT BE (Classic Piano Ballad - Acoustic Grand Piano, Hammond Organ, Bass, Drums & Vocals)
export function getLetItBeSong(): ParsedMidiSong {
  const bpm = 75;
  const beatSec = 60 / bpm; // 0.8s
  const notes: MidiNoteEvent[] = [];
  const lyrics: KaraokeLyricEvent[] = [];

  const chords = [
    { root: 60, bass: 36, name: 'C' },
    { root: 59, bass: 35, name: 'G' },
    { root: 57, bass: 33, name: 'Am' },
    { root: 53, bass: 29, name: 'F' },
    { root: 60, bass: 36, name: 'C' },
    { root: 59, bass: 35, name: 'G' },
    { root: 53, bass: 29, name: 'F' },
    { root: 60, bass: 36, name: 'C' },
  ];

  let currentTime = 0;

  for (let cycle = 0; cycle < 2; cycle++) {
    for (let i = 0; i < chords.length; i++) {
      const c = chords[i];
      const barStart = currentTime;

      // Channel 0: Acoustic Grand Piano (Prog 0) - Iconic 4 quarter note chords
      for (let b = 0; b < 4; b++) {
        const t = barStart + b * beatSec;
        [c.root, c.root + 4, c.root + 7].forEach((p) => {
          notes.push({
            time: t,
            duration: 0.7 * beatSec,
            midi: p,
            name: 'Piano',
            velocity: b === 0 ? 0.85 : 0.7,
            channel: 0,
            trackIndex: 0,
          });
        });
      }

      // Channel 1: Electric Bass (Prog 33)
      notes.push({
        time: barStart,
        duration: 3.5 * beatSec,
        midi: c.bass + 12,
        name: 'Bass',
        velocity: 0.85,
        channel: 1,
        trackIndex: 1,
      });

      // Channel 4: Drawbar Organ (Prog 16) in cycle 1
      if (cycle >= 1) {
        [c.root - 12, c.root, c.root + 7].forEach((p) => {
          notes.push({
            time: barStart,
            duration: 3.8 * beatSec,
            midi: p,
            name: 'Organ',
            velocity: 0.6,
            channel: 4,
            trackIndex: 2,
          });
        });
      }

      // Channel 9: Drums (Channel 10) in cycle 1
      if (cycle >= 1) {
        for (let b = 0; b < 4; b++) {
          const t = barStart + b * beatSec;
          notes.push({ time: t, duration: 0.1, midi: 42, name: 'Hat', velocity: 0.6, channel: 9, trackIndex: 4 });
          if (b === 0 || b === 2) {
            notes.push({ time: t, duration: 0.2, midi: 36, name: 'Kick', velocity: 0.85, channel: 9, trackIndex: 4 });
          }
          if (b === 1 || b === 3) {
            notes.push({ time: t, duration: 0.2, midi: 38, name: 'Snare', velocity: 0.8, channel: 9, trackIndex: 4 });
          }
        }
      }

      currentTime += 4 * beatSec;
    }
  }

  // Lyrics
  const words = [
    { time: 0, text: 'When ', dur: 0.8, midi: 64 },
    { time: 1.0 * beatSec, text: 'I ', dur: 0.8, midi: 64 },
    { time: 2.0 * beatSec, text: 'find ', dur: 1.0, midi: 64 },
    { time: 3.0 * beatSec, text: 'my-self ', dur: 1.0, midi: 65 },
    { time: 4.0 * beatSec, text: 'in ', dur: 0.8, midi: 67 },
    { time: 5.0 * beatSec, text: 'times ', dur: 1.2, midi: 67 },
    { time: 6.2 * beatSec, text: 'of ', dur: 0.8, midi: 69 },
    { time: 7.0 * beatSec, text: 'trou-ble, /', dur: 1.5, midi: 67, break: true },

    { time: 9.0 * beatSec, text: 'Mo-ther ', dur: 1.2, midi: 65 },
    { time: 10.5 * beatSec, text: 'Ma-ry ', dur: 1.2, midi: 64 },
    { time: 12.0 * beatSec, text: 'comes ', dur: 1.0, midi: 64 },
    { time: 13.0 * beatSec, text: 'to ', dur: 0.8, midi: 62 },
    { time: 14.0 * beatSec, text: 'me, /', dur: 1.8, midi: 60, break: true },

    { time: 16.0 * beatSec, text: 'Speak-ing ', dur: 1.2, midi: 67 },
    { time: 17.5 * beatSec, text: 'words ', dur: 1.0, midi: 67 },
    { time: 18.5 * beatSec, text: 'of ', dur: 0.8, midi: 69 },
    { time: 19.5 * beatSec, text: 'wis-dom, /', dur: 1.5, midi: 67, break: true },

    { time: 21.5 * beatSec, text: 'Let ', dur: 1.0, midi: 65 },
    { time: 22.5 * beatSec, text: 'it ', dur: 0.8, midi: 64 },
    { time: 23.5 * beatSec, text: 'be... \\', dur: 2.5, midi: 60, break: true, para: true },
  ];

  let lCount = 0;
  words.forEach((w) => {
    notes.push({
      time: w.time,
      duration: w.dur * beatSec,
      midi: w.midi,
      name: 'Melody',
      velocity: 0.9,
      channel: 3,
      trackIndex: 3,
    });
    if (w.break) lCount++;
    lyrics.push({
      time: w.time,
      text: w.text.replace(/[/|\\]/g, ''),
      lineIndex: lCount,
      isLineBreak: !!w.break,
      isParagraphBreak: !!w.para,
    });
  });

  const channels = createDefaultChannels([
    { channel: 0, name: 'Acoustic Grand Piano', program: 0, bankMsb: 0, volume: 105, pan: 55 },
    { channel: 1, name: 'Electric Bass (Finger)', program: 33, bankMsb: 0, volume: 100, pan: 64 },
    { channel: 3, name: 'Lead Vocal (Flute/Guide)', program: 73, bankMsb: 0, volume: 100, pan: 64 },
    { channel: 4, name: 'Drawbar Organ (Hammond)', program: 16, bankMsb: 0, volume: 75, pan: 75 },
    { channel: 9, name: 'Drums (Rock Kit)', program: 16, bankMsb: 128, volume: 100, pan: 64, isDrum: true },
  ]);

  return {
    title: 'Let It Be (The Beatles)',
    artist: 'The Beatles',
    duration: currentTime,
    bpm,
    timeSignature: [4, 4],
    tracksCount: 5,
    notes,
    lyrics,
    channels,
    programChanges: [
      { time: 0, channel: 0, program: 0, bankMsb: 0, bankLsb: 0 },
      { time: 0, channel: 1, program: 33, bankMsb: 0, bankLsb: 0 },
      { time: 0, channel: 3, program: 73, bankMsb: 0, bankLsb: 0 },
      { time: 0, channel: 4, program: 16, bankMsb: 0, bankLsb: 0 },
      { time: 0, channel: 9, program: 16, bankMsb: 128, bankLsb: 0 },
    ],
    controlChanges: [
      { time: 0, channel: 0, controller: 7, value: 105 },
      { time: 0, channel: 1, controller: 7, value: 100 },
      { time: 0, channel: 3, controller: 7, value: 100 },
      { time: 0, channel: 4, controller: 7, value: 75 },
      { time: 0, channel: 9, controller: 7, value: 100 },
    ],
  };
}

export const DEMO_SONGS = [
  { id: 'stand-by-me', name: 'Stand By Me (Ben E. King)', factory: getStandByMeSong },
  { id: 'let-it-be', name: 'Let It Be (The Beatles)', factory: getLetItBeSong },
];
