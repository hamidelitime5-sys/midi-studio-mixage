import React, { useState, useMemo, useRef } from 'react';
import {
  Sparkles,
  Search,
  Upload,
  FolderOpen,
  Music,
  Play,
  Volume2,
  CheckCircle2,
  Layers,
  Radio,
  Sliders,
  Check,
  AlertCircle,
  Cpu,
  RefreshCw,
  Download,
  Info,
  Drum,
  Guitar,
  Piano,
  ArrowRight,
} from 'lucide-react';
import { MidiChannelConfig, CustomSf2SoundFont, ParsedMidiSong } from '../types/midi';
import { GM_INSTRUMENTS, GM_DRUM_KITS, GM_CATEGORIES } from '../data/gmInstruments';
import { KETRON_SD2_PRESETS, KETRON_SD2_FILE_NAME, createKetronSd2CustomSf2 } from '../data/ketronSd2Presets';
import { parseSf2Header, Sf2PresetInfo } from '../utils/sf2Parser';
import { webAudioSynth } from '../utils/webAudioSynth';
import { webMidi } from '../utils/webMidiService';
import { saveSoundFontToIndexedDB } from '../utils/sf2Storage';
import { generateSynthFont2Def, parseSynthFont2Config } from '../utils/synthFontConfig';
import { InstrumentArtBadge } from './InstrumentArtBadge';

interface Props {
  channels: MidiChannelConfig[];
  song: ParsedMidiSong;
  onUpdateChannel: (channelIndex: number, partial: Partial<MidiChannelConfig>) => void;
  onBatchUpdateChannels: (updates: { channelIndex: number; partial: Partial<MidiChannelConfig> }[]) => void;
  loadedSf2: CustomSf2SoundFont | null;
  onLoadedSf2Change: (sf2: CustomSf2SoundFont | null) => void;
  onOpenScarlettModal: () => void;
  autoMatchOnImport: boolean;
  onToggleAutoMatch: (val: boolean) => void;
}

// Helper to determine category from preset name or GM program
function guessCategory(name: string, prog: number, isDrum: boolean): string {
  if (isDrum) return 'Drums';
  const n = name.toLowerCase();
  if (n.includes('drum') || n.includes('percus') || n.includes('darbuka') || n.includes('riq') || n.includes('bendir') || n.includes('dahola') || n.includes('tabla') || n.includes('cymbal') || n.includes('snare')) return 'Drums';
  if (n.includes('piano') || n.includes('ep ') || n.includes('rhodes') || n.includes('clav') || n.includes('harps') || n.includes('wurl')) return 'Piano';
  if (n.includes('accord') || n.includes('musette') || n.includes('bandoneon') || n.includes('harmonium') || n.includes('cassotto') || n.includes('steirisch') || n.includes('organ') || n.includes('harmonica')) return 'Organ';
  if (n.includes('guitar') || n.includes('gt.') || n.includes('strat') || n.includes('nylon') || n.includes('steel') || n.includes('tele') || n.includes('flamenco') || n.includes('mandolin') || n.includes('banjo')) return 'Guitar';
  if (n.includes('bass') || n.includes('fretless') || n.includes('slap')) return 'Bass';
  if (n.includes('string') || n.includes('violin') || n.includes('cello') || n.includes('viola') || n.includes('contra') || n.includes('orchestr') || n.includes('pizzicato') || n.includes('harp')) return 'Strings';
  if (n.includes('sax') || n.includes('brass') || n.includes('trumpet') || n.includes('trombone') || n.includes('horn') || n.includes('tuba')) return 'Brass';
  if (n.includes('flute') || n.includes('oboe') || n.includes('clarinet') || n.includes('pipe') || n.includes('whistle') || n.includes('recorder') || n.includes('pan flute') || n.includes('shakuhachi')) return 'Flute';
  if (n.includes('oud') || n.includes('sitar') || n.includes('bouzouki') || n.includes('kanoun') || n.includes('qanun') || n.includes('ney') || n.includes('saz') || n.includes('baglama') || n.includes('zurna') || n.includes('oriental') || n.includes('ethnic')) return 'World / Ethnic';
  if (n.includes('lead') || n.includes('pad') || n.includes('synth') || n.includes('saw') || n.includes('square')) return 'Synth';

  // Fallback to GM standard ranges
  if (prog >= 0 && prog <= 7) return 'Piano';
  if (prog >= 8 && prog <= 15) return 'Chromatic Percussion';
  if (prog >= 16 && prog <= 23) return 'Organ';
  if (prog >= 24 && prog <= 31) return 'Guitar';
  if (prog >= 32 && prog <= 39) return 'Bass';
  if (prog >= 40 && prog <= 47) return 'Strings';
  if (prog >= 48 && prog <= 55) return 'Ensemble';
  if (prog >= 56 && prog <= 63) return 'Brass';
  if (prog >= 64 && prog <= 71) return 'Reed';
  if (prog >= 72 && prog <= 79) return 'Pipe';
  if (prog >= 80 && prog <= 95) return 'Synth';
  if (prog >= 104 && prog <= 111) return 'World / Ethnic';
  return 'Other';
}

