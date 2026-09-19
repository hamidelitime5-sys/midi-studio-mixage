import { MidiChannelConfig } from '../types/midi';

export interface BandChannelDefinition {
  channelIndex: number; // 0-15
  trackNumber: number; // 1-16
  roleTitle: string; // e.g. "Pianiste / Claviste"
  shortRole: string; // e.g. "Piano / Claviers"
  instrumentDefault: string; // e.g. "Grand Piano & Claviers"
  program: number; // General MIDI default
  bankMsb: number;
  bankLsb: number;
  isDrum: boolean;
  categoryTag: string;
  accentColor: string; // Tailwind color or hex
  glowColor: string;
  iconKey: string;
  defaultDescription: string;
}

export const BAND_CHANNELS_TEMPLATE: BandChannelDefinition[] = [
  {
    channelIndex: 0,
    trackNumber: 1,
    roleTitle: 'Pianiste / Claviste',
    shortRole: 'Piano / Claviers',
    instrumentDefault: 'Piano à queue & Claviers',
    program: 0, // Acoustic Grand Piano (or Prog 4 Rhodes)
    bankMsb: 0,
    bankLsb: 0,
    isDrum: false,
    categoryTag: 'Claviers',
    accentColor: '#f59e0b', // Amber / Gold
    glowColor: 'rgba(245, 158, 11, 0.4)',
    iconKey: 'piano',
    defaultDescription: 'Piano acoustique, Rhodes, Synthé polyphonique',
  },
  {
    channelIndex: 1,
    trackNumber: 2,
    roleTitle: 'Bassiste / Contrebassiste',
    shortRole: 'Basse / Contrebasse',
    instrumentDefault: 'Basse électrique & Contrebasse',
    program: 33, // Electric Bass (Finger) / Prog 32 Acoustic Bass
    bankMsb: 0,
    bankLsb: 0,
    isDrum: false,
    categoryTag: 'Basse',
    accentColor: '#3b82f6', // Blue
    glowColor: 'rgba(59, 130, 246, 0.4)',
    iconKey: 'bass',
    defaultDescription: 'Basse électrique 4/5 cordes, Contrebasse jazz & slap',
  },
  {
    channelIndex: 2,
    trackNumber: 3,
    roleTitle: 'Cuivre Solo',
    shortRole: 'Cuivre Solo',
    instrumentDefault: 'Trompette, Saxophone & Trombone',
    program: 56, // Trumpet (or 65 Alto Sax)
    bankMsb: 0,
    bankLsb: 0,
    isDrum: false,
    categoryTag: 'Cuivres',
    accentColor: '#f97316', // Orange brass
    glowColor: 'rgba(249, 115, 22, 0.4)',
    iconKey: 'brass_solo',
    defaultDescription: 'Trompette solo, Saxophone alto/ténor, Trombone à coulisse',
  },
  {
    channelIndex: 3,
    trackNumber: 4,
    roleTitle: 'Brass Ensemble',
    shortRole: 'Section Cuivres',
    instrumentDefault: 'Section Cuivres & Synth Brass',
    program: 61, // Brass Section
    bankMsb: 0,
    bankLsb: 0,
    isDrum: false,
    categoryTag: 'Cuivres',
    accentColor: '#ef4444', // Red / Crimson Horns
    glowColor: 'rgba(239, 68, 68, 0.4)',
    iconKey: 'brass_ensemble',
    defaultDescription: 'Section cuivres complète, Fanfare, Synth Brass 80s',
  },
  {
    channelIndex: 4,
    trackNumber: 5,
    roleTitle: 'Instrument à vent / Flûte',
    shortRole: 'Flûte / Vents',
    instrumentDefault: 'Flûte traversière & Clarinette',
    program: 73, // Flute
    bankMsb: 0,
    bankLsb: 0,
    isDrum: false,
    categoryTag: 'Bois & Vents',
    accentColor: '#10b981', // Emerald
    glowColor: 'rgba(16, 185, 129, 0.4)',
    iconKey: 'flute',
    defaultDescription: 'Flûte traversière concert, Clarinette, Piccolo, Hautbois',
  },
  {
    channelIndex: 5,
    trackNumber: 6,
    roleTitle: 'Accordéon',
    shortRole: 'Accordéon',
    instrumentDefault: 'Accordéon Musette & Bandonéon',
    program: 21, // Accordion
    bankMsb: 0,
    bankLsb: 0,
    isDrum: false,
    categoryTag: 'Accordéon',
    accentColor: '#06b6d4', // Cyan
    glowColor: 'rgba(6, 182, 212, 0.4)',
    iconKey: 'accordion',
    defaultDescription: 'Accordéon musette chromatique, Bandonéon tango, Harmonica',
  },
  {
    channelIndex: 6,
    trackNumber: 7,
    roleTitle: 'Guitares diverses',
    shortRole: 'Guitares',
    instrumentDefault: 'Guitare Acoustique & Électrique',
    program: 25, // Acoustic Guitar (Steel)
    bankMsb: 0,
    bankLsb: 0,
    isDrum: false,
    categoryTag: 'Guitares',
    accentColor: '#8b5cf6', // Violet
    glowColor: 'rgba(139, 92, 246, 0.4)',
    iconKey: 'guitar',
    defaultDescription: 'Guitare acoustique nylon/folk, Guitare électrique clean/overdrive',
  },
  {
    channelIndex: 7,
    trackNumber: 8,
    roleTitle: 'Instruments Orientaux',
    shortRole: 'Orientaux',
    instrumentDefault: 'Oud, Qanun, Nay & Saz',
    program: 104, // Sitar / Oud emulation in General MIDI (or custom SF2)
    bankMsb: 0,
    bankLsb: 0,
    isDrum: false,
    categoryTag: 'Oriental',
    accentColor: '#ec4899', // Pink / Rose Orientale
    glowColor: 'rgba(236, 72, 153, 0.4)',
    iconKey: 'oud',
    defaultDescription: 'Oud oriental, Qanun à cordes pincées, Flûte Nay, Bouzouki, Saz',
  },
  {
    channelIndex: 8,
    trackNumber: 9,
    roleTitle: 'Instrument Atmosphère',
    shortRole: 'Atmosphère / Pads',
    instrumentDefault: 'Synth Pad, Nappes & Strings',
    program: 89, // Warm Pad (or 48 String Ensemble)
    bankMsb: 0,
    bankLsb: 0,
    isDrum: false,
    categoryTag: 'Ambiance',
    accentColor: '#6366f1', // Indigo
    glowColor: 'rgba(99, 102, 241, 0.4)',
    iconKey: 'atmosphere',
    defaultDescription: 'Nappes de synthé atmosphériques, Cordes célestes, Sweeps cosmiques',
  },
  {
    channelIndex: 9,
    trackNumber: 10,
    roleTitle: 'Batterie',
    shortRole: 'Batterie',
    instrumentDefault: 'Drum Kit Acoustique Standard',
    program: 0, // Standard Kit
    bankMsb: 128, // Standard SF2 Drum Bank
    bankLsb: 0,
    isDrum: true,
    categoryTag: 'Batterie',
    accentColor: '#eab308', // Gold / Drum Cymbal
    glowColor: 'rgba(234, 179, 8, 0.4)',
    iconKey: 'drums',
    defaultDescription: 'Batterie complète (Grosse caisse, caisse claire, toms, charleston, cymbales)',
  },
  {
    channelIndex: 10,
    trackNumber: 11,
    roleTitle: 'Percussions Diverses',
    shortRole: 'Percussions',
    instrumentDefault: 'Congas, Bongos, Shakers & Tambourin',
    program: 115, // Woodblock / Percussion
    bankMsb: 0,
    bankLsb: 0,
    isDrum: false,
    categoryTag: 'Percussions',
    accentColor: '#14b8a6', // Teal
    glowColor: 'rgba(20, 184, 166, 0.4)',
    iconKey: 'percussion',
    defaultDescription: 'Congas cubaines, Bongos, Shakers, Tambourin, Claves, Cloche à vache',
  },
  {
    channelIndex: 11,
    trackNumber: 12,
    roleTitle: 'Percussion Orientale',
    shortRole: 'Percu Orientale',
    instrumentDefault: 'Darbouka, Riq, Bendir & Sagat',
    program: 116, // Taiko Drum / World Percussion (or dedicated SF2)
    bankMsb: 0,
    bankLsb: 0,
    isDrum: false,
    categoryTag: 'Percu Orientale',
    accentColor: '#d97706', // Warm Amber / Copper Darbouka
    glowColor: 'rgba(217, 119, 6, 0.4)',
    iconKey: 'darbouka',
    defaultDescription: 'Darbouka égyptienne/turque, Tambourin Riq à cymbalettes, Bendir sur cadre',
  },
  {
    channelIndex: 12,
    trackNumber: 13,
    roleTitle: 'Au choix 1 (Soliste / Voix)',
    shortRole: 'Soliste / Lead',
    instrumentDefault: 'Synth Lead & Voix Guide',
    program: 81, // Lead 2 (Sawtooth)
    bankMsb: 0,
    bankLsb: 0,
    isDrum: false,
    categoryTag: 'Soliste',
    accentColor: '#a855f7', // Purple
    glowColor: 'rgba(168, 85, 247, 0.4)',
    iconKey: 'vocal_lead',
    defaultDescription: 'Piste libre : Soliste synthé, chant lead, saxophone invité',
  },
  {
    channelIndex: 13,
    trackNumber: 14,
    roleTitle: 'Au choix 2 (Chœurs / Harmonies)',
    shortRole: 'Chœurs / Harmonies',
    instrumentDefault: 'Chœurs Aahs & Oohs',
    program: 52, // Choir Aahs
    bankMsb: 0,
    bankLsb: 0,
    isDrum: false,
    categoryTag: 'Chœurs',
    accentColor: '#38bdf8', // Sky Blue
    glowColor: 'rgba(56, 189, 248, 0.4)',
    iconKey: 'choir',
    defaultDescription: 'Piste libre : Chœurs d’accompagnement, arpèges polyphoniques',
  },
  {
    channelIndex: 14,
    trackNumber: 15,
    roleTitle: 'Au choix 3 (Effets Spéciaux / FX)',
    shortRole: 'Effets / FX',
    instrumentDefault: 'Effets Spéciaux & Samples FX',
    program: 98, // FX Crystal
    bankMsb: 0,
    bankLsb: 0,
    isDrum: false,
    categoryTag: 'Effets FX',
    accentColor: '#fb923c', // Tangerine
    glowColor: 'rgba(251, 146, 60, 0.4)',
    iconKey: 'fx',
    defaultDescription: 'Piste libre : Bruits de scène, transitions sonores, drops, lasers',
  },
  {
    channelIndex: 15,
    trackNumber: 16,
    roleTitle: 'Au choix 4 (Guide / Clic)',
    shortRole: 'Guide / Clic',
    instrumentDefault: 'Métronome & Guide Piste',
    program: 115, // Woodblock
    bankMsb: 0,
    bankLsb: 0,
    isDrum: false,
    categoryTag: 'Guide',
    accentColor: '#64748b', // Slate
    glowColor: 'rgba(100, 116, 139, 0.4)',
    iconKey: 'click',
    defaultDescription: 'Piste libre : Clic métronome pour batteur, compte à rebours, cues audio',
  },
];

// Helper to generate a full 16-channel config pre-mapped to the user's band template
export function createBandTemplateChannels(existingChannels?: MidiChannelConfig[]): MidiChannelConfig[] {
  return BAND_CHANNELS_TEMPLATE.map((tpl, i) => {
    const existing = existingChannels?.[i];
    return {
      channel: i,
      name: tpl.instrumentDefault,
      roleTitle: tpl.roleTitle,
      categoryTag: tpl.categoryTag,
      iconKey: tpl.iconKey,
      customImageUrl: existing?.customImageUrl,
      program: existing?.program !== undefined ? existing.program : tpl.program,
      bankMsb: existing?.bankMsb !== undefined ? existing.bankMsb : tpl.bankMsb,
      bankLsb: existing?.bankLsb !== undefined ? existing.bankLsb : tpl.bankLsb,
      isDrum: tpl.isDrum,
      volume: existing?.volume !== undefined ? existing.volume : 100,
      pan: existing?.pan !== undefined ? existing.pan : 64,
      muted: existing?.muted || false,
      solo: existing?.solo || false,
      activeNoteCount: 0,
      lastActivityTime: 0,
      customSf2: existing?.customSf2,
    };
  });
}
