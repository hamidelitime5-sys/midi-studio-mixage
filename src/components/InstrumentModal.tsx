import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Music,
  Play,
  Check,
  Upload,
  FolderOpen,
  Sparkles,
  FileMusic,
  Layers,
  Trash2,
  FileCheck,
} from 'lucide-react';
import { GM_INSTRUMENTS, GM_DRUM_KITS, GM_CATEGORIES } from '../data/gmInstruments';
import { MidiChannelConfig, CustomSf2SoundFont } from '../types/midi';
import { BAND_CHANNELS_TEMPLATE } from '../data/bandTemplate';
import { InstrumentArtBadge } from './InstrumentArtBadge';
import { parseSf2Header, Sf2PresetInfo } from '../utils/sf2Parser';
import { webMidi } from '../utils/webMidiService';
import { webAudioSynth } from '../utils/webAudioSynth';

interface Props {
  channelConfig: MidiChannelConfig;
  isOpen: boolean;
  onClose: () => void;
  onApply: (updated: {
    program: number;
    bankMsb: number;
    bankLsb: number;
    isDrum: boolean;
    name?: string;
    customSf2?: CustomSf2SoundFont;
    customImageUrl?: string;
  }) => void;
  internalAudioEnabled: boolean;
}

export const InstrumentModal: React.FC<Props> = ({
  channelConfig,
  isOpen,
  onClose,
  onApply,
  internalAudioEnabled,
}) => {
  const [activeTab, setActiveTab] = useState<'gm' | 'sf2'>('gm');
  const [search, setSearch] = useState('');
  const [sf2Search, setSf2Search] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [program, setProgram] = useState(channelConfig.program);
  const [bankMsb, setBankMsb] = useState(channelConfig.bankMsb);
  const [bankLsb, setBankLsb] = useState(channelConfig.bankLsb);
  const [isDrum, setIsDrum] = useState(channelConfig.isDrum);
  const [customSf2, setCustomSf2] = useState<CustomSf2SoundFont | undefined>(channelConfig.customSf2);
  const [customImageUrl, setCustomImageUrl] = useState<string | undefined>(channelConfig.customImageUrl);
  const [channelName, setChannelName] = useState(channelConfig.name);
  const [auditioning, setAuditioning] = useState(false);
  const [sf2Parsing, setSf2Parsing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bandTpl = BAND_CHANNELS_TEMPLATE[channelConfig.channel] || BAND_CHANNELS_TEMPLATE[0];

  // Sync state if channel changes
  useEffect(() => {
    setProgram(channelConfig.program);
    setBankMsb(channelConfig.bankMsb);
    setBankLsb(channelConfig.bankLsb);
    setIsDrum(channelConfig.isDrum);
    setCustomSf2(channelConfig.customSf2);
    setCustomImageUrl(channelConfig.customImageUrl);
    setChannelName(channelConfig.name);
    if (channelConfig.customSf2) {
      setActiveTab('sf2');
    }
  }, [channelConfig]);

  if (!isOpen) return null;

  const handleAudition = (testProg: number, testMsb: number, testLsb: number, drum: boolean) => {
    setAuditioning(true);
    // Send to SynthFont2 via Web MIDI
    webMidi.sendProgramChange(channelConfig.channel, testProg, testMsb, testLsb);
    const testPitch = drum ? 36 : 60; // Kick or Middle C
    webMidi.testAudition(channelConfig.channel, testPitch, 500);

    if (internalAudioEnabled) {
      webAudioSynth.noteOn(channelConfig.channel, testPitch, 0.85, testProg, drum);
      setTimeout(() => webAudioSynth.noteOff(channelConfig.channel, testPitch), 500);
    }
    setTimeout(() => setAuditioning(false), 500);
  };

  const filteredInstruments = GM_INSTRUMENTS.filter((inst) => {
    const matchesSearch =
      inst.name.toLowerCase().includes(search.toLowerCase()) ||
      inst.id.toString() === search ||
      inst.category.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || inst.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Handle SF2 File Upload & Parsing
  const handleSf2File = async (file: File) => {
    if (!file) return;
    setSf2Parsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const meta = parseSf2Header(buffer);

      const defaultPreset = meta.presets[0] || {
        name: file.name.replace(/\.[^/.]+$/, ''),
        program: 0,
        bank: 0,
      };

      const newSf2: CustomSf2SoundFont = {
        fileName: file.name,
        fileSize: file.size,
        bankMsb: defaultPreset.bank || 1, // Custom bank
        bankLsb: 0,
        presetProgram: defaultPreset.program || 0,
        presetName: defaultPreset.name || file.name,
        loadedAt: new Date().toISOString(),
        presetsList: meta.presets,
      };

      setCustomSf2(newSf2);
      setBankMsb(newSf2.bankMsb);
      setBankLsb(newSf2.bankLsb);
      setProgram(newSf2.presetProgram);
      setChannelName(`${bandTpl.shortRole} - ${newSf2.presetName}`);
      setActiveTab('sf2');

      // Audition first preset
      handleAudition(newSf2.presetProgram, newSf2.bankMsb, newSf2.bankLsb, isDrum);
    } catch (err) {
      console.error('Failed to parse SF2 file:', err);
    } finally {
      setSf2Parsing(false);
    }
  };

  const handleApply = () => {
    // Send update immediately to MIDI output
    webMidi.sendProgramChange(channelConfig.channel, program, bankMsb, bankLsb);
    onApply({
      program,
      bankMsb,
      bankLsb,
      isDrum,
      name: channelName,
      customSf2,
      customImageUrl,
    });
    onClose();
  };

  return (
    <div
      id="instrument-picker-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header with Band Role Artwork Badge */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <InstrumentArtBadge
              channelIndex={channelConfig.channel}
              customImageUrl={customImageUrl}
              onCustomImageUpload={(url) => setCustomImageUrl(url)}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded font-black font-mono bg-slate-800 text-white border border-slate-700">
                  Piste {channelConfig.channel + 1}
                </span>
                <h2 className="text-base font-bold text-slate-100 font-display">
                  {bandTpl.roleTitle}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {bandTpl.defaultDescription} (Assignation fixe pour le groupe)
              </p>
            </div>
          </div>

          <button
            id="close-instrument-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection: GM vs Custom SF2 */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('gm')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'gm'
                ? 'text-indigo-400 border-indigo-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Banque General MIDI & SynthFont2</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sf2')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'sf2'
                ? 'text-amber-400 border-amber-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Banque SF2 Personnelle (SoundFont)</span>
            {customSf2 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Bank Select & Channel Mode Configuration Bar */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Drum Channel Toggle */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Mode Canal
            </label>
            <button
              type="button"
              id="toggle-channel-mode-btn"
              onClick={() => {
                const next = !isDrum;
                setIsDrum(next);
                if (next) {
                  setBankMsb(128); // Standard for SF2 Drums
                } else {
                  setBankMsb(0);
                }
              }}
              className={`w-full py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors truncate ${
                isDrum
                  ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                  : 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60'
              }`}
            >
              {isDrum ? '🥁 Drum Kit (Ch 10)' : '🎹 Mélodique'}
            </button>
          </div>

          {/* Bank Select MSB (CC 0) */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Bank MSB (CC 0)
            </label>
            <input
              type="number"
              min={0}
              max={128}
              value={bankMsb}
              onChange={(e) => setBankMsb(Math.max(0, Math.min(128, parseInt(e.target.value, 10) || 0)))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="SF2 Bank Number (0 pour standard, 128 pour batterie)"
            />
          </div>

          {/* Bank Select LSB (CC 32) */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Bank LSB (CC 32)
            </label>
            <input
              type="number"
              min={0}
              max={127}
              value={bankLsb}
              onChange={(e) => setBankLsb(Math.max(0, Math.min(127, parseInt(e.target.value, 10) || 0)))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Program Number (0-127) */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Programme (0-127)
            </label>
            <input
              type="number"
              min={0}
              max={127}
              value={program}
              onChange={(e) => setProgram(Math.max(0, Math.min(127, parseInt(e.target.value, 10) || 0)))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* TAB 1: GENERAL MIDI BROWSER */}
        {activeTab === 'gm' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Search & Categories */}
            <div className="px-6 py-2.5 border-b border-slate-800 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher un preset GM (ex: 'Grand Piano', 'Alto Sax', 'Fretless Bass', '808')..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {!isDrum && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {GM_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-0.5 rounded-md whitespace-nowrap text-xs font-medium transition-colors ${
                        selectedCategory === cat
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List of Presets */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72">
              {isDrum ? (
                GM_DRUM_KITS.map((kit) => {
                  const isSelected = program === kit.id;
                  return (
                    <div
                      key={kit.id}
                      onClick={() => setProgram(kit.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-600/70 text-amber-200'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                          {kit.id}
                        </span>
                        <span className="text-xs font-semibold truncate">{kit.name}</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProgram(kit.id);
                          handleAudition(kit.id, bankMsb, bankLsb, true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 shrink-0 ml-2"
                        title="Écouter le kit"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  );
                })
              ) : (
                filteredInstruments.map((inst) => {
                  const isSelected = program === inst.id;
                  return (
                    <div
                      key={inst.id}
                      onClick={() => setProgram(inst.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-950/50 border-indigo-500/80 text-indigo-200'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                          {inst.id}
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-semibold truncate">{inst.name}</p>
                          <p className="text-[10px] text-slate-500">{inst.category}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProgram(inst.id);
                          handleAudition(inst.id, bankMsb, bankLsb, false);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 shrink-0 ml-2"
                        title="Écouter le preset"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOM SF2 SOUNDFONT IMPORT & MANAGEMENT */}
        {activeTab === 'sf2' && (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-80">
            {/* Dropzone for .sf2 file */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-amber-500/40 hover:border-amber-500/80 rounded-2xl p-5 text-center bg-amber-950/10 hover:bg-amber-950/20 transition-all cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".sf2,.sfz,.dls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleSf2File(file);
                }}
              />
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <FolderOpen className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-200">
                Glissez ou cliquez pour importer votre fichier SoundFont (.sf2 / .sfz)
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Charge directement vos instruments orientaux (Oud, Nay), accordéons, synthés ou batteries personnalisées
              </p>
            </div>

            {/* Currently Assigned SF2 Card */}
            {customSf2 ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-600/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-200 flex items-center gap-2">
                        <span>{customSf2.fileName}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/60">
                          {customSf2.fileSize ? `${(customSf2.fileSize / (1024 * 1024)).toFixed(1)} MB` : 'SF2'}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Preset actif : <strong>{customSf2.presetName}</strong> (Prog: {program}, Bank: {bankMsb})
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomSf2(undefined);
                      setBankMsb(0);
                      setProgram(bandTpl.program);
                      setChannelName(bandTpl.instrumentDefault);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-colors"
                    title="Supprimer le SF2 personnalisé de cette piste"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Preset Selector inside the SF2 */}
                {customSf2.presetsList && customSf2.presetsList.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Presets SoundFont ({customSf2.presetsList.length})
                      </label>
                      <div className="relative w-48">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={sf2Search}
                          onChange={(e) => setSf2Search(e.target.value)}
                          placeholder="Filtrer presets SF2..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto custom-console-scroll">
                      {customSf2.presetsList
                        .filter((p) => !sf2Search || p.name.toLowerCase().includes(sf2Search.toLowerCase()) || p.program.toString() === sf2Search)
                        .map((preset, idx) => {
                          const isSelected = program === preset.program && bankMsb === (preset.bank || bankMsb);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setProgram(preset.program);
                                setBankMsb(preset.bank || bankMsb);
                                setCustomSf2({
                                  ...customSf2,
                                  presetProgram: preset.program,
                                  presetName: preset.name,
                                  bankMsb: preset.bank || bankMsb,
                                });
                                handleAudition(preset.program, preset.bank || bankMsb, bankLsb, isDrum);
                              }}
                              className={`p-2 rounded-lg text-left text-xs flex items-center justify-between border transition-all ${
                                isSelected
                                  ? 'bg-amber-950/60 border-amber-500 text-amber-200 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <span className="truncate">{preset.name}</span>
                              <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-1">
                                P{preset.program}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                Aucun instrument SF2 personnalisé n'est encore assigné à la piste {channelConfig.channel + 1}.
                <br />
                <span className="text-[11px] text-slate-500">
                  Cette piste utilise actuellement le son General MIDI par défaut : <strong>{bandTpl.instrumentDefault}</strong>.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleAudition(program, bankMsb, bankLsb, isDrum)}
            disabled={auditioning}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current text-indigo-400" />
            <span>Écouter (SynthFont2)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              id="apply-instrument-btn"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Appliquer à la Piste {channelConfig.channel + 1}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