export const SoundFontLibraryTab: React.FC<Props> = ({
  channels,
  song,
  onUpdateChannel,
  onBatchUpdateChannels,
  loadedSf2,
  onLoadedSf2Change,
  onOpenScarlettModal,
  autoMatchOnImport,
  onToggleAutoMatch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('all');
  const [isParsing, setIsParsing] = useState(false);
  const [auditioningPreset, setAuditioningPreset] = useState<string | null>(null);
  const [lastMatchedCount, setLastMatchedCount] = useState<number | null>(null);
  const [quickTestActive, setQuickTestActive] = useState(false);
  const [sfImportNotice, setSfImportNotice] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sfConfigInputRef = useRef<HTMLInputElement>(null);

  // Check if Ketron SD2 bank is active
  const isKetronActive = Boolean(
    loadedSf2 &&
    (loadedSf2.fileName.toLowerCase().includes('ketron') ||
     loadedSf2.fileName.toLowerCase().includes('sd2') ||
     loadedSf2.fileName === KETRON_SD2_FILE_NAME)
  );

  const handleActivateKetronProfile = () => {
    const ketron = createKetronSd2CustomSf2();
    onLoadedSf2Change(ketron);
    performAutoMatch(ketron.presetsList);
    setSfImportNotice(`✓ Banque ${KETRON_SD2_FILE_NAME} activée et assignée au morceau !`);
    setTimeout(() => setSfImportNotice(null), 4500);
  };

  const handleActivateRolandGm = () => {
    onLoadedSf2Change(null);
    setSfImportNotice('✓ Banque d’usine Roland SC-55 / General MIDI activée !');
    setTimeout(() => setSfImportNotice(null), 3000);
  };

  // Available presets from either loaded SF2 or GM standard factory presets
  const allPresets = useMemo(() => {
    if (loadedSf2?.presetsList && loadedSf2.presetsList.length > 0) {
      return loadedSf2.presetsList.map((p) => ({
        name: p.name,
        program: p.program,
        bank: p.bank,
        isDrum: p.bank === 128 || p.name.toLowerCase().includes('drum') || p.name.toLowerCase().includes('kit'),
        category: guessCategory(
          p.name,
          p.program,
          p.bank === 128 || p.name.toLowerCase().includes('drum')
        ),
      }));
    }

    // Default built-in bank (Roland SC-55 / GM Essentials)
    const gmList = GM_INSTRUMENTS.map((inst) => ({
      name: inst.name,
      program: inst.id,
      bank: 0,
      isDrum: false,
      category: inst.category,
    }));

    const drumList = GM_DRUM_KITS.map((drum) => ({
      name: drum.name,
      program: drum.id,
      bank: 128,
      isDrum: true,
      category: 'Drums',
    }));

    return [...gmList, ...drumList];
  }, [loadedSf2]);

  // Unique banks list in current soundfont
  const availableBanks = useMemo(() => {
    const banks = new Set<number>();
    allPresets.forEach((p) => banks.add(p.bank));
    return Array.from(banks).sort((a, b) => a - b);
  }, [allPresets]);

  // Filtered presets
  const filteredPresets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allPresets.filter((p) => {
      // Text match
      const matchesText =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.program.toString() === q ||
        `p${p.program}` === q ||
        `b${p.bank}` === q ||
        p.category.toLowerCase().includes(q);

      // Category match
      let matchesCat = true;
      if (selectedCategory !== 'All') {
        if (selectedCategory === 'Drums') {
          matchesCat = p.isDrum || p.category === 'Drums';
        } else if (selectedCategory === 'Piano') {
          matchesCat = p.category === 'Piano' || p.name.toLowerCase().includes('piano');
        } else if (selectedCategory === 'Guitar') {
          matchesCat = p.category === 'Guitar' || p.name.toLowerCase().includes('guitar');
        } else if (selectedCategory === 'Bass') {
          matchesCat = p.category === 'Bass' || p.name.toLowerCase().includes('bass');
        } else if (selectedCategory === 'Brass') {
          matchesCat =
            p.category === 'Brass' ||
            p.category === 'Reed' ||
            p.category === 'Pipe' ||
            p.name.toLowerCase().includes('sax');
        } else if (selectedCategory === 'Strings') {
          matchesCat =
            p.category === 'Strings' ||
            p.category === 'Ensemble' ||
            p.name.toLowerCase().includes('string');
        } else if (selectedCategory === 'Synth') {
          matchesCat = p.category === 'Synth' || p.name.toLowerCase().includes('synth');
        } else if (selectedCategory === 'Accordion') {
          matchesCat =
            p.category === 'Organ' ||
            p.name.toLowerCase().includes('accord') ||
            p.name.toLowerCase().includes('musette') ||
            p.name.toLowerCase().includes('bandoneon') ||
            p.name.toLowerCase().includes('harmonium');
        } else if (selectedCategory === 'World') {
          matchesCat =
            p.category === 'World / Ethnic' ||
            p.name.toLowerCase().includes('oriental') ||
            p.name.toLowerCase().includes('oud') ||
            p.name.toLowerCase().includes('darbuka') ||
            p.name.toLowerCase().includes('riq') ||
            p.name.toLowerCase().includes('bendir') ||
            p.name.toLowerCase().includes('bouzouki') ||
            p.name.toLowerCase().includes('kanoun') ||
            p.name.toLowerCase().includes('saz');
        }
      }

      // Bank filter
      let matchesBank = true;
      if (selectedBankFilter !== 'all') {
        matchesBank = p.bank === parseInt(selectedBankFilter, 10);
      }

      return matchesText && matchesCat && matchesBank;
    });
  }, [allPresets, searchQuery, selectedCategory, selectedBankFilter]);

  // Shared processor for .sf2 file (from input or drag & drop)
  const processSf2File = async (file: File) => {
    setIsParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const meta = parseSf2Header(buffer);

      const newSf2: CustomSf2SoundFont = {
        fileName: file.name,
        fileSize: file.size,
        bankMsb: meta.presets[0]?.bank || 0,
        bankLsb: 0,
        presetProgram: meta.presets[0]?.program || 0,
        presetName: meta.presets[0]?.name || file.name,
        loadedAt: new Date().toISOString(),
        presetsList: meta.presets.map((p) => ({
          name: p.name,
          program: p.program,
          bank: p.bank,
        })),
      };

      onLoadedSf2Change(newSf2);

      // Load PCM samples into webAudioSynth for direct standalone audio playback
      webAudioSynth.loadSoundFontMetadata(meta);

      // Persist user's SoundFont into IndexedDB for persistent retention across sessions
      try {
        await saveSoundFontToIndexedDB(file.name, meta.bankName || file.name, buffer);
      } catch (storeErr) {
        console.warn('Could not cache SF2 in IndexedDB:', storeErr);
      }

      // Auto-match immediately if option is active
      if (autoMatchOnImport) {
        performAutoMatch(newSf2.presetsList);
      }

      setSfImportNotice(`✓ Fichier ${file.name} chargé (${((file.size) / (1024 * 1024)).toFixed(1)} Mo) !`);
      setTimeout(() => setSfImportNotice(null), 5000);
    } catch (err) {
      console.error('Erreur lecture SF2:', err);
      setSfImportNotice(`⚠️ Erreur lecture fichier ${file.name}`);
      setTimeout(() => setSfImportNotice(null), 5000);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // File Upload handler for .sf2
  const handleSf2Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processSf2File(file);
    }
  };

  const handleDropSf2 = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.toLowerCase().endsWith('.sf2') || file.name.toLowerCase().endsWith('.soundfont'))) {
      await processSf2File(file);
    }
  };

  // Perform smart auto-matching of SF2 presets to the active MIDI song
  const performAutoMatch = (
    presetListToUse: { name: string; program: number; bank: number }[] = allPresets
  ) => {
    const updates: { channelIndex: number; partial: Partial<MidiChannelConfig> }[] = [];
    let matched = 0;

    channels.forEach((ch, idx) => {
      // Find candidate preset for this channel
      let bestPreset: { name: string; program: number; bank: number } | null = null;
      const roleLower = (ch.roleTitle || '').toLowerCase();
      const chNameLower = ch.name.toLowerCase();

      if (ch.isDrum || idx === 9) {
        // Find best drum preset (bank 128 or name drum)
        bestPreset =
          presetListToUse.find((p) => p.bank === 128 && p.name.toLowerCase().includes('drum')) ||
          presetListToUse.find((p) => p.bank === 128) ||
          presetListToUse.find((p) => p.name.toLowerCase().includes('drum') || p.name.toLowerCase().includes('standard')) ||
          presetListToUse[0] ||
          null;
      } else if (
        roleLower.includes('percussion orienta') ||
        chNameLower.includes('percussion orienta') ||
        roleLower.includes('percussions divers') ||
        ch.program === 118
      ) {
        // Oriental Percussion Kits (Darbuka / Riq / Bendir / Tabla)
        bestPreset =
          presetListToUse.find((p) => p.name.toLowerCase().includes('oriental') && p.name.toLowerCase().includes('percussion')) ||
          presetListToUse.find((p) => p.name.toLowerCase().includes('darbuka') || p.name.toLowerCase().includes('tabla')) ||
          presetListToUse.find((p) => p.bank === 128) ||
          presetListToUse.find((p) => p.program === ch.program) ||
          null;
      } else if (
        roleLower.includes('accordéon') ||
        roleLower.includes('accordeon') ||
        chNameLower.includes('accord') ||
        ch.program === 21 ||
        ch.program === 22 ||
        ch.program === 23
      ) {
        // Accordions
        bestPreset =
          presetListToUse.find((p) => p.name.toLowerCase().includes('musette')) ||
          presetListToUse.find((p) => p.name.toLowerCase().includes('accordion') || p.name.toLowerCase().includes('accordéon')) ||
          presetListToUse.find((p) => p.name.toLowerCase().includes('bandoneon')) ||
          presetListToUse.find((p) => p.program === 21) ||
          null;
      } else if (
        roleLower.includes('instrument oriental') ||
        roleLower.includes('instruments orient') ||
        chNameLower.includes('oriental') ||
        chNameLower.includes('oud')
      ) {
        // Oriental Lead / Plucked
        bestPreset =
          presetListToUse.find((p) => p.name.toLowerCase().includes('oud')) ||
          presetListToUse.find((p) => p.name.toLowerCase().includes('bouzouki')) ||
          presetListToUse.find((p) => p.name.toLowerCase().includes('kanoun') || p.name.toLowerCase().includes('saz')) ||
          presetListToUse.find((p) => guessCategory(p.name, p.program, p.bank === 128) === 'World / Ethnic') ||
          null;
      } else {
        // 1. Try exact matching by program and bank 0
        bestPreset =
          presetListToUse.find((p) => p.program === ch.program && p.bank === 0) ||
          presetListToUse.find((p) => p.program === ch.program) ||
          null;

        // 2. If not found, fuzzy match by channel name or role keywords
        if (!bestPreset) {
          bestPreset =
            presetListToUse.find((p) => chNameLower.includes(p.name.toLowerCase())) ||
            presetListToUse.find((p) => roleLower.includes(p.name.toLowerCase())) ||
            presetListToUse.find((p) => {
              const cat = guessCategory(p.name, p.program, false);
              return chNameLower.includes(cat.toLowerCase()) || roleLower.includes(cat.toLowerCase());
            }) ||
            presetListToUse[0] ||
            null;
        }
      }

      if (bestPreset) {
        matched++;
        const customSf2: CustomSf2SoundFont = {
          fileName: loadedSf2?.fileName || 'SoundFont Standard',
          bankMsb: bestPreset.bank,
          bankLsb: 0,
          presetProgram: bestPreset.program,
          presetName: bestPreset.name,
          loadedAt: new Date().toISOString(),
        };

        updates.push({
          channelIndex: idx,
          partial: {
            program: bestPreset.program,
            bankMsb: bestPreset.bank,
            bankLsb: 0,
            customSf2,
            name: `${ch.roleTitle ? ch.roleTitle.split('/')[0].trim() : 'Piste'} - ${bestPreset.name}`,
          },
        });
      }
    });

    if (updates.length > 0) {
      onBatchUpdateChannels(updates);
      setLastMatchedCount(matched);
      setTimeout(() => setLastMatchedCount(null), 4000);
    }
  };

  // Preview an instrument note
  const handleAudition = async (p: { program: number; bank: number; isDrum: boolean }) => {
    const key = `${p.bank}-${p.program}`;
    setAuditioningPreset(key);

    try {
      // 1. Web Audio direct preview with accurate bank (authentic SF2 sample)
      await webAudioSynth.playPreviewNote(p.program, p.isDrum, p.isDrum ? 36 : 60, p.bank);

      // 2. Web MIDI test audition for SynthFont2
      webMidi.sendProgramChange(0, p.program, p.bank, 0);
      webMidi.testAudition(0, p.isDrum ? 36 : 60, 500);
    } finally {
      setTimeout(() => setAuditioningPreset(null), 500);
    }
  };

  // Assign preset to a specific channel
  const handleAssignToChannel = (channelIdx: number, p: { name: string; program: number; bank: number; isDrum: boolean }) => {
    const ch = channels[channelIdx];
    const customSf2: CustomSf2SoundFont = {
      fileName: loadedSf2?.fileName || 'Banque SF2 Active',
      bankMsb: p.bank,
      bankLsb: 0,
      presetProgram: p.program,
      presetName: p.name,
      loadedAt: new Date().toISOString(),
    };

    onUpdateChannel(channelIdx, {
      program: p.program,
      bankMsb: p.bank,
      bankLsb: 0,
      isDrum: p.isDrum,
      customSf2,
      name: `${ch.roleTitle ? ch.roleTitle.split('/')[0].trim() : `Piste ${channelIdx + 1}`} - ${p.name}`,
    });

    // Test audible feedback
    handleAudition(p);
  };

  // Direct test sound on audio output (Bip + Accord C4 sur Scarlett Solo)
  const handleDirectSoundTest = async () => {
    if (quickTestActive) return;
    setQuickTestActive(true);
    try {
      await webAudioSynth.playDirectScarlettBeep();
    } finally {
      setTimeout(() => setQuickTestActive(false), 900);
    }
  };

  // Import SynthFont2 (.def, .sfarr, .ini) configuration
  const handleImportSynthFontDef = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const result = parseSynthFont2Config(text);
        onBatchUpdateChannels(result.channels);
        setSfImportNotice(`✓ ${result.detectedCount} pistes configurées depuis ${file.name} !`);
        setTimeout(() => setSfImportNotice(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export SynthFont2 (.def) configuration
  const handleExportSynthFontDef = () => {
    const content = generateSynthFont2Def(channels);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'SynthFont2_Band_Channels_Config.def';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="soundfont-library-tab" className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner: SoundFont Bank Overview & Actions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 flex items-center justify-center shadow-lg shadow-amber-600/20 shrink-0">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-slate-100 uppercase tracking-tight font-display">
                  Gestionnaire de Banques SF2 & Presets
                </h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {loadedSf2 ? 'Banque SF2 Personnalisée' : 'Banque GM/GS Usine'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {allPresets.length} presets
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {loadedSf2
                  ? `Fichier chargé : ${loadedSf2.fileName} (${((loadedSf2.fileSize || 0) / (1024 * 1024)).toFixed(1)} Mo)`
                  : 'Banque d’instruments haute compatibilité Roland SC-55 / General MIDI & Drums'}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {sfImportNotice && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold animate-pulse shadow-sm">
                {sfImportNotice}
              </span>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".sf2,.SF2"
              className="hidden"
              onChange={handleSf2Upload}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              {isParsing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{isParsing ? 'Lecture SF2...' : 'Charger ma grande banque .SF2'}</span>
            </button>

            {/* Hidden Input for SynthFont2 Import */}
            <input
              ref={sfConfigInputRef}
              type="file"
              accept=".def,.sfarr,.ini,.txt"
              className="hidden"
              onChange={handleImportSynthFontDef}
            />

            {/* Import SynthFont2 Button */}
            <button
              type="button"
              onClick={() => sfConfigInputRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              title="Importer une table de configuration SynthFont2 (.def, .sfarr, .ini)"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import SynthFont2</span>
            </button>

            {/* Export SynthFont2 Button */}
            <button
              type="button"
              onClick={handleExportSynthFontDef}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              title="Exporter la table de configuration SynthFont2 (.def)"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export SynthFont2</span>
            </button>

            {/* Quick Test Audio output */}
            <button
              type="button"
              onClick={handleDirectSoundTest}
              disabled={quickTestActive}
              className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
              title="Vérifier la sortie son dans votre Focusrite Scarlett Solo (Bip + Accord C4)"
            >
              <Volume2 className="w-4 h-4" />
              <span>{quickTestActive ? 'Bip Scarlett...' : 'Tester le Son'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenScarlettModal}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Radio className="w-4 h-4 text-red-400" />
              <span>Réglages Scarlett ASIO</span>
            </button>
          </div>
        </div>
      </div>

      {/* KETRON SD2 DEDICATED SOUND BANK MODULE */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDropSf2}
        className={`rounded-2xl p-4 sm:p-5 border-2 transition-all relative overflow-hidden shadow-2xl ${
          isDraggingOver
            ? 'border-amber-400 bg-amber-500/20 scale-[1.01]'
            : isKetronActive
            ? 'border-amber-500/70 bg-gradient-to-br from-slate-900 via-amber-950/30 to-slate-950 shadow-amber-500/10'
            : 'border-slate-800 bg-slate-900/90'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex flex-col items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider leading-none">KETRON</span>
              <span className="text-xl font-black leading-none mt-0.5">SD2</span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-100 font-display flex items-center gap-2">
                  Banque Ketron SD2 : <span className="text-amber-400 font-mono">E-KETRON-SD2-SBA-1.0.7b_2.sf2</span>
                </h3>
                {isKetronActive ? (
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm">
                    <Check className="w-3.5 h-3.5" /> Active & Prête
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Disponible en 1 clic
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                Banque SoundFont studio Ketron SD2 SBA : accordéons italiens (Musette, Castelfidardo, Raï), saxophones acoustiques dynamiques, guitares flamenco/stratocaster, cuivres solos, et percussions orientales (Darbuka, Riq, Bendir).
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-amber-300">
                  {isKetronActive && loadedSf2?.fileSize
                    ? `Fichier physique chargé : ${((loadedSf2.fileSize) / (1024 * 1024)).toFixed(1)} Mo`
                    : 'Profil officiel Ketron SD2 SBA (100+ presets mappés)'}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300 font-medium">
                  💡 Glissez votre fichier <code className="font-mono text-amber-300">E-KETRON-SD2-SBA-1.0.7b_2.sf2</code> ci-dessous pour charger les échantillons PCM réels de votre PC.
                </span>
              </div>
            </div>
          </div>

          {/* Buttons on the right */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!isKetronActive ? (
              <button
                type="button"
                onClick={handleActivateKetronProfile}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Activer E-KETRON-SD2-SBA-1.0.7b_2</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleActivateRolandGm}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                title="Basculer temporairement sur la banque Roland SC-55"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Banque GM Usine</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/50 font-bold text-xs flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
              title="Parcourir votre ordinateur pour charger le fichier physique E-KETRON-SD2-SBA-1.0.7b_2.sf2"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span>{isParsing ? 'Lecture...' : 'Charger mon fichier .sf2'}</span>
            </button>

            <button
              type="button"
              onClick={() => performAutoMatch()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
              title="Adapter automatiquement tous les instruments Ketron au morceau actif"
            >
              <Sparkles className="w-4 h-4" />
              <span>Auto-Assigner au Morceau</span>
            </button>
          </div>
        </div>

        {/* Drag & Drop Hint Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="mt-3.5 border-2 border-dashed border-amber-500/30 hover:border-amber-400 bg-slate-950/40 hover:bg-amber-500/5 rounded-xl p-3 flex items-center justify-center gap-2.5 text-center cursor-pointer transition-colors"
        >
          <FolderOpen className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs text-slate-300">
            <strong className="text-amber-300">Glisser-déposer ici</strong> votre fichier <code className="font-mono text-amber-200">E-KETRON-SD2-SBA-1.0.7b_2.sf2</code> ou cliquez pour sélectionner sur votre disque dur
          </span>
        </div>
      </div>

      {/* Section 1: Auto-Matching Intelligence for Current Song */}
      <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border-2 border-indigo-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  ⚡ Auto-Sélection des Instruments pour « {song.title || 'Morceau MIDI'} »
                </h3>
                {lastMatchedCount !== null && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 animate-pulse">
                    ✓ {lastMatchedCount} pistes adaptées !
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                L'algorithme analyse les programmes MIDI de chaque piste et sélectionne automatiquement le meilleur instrument dans votre banque SF2.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none bg-slate-950/50 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <input
                type="checkbox"
                checked={autoMatchOnImport}
                onChange={(e) => onToggleAutoMatch(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Auto-adapter à chaque import MIDI</span>
            </label>

            <button
              type="button"
              onClick={() => performAutoMatch()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>Auto-Assigner la Banque SF2 au Morceau</span>
            </button>
          </div>
        </div>

        {/* Current Song Tracks Auto-Match Preview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {channels.slice(0, 12).map((ch, idx) => {
            const currentPresetName = ch.customSf2?.presetName || GM_INSTRUMENTS.find((i) => i.id === ch.program)?.name || 'Instrument';
            const isDrum = ch.isDrum || idx === 9;

            return (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors space-y-2 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-[10px] font-mono font-bold text-amber-400">
                      {idx + 1}
                    </div>
                    <span className="text-xs font-bold text-slate-200 truncate max-w-[120px]">
                      {ch.roleTitle || `Piste ${idx + 1}`}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Prog {ch.program}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">
                    Preset SF2 Assigné
                  </span>
                  <div className="text-xs font-medium text-amber-300 truncate">
                    {currentPresetName}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleAudition({ program: ch.program, bank: ch.bankMsb, isDrum })}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300 flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <Play className="w-3 h-3 fill-current text-indigo-400" />
                    <span>Écouter</span>
                  </button>

                  <select
                    value={`${ch.bankMsb}-${ch.program}`}
                    onChange={(e) => {
                      const [bStr, pStr] = e.target.value.split('-');
                      const targetPreset = allPresets.find(
                        (p) => p.bank === parseInt(bStr, 10) && p.program === parseInt(pStr, 10)
                      );
                      if (targetPreset) {
                        handleAssignToChannel(idx, targetPreset);
                      }
                    }}
                    className="flex-1 py-1 px-1 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 focus:outline-none cursor-pointer truncate"
                  >
                    <option value={`${ch.bankMsb}-${ch.program}`}>Changer...</option>
                    {allPresets.map((p, pIdx) => (
                      <option key={`${p.bank}-${p.program}-${pIdx}`} value={`${p.bank}-${p.program}`}>
                        B{p.bank}:P{p.program} {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Search Engine & Preset Browser */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Moteur de Recherche de Presets SF2
              </h3>
              <p className="text-xs text-slate-400">
                Trouvez n'importe quel instrument dans votre grande banque SF2 et assignez-le à la piste de votre choix.
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher (ex: Rhodes, Sax, Strat, 032, Drum...)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Categories Pills & Bank Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'All', label: 'Tous les instruments' },
              { id: 'Accordion', label: '🪗 Accordéons & Orgues' },
              { id: 'World', label: '🪕 Orient / Ethnic' },
              { id: 'Piano', label: '🎹 Pianos & Claviers' },
              { id: 'Guitar', label: '🎸 Guitares' },
              { id: 'Bass', label: '🎻 Basses' },
              { id: 'Brass', label: '🎺 Cuivres & Vents' },
              { id: 'Strings', label: '🎻 Cordes & Orch.' },
              { id: 'Synth', label: '🎛️ Synthés & Pads' },
              { id: 'Drums', label: '🥁 Batteries & Percs' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Bank selector filter */}
          {availableBanks.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">Banque :</span>
              <select
                value={selectedBankFilter}
                onChange={(e) => setSelectedBankFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="all">Toutes les banques</option>
                {availableBanks.map((b) => (
                  <option key={b} value={b.toString()}>
                    Banque MSB {b} {b === 128 ? '(Drums)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Counter & Active filter status */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Affichage de <strong className="text-amber-400">{filteredPresets.length}</strong> instruments sur{' '}
            {allPresets.length} au total
          </span>
          {searchQuery && (
            <span>
              Filtre actif : « <span className="text-slate-200">{searchQuery}</span> »
            </span>
          )}
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[500px] overflow-y-auto p-1 custom-console-scroll">
          {filteredPresets.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 space-y-2">
              <Search className="w-8 h-8 mx-auto text-slate-600" />
              <p>Aucun preset SF2 ne correspond à votre recherche.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedBankFilter('all');
                }}
                className="text-amber-400 hover:underline text-xs"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            filteredPresets.map((p, idx) => {
              const isAuditioning = auditioningPreset === `${p.bank}-${p.program}`;
              const assignedChannels = channels
                .map((c, i) => (c.program === p.program && (c.bankMsb === p.bank || (!c.customSf2 && p.bank === 0)) ? i + 1 : null))
                .filter((x): x is number => x !== null);

              return (
                <div
                  key={`${p.bank}-${p.program}-${idx}`}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 hover:border-amber-500/50 hover:bg-slate-900/60 transition-all flex flex-col justify-between gap-2.5 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition-colors line-clamp-1">
                        {p.name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0 border border-slate-700">
                        B:{p.bank} P:{p.program}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {p.category}
                      </span>
                      {assignedChannels.length > 0 && (
                        <span className="text-[9px] text-emerald-400 bg-emerald-950/60 border border-emerald-700/40 px-1.5 py-0.5 rounded font-bold">
                          ✓ Piste {assignedChannels.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions: Audition & Assign to track */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleAudition(p)}
                      disabled={isAuditioning}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                      title="Écouter cet instrument"
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isAuditioning ? 'text-amber-400 animate-bounce' : 'text-indigo-400'}`} />
                      <span>{isAuditioning ? '...' : 'Écouter'}</span>
                    </button>

                    {/* Direct Assign to Channel Dropdown */}
                    <div className="flex-1 relative">
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '') {
                            handleAssignToChannel(parseInt(val, 10), p);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                        className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-lg px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer transition-colors"
                      >
                        <option value="" disabled>
                          Assigner à...
                        </option>
                        {channels.slice(0, 12).map((c, chIdx) => (
                          <option key={chIdx} value={chIdx}>
                            Piste {chIdx + 1} ({c.roleTitle ? c.roleTitle.split('/')[0].trim() : `CH ${chIdx + 1}`})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Section 3: Scarlett Solo ASIO & Sound Output Troubleshooting */}
      <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Résolution Sortie Son Focusrite Scarlett Solo / ASIO</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/20 text-red-300 font-mono border border-red-500/30">
                Diagnostic Audio
              </span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Si vous n'entendez pas de son dans votre Focusrite Scarlett Solo, vérifiez ces 2 modes :
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <span>Mode 1 : Synthétiseur Intégré (Tauri / Direct)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Le synthétiseur de l'application envoie l'audio directement à Windows. Cliquez sur le bouton ci-dessous pour envoyer un accord de test et vérifier que la sortie est bien orientée sur la Scarlett Solo.
            </p>
            <button
              type="button"
              onClick={handleDirectSoundTest}
              className="mt-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Tester Sortie Son Directe (Scarlett Solo)</span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="font-bold text-indigo-300 flex items-center gap-1.5">
              <span>Mode 2 : Sortie ASIO avec SynthFont2</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Dans SynthFont2 sur votre PC : allez dans le menu <strong>Setup &gt; Options &gt; Audio</strong>, et sous <em>Audio Device</em>, sélectionnez <strong>Focusrite USB ASIO</strong>. Dans MIDI In, cochez votre port <strong>loopMIDI / LoopBe1</strong>.
            </p>
            <button
              type="button"
              onClick={onOpenScarlettModal}
              className="mt-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium flex items-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 text-red-400" />
              <span>Ouvrir panneau Scarlett Solo ASIO</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
