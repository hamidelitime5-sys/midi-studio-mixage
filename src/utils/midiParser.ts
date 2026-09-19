import { Midi } from '@tonejs/midi';
import {
  ParsedMidiSong,
  MidiNoteEvent,
  MidiChannelConfig,
  KaraokeLyricEvent,
  MidiProgramChangeEvent,
  MidiControlChangeEvent,
} from '../types/midi';
import { getInstrumentName } from '../data/gmInstruments';
import { BAND_CHANNELS_TEMPLATE } from '../data/bandTemplate';

export function parseMidiFile(
  arrayBuffer: ArrayBuffer,
  fileName = 'song.mid'
): ParsedMidiSong {
  const midi = new Midi(arrayBuffer);

  const notes: MidiNoteEvent[] = [];
  const programChanges: MidiProgramChangeEvent[] = [];
  const controlChanges: MidiControlChangeEvent[] = [];
  const lyrics: KaraokeLyricEvent[] = [];

  // Channel map initialized with user's fixed Band Template
  const channelConfigs: MidiChannelConfig[] = Array.from({ length: 16 }, (_, i) => {
    const tpl = BAND_CHANNELS_TEMPLATE[i] || BAND_CHANNELS_TEMPLATE[0];
    const isDrum = i === 9 || tpl.isDrum;
    return {
      channel: i,
      name: tpl.instrumentDefault,
      roleTitle: tpl.roleTitle,
      categoryTag: tpl.categoryTag,
      iconKey: tpl.iconKey,
      program: tpl.program,
      bankMsb: tpl.bankMsb,
      bankLsb: 0,
      isDrum,
      volume: 100,
      pan: 64,
      muted: false,
      solo: false,
      activeNoteCount: 0,
      lastActivityTime: 0,
    };
  });

  // Track channels that actually have events
  const activeChannels = new Set<number>();

  // Extract tempo & time signature
  const bpm = midi.header.tempos.length > 0 ? Math.round(midi.header.tempos[0].bpm) : 120;
  const timeSignature: [number, number] =
    midi.header.timeSignatures.length > 0
      ? [midi.header.timeSignatures[0].timeSignature[0], midi.header.timeSignatures[0].timeSignature[1]]
      : [4, 4];

  // Traverse tracks for notes, control changes, and program changes
  midi.tracks.forEach((track, trackIndex) => {
    const defaultTrackChannel = track.channel !== undefined ? track.channel : trackIndex % 16;

    // Detect Instrument / Program from track
    if (track.instrument) {
      const ch = track.channel !== undefined ? track.channel : trackIndex % 16;
      if (ch >= 0 && ch < 16) {
        const prog = track.instrument.number !== undefined ? track.instrument.number : 0;
        channelConfigs[ch].program = Math.max(0, Math.min(127, prog));
        if (track.name) {
          channelConfigs[ch].name = track.name;
        } else {
          channelConfigs[ch].name = getInstrumentName(prog, ch === 9);
        }
      }
    }

    // Extract Notes
    track.notes.forEach((note) => {
      const anyNote = note as any;
      const ch = anyNote.channel !== undefined ? anyNote.channel : defaultTrackChannel;
      activeChannels.add(ch);

      notes.push({
        time: note.time,
        duration: note.duration,
        midi: note.midi,
        name: note.name,
        velocity: note.velocity,
        channel: ch,
        trackIndex,
      });
    });

    // Extract Control Changes (CC 0 Bank MSB, CC 32 Bank LSB, CC 7 Volume, CC 10 Pan, etc.)
    if (track.controlChanges) {
      for (const ccNumStr in track.controlChanges) {
        const ccNum = parseInt(ccNumStr, 10);
        const events = track.controlChanges[ccNum];
        if (Array.isArray(events)) {
          events.forEach((ev: any) => {
            const ch = defaultTrackChannel;
            activeChannels.add(ch);
            const val = Math.round((ev.value || 0) * 127);

            controlChanges.push({
              time: ev.time,
              channel: ch,
              controller: ccNum,
              value: val,
            });

            // Update initial state if early in the file
            if (ev.time <= 0.1 && ch >= 0 && ch < 16) {
              if (ccNum === 0) channelConfigs[ch].bankMsb = val;
              if (ccNum === 32) channelConfigs[ch].bankLsb = val;
              if (ccNum === 7) channelConfigs[ch].volume = val;
              if (ccNum === 10) channelConfigs[ch].pan = val;
            }
          });
        }
      }
    }
  });

  // Sort notes by timestamp
  notes.sort((a, b) => a.time - b.time);
  controlChanges.sort((a, b) => a.time - b.time);

  // Extract Lyrics (Standard MIDI 0x05 or text 0x01 or KAR format)
  // In @tonejs/midi, track.text or track.lyrics may be present
  let lineCounter = 0;

  // Scan for any lyrics or text meta events
  const rawLyricEvents: Array<{ time: number; text: string }> = [];

  // Check midi.tracks for text/lyrics
  midi.tracks.forEach((track) => {
    // Check for explicit lyrics
    const anyTrack = track as any;
    if (Array.isArray(anyTrack.lyrics)) {
      anyTrack.lyrics.forEach((item: any) => {
        if (item.text && item.text.trim()) {
          rawLyricEvents.push({ time: item.time || 0, text: item.text });
        }
      });
    }

    if (Array.isArray(anyTrack.text)) {
      anyTrack.text.forEach((item: any) => {
        const txt = (item.text || '').trim();
        // Skip metadata tags like @KMIDI KARAOKE FILE, @V, @I, @T
        if (txt && !txt.startsWith('@') && txt.length < 100) {
          rawLyricEvents.push({ time: item.time || 0, text: item.text });
        }
      });
    }
  });

  // Sort raw lyrics by time
  rawLyricEvents.sort((a, b) => a.time - b.time);

  // Parse KAR syntax:
  // "/" indicates a line break
  // "\" indicates a new stanza/screen
  rawLyricEvents.forEach((item) => {
    let cleanText = item.text;
    let isLineBreak = false;
    let isParagraphBreak = false;

    if (cleanText.startsWith('\\')) {
      isParagraphBreak = true;
      isLineBreak = true;
      cleanText = cleanText.substring(1);
      lineCounter++;
    } else if (cleanText.startsWith('/')) {
      isLineBreak = true;
      cleanText = cleanText.substring(1);
      lineCounter++;
    }

    lyrics.push({
      time: item.time,
      text: cleanText,
      lineIndex: lineCounter,
      isLineBreak,
      isParagraphBreak,
    });
  });

  // Derive title from filename or midi header
  let title = fileName.replace(/\.(mid|kar|midi)$/i, '');
  if (midi.name && midi.name.trim()) {
    title = midi.name.trim();
  }

  const duration = midi.duration || (notes.length > 0 ? notes[notes.length - 1].time + notes[notes.length - 1].duration + 1 : 120);

  return {
    title,
    duration: Math.max(1, duration),
    bpm,
    timeSignature,
    tracksCount: midi.tracks.length,
    notes,
    lyrics,
    channels: channelConfigs,
    programChanges,
    controlChanges,
    rawMidiData: new Uint8Array(arrayBuffer),
  };
}
