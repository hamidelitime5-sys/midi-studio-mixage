// SynthFont2 Configuration (.def, .sfarr, .ini) Exporter & Importer
// Allows seamless round-trip synchronization between AI Studio Console and SynthFont2

import { MidiChannelConfig } from '../types/midi';
import { BAND_CHANNELS_TEMPLATE } from '../data/bandTemplate';

export interface SynthFontImportResult {
  channels: {
    channelIndex: number;
    partial: Partial<MidiChannelConfig>;
  }[];
  soundFontFile?: string;
  detectedCount: number;
}

/**
 * Generate a standard SynthFont2 configuration file (.def)
 */
export function generateSynthFont2Def(channels: MidiChannelConfig[]): string {
  let content = `; SynthFont2 Channel Assignment Configuration\n`;
  content += `; Généré par MG-16XU SoundFont Band Console\n`;
  content += `; Compatible SynthFont 2 (v2.9.x / v2.8.x)\n\n`;

  content += `[Global]\n`;
  content += `Version=2.0\n`;
  content += `Channels=16\n`;
  content += `Timestamp=${new Date().toISOString()}\n\n`;

  channels.forEach((ch, idx) => {
    const tpl = BAND_CHANNELS_TEMPLATE[idx] || BAND_CHANNELS_TEMPLATE[0];
    content += `[Channel_${idx + 1}]\n`;
    content += `Role=${tpl.roleTitle || 'Piste'}\n`;
    content += `Name=${ch.name}\n`;
    content += `Program=${ch.program}\n`;
    content += `BankMSB=${ch.bankMsb}\n`;
    content += `BankLSB=${ch.bankLsb}\n`;
    content += `Volume=${ch.volume}\n`;
    content += `Pan=${ch.pan}\n`;
    content += `Muted=${ch.muted ? 1 : 0}\n`;
    content += `Solo=${ch.solo ? 1 : 0}\n`;
    content += `IsDrum=${ch.isDrum || idx === 9 ? 1 : 0}\n`;
    if (ch.customSf2) {
      content += `SoundFont=${ch.customSf2.fileName}\n`;
      content += `PresetName=${ch.customSf2.presetName}\n`;
    }
    content += `\n`;
  });

  return content;
}

/**
 * Parse a SynthFont2 configuration file (.def, .sfarr, .ini, .txt)
 */
export function parseSynthFont2Config(text: string): SynthFontImportResult {
  const lines = text.split(/\r?\n/);
  const updates: { channelIndex: number; partial: Partial<MidiChannelConfig> }[] = [];

  let currentChannelIdx: number | null = null;
  let currentObj: Partial<MidiChannelConfig> & { soundFontName?: string; presetName?: string } = {};
  let globalSoundFont: string | undefined;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith(';') || line.startsWith('#') || line.startsWith('//')) {
      continue;
    }

    // Section header: e.g. [Channel_1], [Channel 1], [Track_1], [Ch1], [Ch_10], etc.
    const sectionMatch = line.match(/^\[(?:Channel|Track|Ch)[_ ]?(\d+)\]/i);
    if (sectionMatch) {
      // Save previous channel if valid
      if (currentChannelIdx !== null && currentChannelIdx >= 0 && currentChannelIdx < 16) {
        commitChannel(currentChannelIdx, currentObj);
      }

      const num = parseInt(sectionMatch[1], 10);
      currentChannelIdx = num - 1; // 1-based to 0-based
      currentObj = {};
      continue;
    }

    // Check key=value pairs
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.substring(0, eqIdx).trim().toLowerCase();
      const val = line.substring(eqIdx + 1).trim();

      if (key === 'soundfont' || key === 'sf2' || key === 'customsoundfont' || key === 'bankfile') {
        if (currentChannelIdx !== null) {
          currentObj.soundFontName = val;
        } else {
          globalSoundFont = val;
        }
      } else if (key === 'program' || key === 'patch' || key === 'prg') {
        const p = parseInt(val, 10);
        if (!isNaN(p)) currentObj.program = Math.max(0, Math.min(127, p));
      } else if (key === 'bankmsb' || key === 'bank' || key === 'bank_msb') {
        const b = parseInt(val, 10);
        if (!isNaN(b)) currentObj.bankMsb = Math.max(0, Math.min(128, b));
      } else if (key === 'banklsb' || key === 'bank_lsb') {
        const l = parseInt(val, 10);
        if (!isNaN(l)) currentObj.bankLsb = Math.max(0, Math.min(127, l));
      } else if (key === 'volume' || key === 'vol') {
        const v = parseInt(val, 10);
        if (!isNaN(v)) currentObj.volume = Math.max(0, Math.min(127, v));
      } else if (key === 'pan') {
        const p = parseInt(val, 10);
        if (!isNaN(p)) currentObj.pan = Math.max(0, Math.min(127, p));
      } else if (key === 'muted' || key === 'mute') {
        currentObj.muted = val === '1' || val.toLowerCase() === 'true';
      } else if (key === 'solo') {
        currentObj.solo = val === '1' || val.toLowerCase() === 'true';
      } else if (key === 'isdrum' || key === 'drum') {
        currentObj.isDrum = val === '1' || val.toLowerCase() === 'true';
      } else if (key === 'presetname' || key === 'preset') {
        currentObj.presetName = val;
      } else if (key === 'name') {
        currentObj.name = val;
      }
    }
  }

  // Save trailing channel
  if (currentChannelIdx !== null && currentChannelIdx >= 0 && currentChannelIdx < 16) {
    commitChannel(currentChannelIdx, currentObj);
  }

  function commitChannel(
    chIdx: number,
    data: Partial<MidiChannelConfig> & { soundFontName?: string; presetName?: string }
  ) {
    const partial: Partial<MidiChannelConfig> = {};
    if (data.program !== undefined) partial.program = data.program;
    if (data.bankMsb !== undefined) partial.bankMsb = data.bankMsb;
    if (data.bankLsb !== undefined) partial.bankLsb = data.bankLsb;
    if (data.volume !== undefined) partial.volume = data.volume;
    if (data.pan !== undefined) partial.pan = data.pan;
    if (data.muted !== undefined) partial.muted = data.muted;
    if (data.solo !== undefined) partial.solo = data.solo;
    if (data.isDrum !== undefined) partial.isDrum = data.isDrum;
    if (data.name) partial.name = data.name;

    if (data.soundFontName || data.presetName) {
      partial.customSf2 = {
        fileName: data.soundFontName || globalSoundFont || 'SynthFont2 Bank',
        bankMsb: data.bankMsb ?? 0,
        bankLsb: data.bankLsb ?? 0,
        presetProgram: data.program ?? 0,
        presetName: data.presetName || `Preset ${data.program ?? 0}`,
        loadedAt: new Date().toISOString(),
      };
    }

    updates.push({ channelIndex: chIdx, partial });
  }

  return {
    channels: updates,
    soundFontFile: globalSoundFont,
    detectedCount: updates.length,
  };
}
