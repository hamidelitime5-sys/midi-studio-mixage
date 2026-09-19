import React, { useState, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  SlidersHorizontal,
  Music2,
  Drum,
  Radio,
  Download,
  Upload,
  Users,
  Layers,
  UploadCloud,
} from 'lucide-react';
import { MidiChannelConfig } from '../types/midi';
import { getInstrumentName } from '../data/gmInstruments';
import { BAND_CHANNELS_TEMPLATE } from '../data/bandTemplate';
import { InstrumentArtBadge } from './InstrumentArtBadge';
import { webMidi } from '../utils/webMidiService';
import { webAudioSynth } from '../utils/webAudioSynth';
import { generateSynthFont2Def, parseSynthFont2Config } from '../utils/synthFontConfig';

interface Props {
  channels: MidiChannelConfig[];
  onUpdateChannel: (channelIndex: number, partial: Partial<MidiChannelConfig>) => void;
  onOpenInstrumentModal: (channelIndex: number) => void;
  internalAudioEnabled: boolean;
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
  onOpenScarlettModal?: () => void;
  onApplyBandTemplate?: () => void;
}

// Convert 0-127 MIDI volume to fader dB position for scale display
const midiToDb = (midiVal: number): string => {
  if (midiVal === 0) return '-∞';
  if (midiVal >= 127) return '+10';
  if (midiVal >= 115) return '+5';
  if (midiVal >= 100) return '0';
  if (midiVal >= 85) return '-5';
  if (midiVal >= 70) return '-10';
  if (midiVal >= 55) return '-15';
  if (midiVal >= 40) return '-20';
  if (midiVal >= 25) return '-30';
  if (midiVal >= 10) return '-40';
  return '-50';
};

// Physical Rotary Knob Component (for Pan / Gain) with orange perimeter arc
const RotaryKnob: React.FC<{
  value: number; // 0 to 127
  onChange: (val: number) => void;
  label?: string;
  subLabel?: string;
  isStereo?: boolean;
}> = ({ value, onChange, label = 'PAN', subLabel }) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startValRef = useRef(value);

  // Angle from -135deg (min) to +135deg (max)
  const normalized = value / 127;
  const angle = -135 + normalized * 270;

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startValRef.current = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaY = startYRef.current - e.clientY;
    const change = Math.round((deltaY / 100) * 127);
    const nextVal = Math.max(0, Math.min(127, startValRef.current + change));
    onChange(nextVal);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Double click resets to center (64)
  const handleDoubleClick = () => {
    onChange(64);
  };

  return (
    <div className="flex flex-col items-center select-none">
      {label && <span className="text-[9px] font-bold tracking-tight text-slate-500 uppercase">{label}</span>}
      <div
        ref={knobRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        title="Glisser haut/bas pour régler le Pan, double-clic pour centrer"
        className="relative w-8 h-8 sm:w-9 sm:h-9 my-1 cursor-ns-resize flex items-center justify-center touch-none group"
      >
        {/* Outer perimeter ring with orange indicator arc */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 40 40">
          {/* Base track */}
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="3"
            strokeDasharray="75 100"
            strokeDashoffset="-12"
            strokeLinecap="round"
          />
          {/* Orange active arc */}
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="#ea580c"
            strokeWidth="3.5"
            strokeDasharray={`${(normalized * 75).toFixed(1)} 100`}
            strokeDashoffset="-12"
            strokeLinecap="round"
            className="transition-all duration-75"
          />
        </svg>

        {/* Sculpted white knob body */}
        <div
          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-b from-white via-slate-100 to-slate-300 shadow-[0_3px_6px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.9)] border border-slate-300 flex items-center justify-center transition-transform duration-75"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          {/* Top indicator notch / pointer line */}
          <div className="w-0.5 h-2 bg-slate-900 rounded-full absolute -top-0.5 shadow-sm" />
          {/* Subtle center cone indent */}
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200 shadow-inner" />
        </div>
      </div>
      <span className="text-[8px] font-mono font-semibold text-slate-600">
        {subLabel ?? (value === 64 ? 'C' : value < 64 ? `L${64 - value}` : `R${value - 64}`)}
      </span>
    </div>
  );
};

// Physical Hardware Fader Component with decibel scale, deep slot, and sculpted cap
const HardwareFader: React.FC<{
  value: number; // 0 to 127
  onChange: (val: number) => void;
  colorLine?: 'black' | 'blue' | 'red';
  isStereo?: boolean;
  activityLevel?: number; // 0 to 1+ for VU meter indication
}> = ({ value, onChange, colorLine = 'black', isStereo = false, activityLevel = 0 }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Height of travel in pixels
  const TRACK_HEIGHT = 150;
  const CAP_HEIGHT = 38;
  const TRAVEL = TRACK_HEIGHT - CAP_HEIGHT;

  // Position from bottom: 0 at min (bottom), TRAVEL at max (top)
  const posPx = (value / 127) * TRAVEL;

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromPointer(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    updateFromPointer(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const updateFromPointer = (clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickY = clientY - rect.top - CAP_HEIGHT / 2;
    const clampedY = Math.max(0, Math.min(TRAVEL, clickY));
    const invertedY = TRAVEL - clampedY;
    const nextVal = Math.round((invertedY / TRAVEL) * 127);
    onChange(Math.max(0, Math.min(127, nextVal)));
  };

  const hasActivity = activityLevel > 0;

  return (
    <div className="relative flex items-center justify-center select-none py-1 w-full">
      {/* Decibel markings on left */}
      <div
        className="flex flex-col justify-between text-[7px] font-mono text-slate-500 font-semibold pr-1 h-[150px] leading-none select-none text-right w-4 pointer-events-none"
        aria-hidden="true"
      >
        <span>+10</span>
        <span className="font-bold text-slate-800">0</span>
        <span>-10</span>
        <span>-20</span>
        <span>-30</span>
        <span>-∞</span>
      </div>

      {/* Main Fader Track Area with Deep Shadow Slot */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-8 h-[150px] cursor-pointer flex justify-center touch-none"
      >
        {/* Deep Machined Slot */}
        <div className="w-2.5 h-full rounded-full bg-[#0a0c10] shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_1px_1px_rgba(255,255,255,0.4)] border border-slate-700/60 relative flex justify-center">
          {/* Internal Center Guide Rail */}
          <div className="w-[1px] h-full bg-[#2a303c]" />

          {/* Active travel fill indicator behind fader */}
          <div
            className="w-1.5 rounded-full absolute bottom-0 transition-all duration-75"
            style={{
              height: `${posPx + CAP_HEIGHT / 2}px`,
              backgroundColor: isStereo ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.35)',
            }}
          />
        </div>

        {/* Sculpted Fader Knob / Cap */}
        <div
          style={{
            bottom: `${posPx}px`,
          }}
          className="absolute w-7 h-[38px] rounded-[3px] bg-gradient-to-b from-[#2a2f3a] via-[#1a1d24] to-[#0d0f13] border border-slate-700/90 shadow-[0_4px_8px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.3)] flex flex-col justify-between p-[2px] transition-all duration-75 hover:border-slate-400 group cursor-grab active:cursor-grabbing"
        >
          {/* Top textured grip ridges */}
          <div className="flex justify-evenly w-full px-0.5 pt-0.5">
            <div className="w-0.5 h-1 bg-slate-600 rounded-full" />
            <div className="w-0.5 h-1 bg-slate-600 rounded-full" />
            <div className="w-0.5 h-1 bg-slate-600 rounded-full" />
          </div>

          {/* High-visibility center position line marker */}
          <div className="w-full flex items-center justify-center my-auto">
            <div
              className={`w-full h-[2.5px] rounded-full shadow-[0_0_4px_rgba(255,255,255,0.8)] ${
                colorLine === 'red'
                  ? 'bg-red-500 shadow-red-500/80'
                  : colorLine === 'blue'
                  ? 'bg-blue-400 shadow-blue-400/80'
                  : 'bg-white shadow-white'
              }`}
            />
          </div>

          {/* Bottom textured grip ridges */}
          <div className="flex justify-evenly w-full px-0.5 pb-0.5">
            <div className="w-0.5 h-1 bg-slate-600 rounded-full" />
            <div className="w-0.5 h-1 bg-slate-600 rounded-full" />
            <div className="w-0.5 h-1 bg-slate-600 rounded-full" />
          </div>
        </div>
      </div>

      {/* Mini Hardware LED VU Meter on the right of fader */}
      <div
        className="flex flex-col-reverse justify-between pl-1 h-[150px] w-2.5 py-1 select-none pointer-events-none"
        aria-hidden="true"
      >
        <div className={`w-1.5 h-2 rounded-[1px] transition-colors ${hasActivity ? 'bg-emerald-500 shadow-[0_0_4px_#10b981]' : 'bg-slate-300'}`} />
        <div className={`w-1.5 h-2 rounded-[1px] transition-colors ${hasActivity && value > 40 ? 'bg-emerald-500 shadow-[0_0_4px_#10b981]' : 'bg-slate-300'}`} />
        <div className={`w-1.5 h-2 rounded-[1px] transition-colors ${hasActivity && value > 70 ? 'bg-emerald-500 shadow-[0_0_4px_#10b981]' : 'bg-slate-300'}`} />
        <div className={`w-1.5 h-2 rounded-[1px] transition-colors ${hasActivity && value > 95 ? 'bg-amber-400 shadow-[0_0_4px_#f59e0b]' : 'bg-slate-300'}`} />
        <div className={`w-1.5 h-2 rounded-[1px] transition-colors ${hasActivity && value > 115 ? 'bg-red-500 shadow-[0_0_4px_#ef4444]' : 'bg-slate-300'}`} />
      </div>
    </div>
  );
};

export const ChannelMixer: React.FC<Props> = ({
  channels,
  onUpdateChannel,
  onOpenInstrumentModal,
  internalAudioEnabled,
  masterVolume,
  onMasterVolumeChange,
  onOpenScarlettModal,
  onApplyBandTemplate,
}) => {
  const [selectedChannelIdx, setSelectedChannelIdx] = useState<number>(0);

  // Volume fader change handler (0-127)
  const handleVolumeChange = (channelIndex: number, newVol: number) => {
    const safeVol = Math.max(0, Math.min(127, Math.round(newVol)));
    onUpdateChannel(channelIndex, { volume: safeVol });
    webMidi.sendVolume(channelIndex, safeVol);
    if (internalAudioEnabled) {
      webAudioSynth.setChannelVolume(channelIndex, safeVol);
    }
  };

  // Pan knob change handler (0-127)
  const handlePanChange = (channelIndex: number, newPan: number) => {
    const safePan = Math.max(0, Math.min(127, Math.round(newPan)));
    onUpdateChannel(channelIndex, { pan: safePan });
    webMidi.sendPan(channelIndex, safePan);
  };

  // Toggle Mute / Active (illuminated ON button)
  const handleToggleOn = (channelIndex: number) => {
    const isCurrentlyMuted = channels[channelIndex].muted;
    const willMute = !isCurrentlyMuted;
    onUpdateChannel(channelIndex, { muted: willMute });
    webMidi.sendMute(channelIndex, willMute, channels[channelIndex].volume);
    if (internalAudioEnabled) {
      webAudioSynth.setChannelMute(channelIndex, willMute);
    }
  };

  // Toggle Solo (illuminated CUE button)
  const handleToggleCue = (channelIndex: number) => {
    const nextSolo = !channels[channelIndex].solo;
    onUpdateChannel(channelIndex, { solo: nextSolo });
    if (internalAudioEnabled) {
      webAudioSynth.setChannelSolo(channelIndex, nextSolo);
    }
  };

  // Master Volume handler (0.0 to 1.0)
  const masterVal127 = Math.round(masterVolume * 127);
  const handleMasterFader = (val127: number) => {
    const norm = Math.max(0, Math.min(1, val127 / 127));
    onMasterVolumeChange(norm);
  };

  // Master ON button (master mute/unmute)
  const [masterOn, setMasterOn] = useState(true);
  const prevMasterVolRef = useRef(masterVolume);
  const handleToggleMasterOn = () => {
    if (masterOn) {
      prevMasterVolRef.current = masterVolume > 0 ? masterVolume : 0.85;
      onMasterVolumeChange(0);
      setMasterOn(false);
    } else {
      onMasterVolumeChange(prevMasterVolRef.current || 0.85);
      setMasterOn(true);
    }
  };

  const importDefInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Handle Import SynthFont2 (.def, .sfarr, .ini)
  const handleImportSynthFont2Config = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const result = parseSynthFont2Config(text);
        result.channels.forEach(({ channelIndex, partial }) => {
          onUpdateChannel(channelIndex, partial);
        });
        setImportStatus(`✓ ${result.detectedCount} pistes importées depuis ${file.name} !`);
        setTimeout(() => setImportStatus(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export SynthFont2 Mapping File (.def)
  const handleExportSynthFont2Config = () => {
    const content = generateSynthFont2Def(channels);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'SynthFont2_Band_Channels_Config.def';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Calculate master peak activity from active channels
  const maxActivity = Math.max(0, ...channels.map((c) => (c.muted ? 0 : c.activeNoteCount)));

  return (
    <div
      id="hardware-mixing-console"
      className="bg-[#e2e6eb] border-2 border-[#c5cdd8] rounded-2xl p-3 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.45)] text-slate-800"
    >
      {/* Mixer Top Chassis Header (Yamaha MG Series Style + Band Template Badges) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b-2 border-[#cbd2db]">
        <div className="flex items-center gap-3">
          {/* Console Tuning-Fork Emblem / Logo */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-950 to-slate-800 border border-slate-700 flex items-center justify-center text-white shadow-md">
            <SlidersHorizontal className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-slate-900 uppercase font-display">
                MG-16XU SoundFont Band Console
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-900 text-amber-400 border border-slate-700 shadow-sm">
                12 PISTES GROUPE + 4 AUX CHOIX
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Attribution fixe des musiciens du groupe, dessins couleur, SF2 personnalisés & Focusrite Scarlett Solo ASIO
            </p>
          </div>
        </div>

        {/* Toolbar: Template, Scarlett Solo ASIO, Import & Export SynthFont2 */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {importStatus && (
            <span className="px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-bold animate-pulse shadow-sm">
              {importStatus}
            </span>
          )}

          {/* Scarlett Solo 3rd Gen ASIO Controller Button */}
          {onOpenScarlettModal && (
            <button
              type="button"
              onClick={onOpenScarlettModal}
              id="open-scarlett-asio-btn"
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 border border-red-400 transition-all cursor-pointer active:scale-95"
              title="Configurer la Focusrite Scarlett Solo (3ème Génération) en ASIO autonome"
            >
              <Radio className="w-4 h-4 text-white" />
              <span>Scarlett Solo ASIO (24-bit)</span>
            </button>
          )}

          {/* Reset / Apply Band Template Button */}
          {onApplyBandTemplate && (
            <button
              type="button"
              onClick={onApplyBandTemplate}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-100 font-bold flex items-center gap-1.5 shadow-sm border border-slate-700 transition-all cursor-pointer"
              title="Réinitialiser les 12 canaux fixes du groupe (Piano, Basse, Cuivres, Flûte, Accordéon, Guitare, Orientaux, Pads, Batterie, Percu)"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Verrouiller Template Groupe</span>
            </button>
          )}

          {/* Hidden input for Import SynthFont2 */}
          <input
            ref={importDefInputRef}
            type="file"
            accept=".def,.sfarr,.ini,.txt"
            className="hidden"
            onChange={handleImportSynthFont2Config}
          />

          {/* Import SynthFont2 Config Button */}
          <button
            type="button"
            onClick={() => importDefInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold border border-amber-600 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Importer une table de correspondance SynthFont2 (.def, .sfarr, .ini)"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import SynthFont2</span>
          </button>

          {/* Export SynthFont2 Config Button */}
          <button
            type="button"
            onClick={handleExportSynthFont2Config}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold border border-slate-300 transition-colors cursor-pointer"
            title="Exporter la table de correspondance SF2 pour SynthFont2 (.def)"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export SynthFont2</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Console Surface with 16 Channel Strips + STEREO Master */}
      <div className="overflow-x-auto pb-2 -mx-1 px-1 custom-console-scroll">
        <div className="inline-flex min-w-full gap-1.5 sm:gap-2">
          {/* 16 Input Channel Strips */}
          {channels.map((ch, idx) => {
            const isDrum = ch.isDrum || idx === 9;
            const isSelected = selectedChannelIdx === idx;
            const isChannelActive = !ch.muted;
            const instName = ch.customSf2
              ? ch.customSf2.presetName
              : getInstrumentName(ch.program, isDrum);
            const bandTpl = BAND_CHANNELS_TEMPLATE[idx] || BAND_CHANNELS_TEMPLATE[0];

            // Cap line color
            const capColor: 'black' | 'blue' = isDrum || idx === 8 ? 'blue' : 'black';

            return (
              <div
                key={idx}
                id={`hardware-strip-${idx + 1}`}
                className={`w-[84px] sm:w-[90px] shrink-0 rounded-xl border flex flex-col justify-between transition-all duration-100 ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#ffffff] to-[#f1f3f6] border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                    : isDrum
                    ? 'bg-gradient-to-b from-[#fefce8] to-[#fef9c3] border-amber-400/70 shadow-sm'
                    : 'bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] border-slate-300 shadow-sm'
                }`}
              >
                {/* Channel Top Header (Strip Number + Color Art / Drawing / Photo) */}
                <div className="p-1 border-b border-slate-200/80 flex flex-col items-center gap-1 bg-slate-100/60 rounded-t-xl">
                  {/* Channel Number & Mini Tag */}
                  <div className="w-full flex items-center justify-between px-0.5">
                    <span
                      className={`text-[10px] font-black font-mono px-1.5 py-0.5 rounded ${
                        isDrum
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-800 text-white'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    {/* SF2 Loaded Badge or Program Number */}
                    {ch.customSf2 ? (
                      <span
                        className="text-[8px] font-mono font-black px-1 rounded bg-amber-500 text-slate-950 truncate max-w-[44px]"
                        title={`SF2 Personnalisé: ${ch.customSf2.fileName}`}
                      >
                        SF2
                      </span>
                    ) : (
                      <span className="text-[8px] font-mono font-bold text-slate-500 truncate max-w-[42px]">
                        P{ch.program}
                      </span>
                    )}
                  </div>

                  {/* Instrument Color Drawing / Photo Artwork Badge */}
                  <div className="py-0.5 flex justify-center">
                    <InstrumentArtBadge
                      channelIndex={idx}
                      iconKey={ch.iconKey || bandTpl.iconKey}
                      customImageUrl={ch.customImageUrl}
                      onCustomImageUpload={(url) => {
                        onUpdateChannel(idx, { customImageUrl: url });
                      }}
                      size="sm"
                    />
                  </div>

                  {/* Band Musician Role Title */}
                  <div className="w-full text-center px-0.5">
                    <p
                      className="text-[9px] font-bold text-slate-800 truncate leading-tight"
                      title={bandTpl.roleTitle}
                    >
                      {bandTpl.shortRole}
                    </p>
                  </div>
                </div>

                {/* Section 1: Rotary PAN Knob with orange arc */}
                <div className="py-1 border-b border-slate-200 flex justify-center bg-slate-50/50">
                  <RotaryKnob
                    value={ch.pan}
                    onChange={(val) => handlePanChange(idx, val)}
                    label="PAN"
                  />
                </div>

                {/* Section 2: Illuminated Hardware Buttons (SEL, CUE, ON) */}
                <div className="p-1 flex flex-col gap-1 border-b border-slate-200/80 bg-slate-100/50">
                  {/* SEL Button (Neon Green LED when active) */}
                  <button
                    type="button"
                    id={`btn-sel-${idx + 1}`}
                    onClick={() => {
                      setSelectedChannelIdx(idx);
                      onOpenInstrumentModal(idx);
                    }}
                    title={`Piste ${idx + 1} : Modifier le son ou importer un fichier SF2`}
                    className={`w-full h-5 sm:h-6 rounded flex items-center justify-center text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide border transition-all ${
                      isSelected
                        ? 'bg-[#10b981] text-slate-950 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] ring-2 ring-emerald-300'
                        : 'bg-gradient-to-b from-white to-slate-200 text-slate-700 border-slate-300 hover:bg-slate-50 active:scale-95 shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
                    }`}
                  >
                    SEL
                  </button>

                  {/* CUE (Solo/PFL) Button */}
                  <button
                    type="button"
                    id={`btn-cue-${idx + 1}`}
                    onClick={() => handleToggleCue(idx)}
                    title={`CUE (Solo) Piste ${idx + 1}`}
                    className={`w-full h-5 sm:h-6 rounded flex items-center justify-center text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide border transition-all ${
                      ch.solo
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.8)] font-black'
                        : 'bg-gradient-to-b from-white to-slate-200 text-slate-600 border-slate-300 hover:bg-slate-50 active:scale-95 shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
                    }`}
                  >
                    CUE
                  </button>

                  {/* ON / MUTE Button (Square, illuminated orange when active, dim when muted) */}
                  <button
                    type="button"
                    id={`btn-on-${idx + 1}`}
                    onClick={() => handleToggleOn(idx)}
                    title={`Piste ${idx + 1}: ${isChannelActive ? 'ACTIVE (Cliquer pour couper)' : 'MUTÉE (Cliquer pour activer)'}`}
                    className={`w-full h-6 sm:h-7 rounded-[4px] flex items-center justify-center text-[10px] sm:text-[11px] font-black uppercase tracking-wider border-2 transition-all active:scale-95 ${
                      isChannelActive
                        ? 'bg-gradient-to-b from-[#f97316] to-[#ea580c] text-white border-orange-400 shadow-[0_0_12px_rgba(234,88,12,0.85),inset_0_1px_1px_rgba(255,255,255,0.6)]'
                        : 'bg-gradient-to-b from-slate-300 to-slate-400 text-slate-600 border-slate-400/80 shadow-inner'
                    }`}
                  >
                    ON
                  </button>
                </div>

                {/* Section 3: Ventilation Grille Band */}
                <div className="h-3.5 bg-[#1e232d] flex flex-col justify-evenly px-1 border-y border-slate-800 pointer-events-none">
                  <div className="h-[1.5px] bg-[#333a48] rounded-full" />
                  <div className="h-[1.5px] bg-[#333a48] rounded-full" />
                </div>

                {/* Section 4: Hardware Fader Section with dB markings and VU meter */}
                <div className="p-1 pt-1.5 flex flex-col items-center bg-white/60">
                  <HardwareFader
                    value={ch.volume}
                    onChange={(val) => handleVolumeChange(idx, val)}
                    colorLine={capColor}
                    activityLevel={ch.activeNoteCount}
                  />
                </div>

                {/* Section 5: Bottom Channel Label & Instrument / SF2 Info */}
                <div className="p-1 bg-slate-200/80 border-t border-slate-300 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[10px] font-black font-mono text-slate-800">
                      CH {idx + 1}
                    </span>
                    {ch.customSf2 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Banque SF2 active" />
                    )}
                  </div>
                  <p
                    className="text-[8.5px] font-medium text-slate-600 truncate mt-0.5 leading-tight"
                    title={ch.customSf2 ? `SF2: ${ch.customSf2.fileName} (${ch.customSf2.presetName})` : instName}
                  >
                    {ch.customSf2 ? ch.customSf2.presetName : instName}
                  </p>
                </div>
              </div>
            );
          })}

          {/* ========================================================= */}
          {/* STEREO MASTER CHANNEL STRIP (Distinctive Dark Finish)      */}
          {/* ========================================================= */}
          <div
            id="hardware-strip-stereo-master"
            className="w-[88px] sm:w-[94px] shrink-0 rounded-xl border-2 border-slate-800 bg-gradient-to-b from-[#1e222a] via-[#171a21] to-[#0f1115] shadow-2xl flex flex-col justify-between text-white"
          >
            {/* Master Header */}
            <div className="px-2 pt-2 pb-1 border-b border-slate-700/80 flex items-center justify-between">
              <span className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded bg-red-600 text-white tracking-wider">
                STEREO
              </span>
              <Music2 className="w-3.5 h-3.5 text-red-400" />
            </div>

            {/* Master Gain Knob */}
            <div className="py-1.5 border-b border-slate-800 flex justify-center bg-black/30">
              <RotaryKnob
                value={masterVal127}
                onChange={handleMasterFader}
                label="MASTER"
                subLabel={`${Math.round(masterVolume * 100)}%`}
                isStereo
              />
            </div>

            {/* Master Buttons (SEL, CUE, ON) */}
            <div className="p-1.5 flex flex-col gap-1.5 border-b border-slate-800 bg-black/20">
              <div className="w-full h-6 rounded flex items-center justify-center text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                MAIN L/R
              </div>

              <button
                type="button"
                onClick={() => webMidi.allNotesOff()}
                title="Panic: Couper toutes les notes MIDI immédiatement"
                className="w-full h-6 rounded flex items-center justify-center text-[10px] font-bold uppercase tracking-wide bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 active:scale-95"
              >
                PANIC
              </button>

              {/* Master ON Button */}
              <button
                type="button"
                id="btn-master-on"
                onClick={handleToggleMasterOn}
                title="Activer/Désactiver la sortie générale"
                className={`w-full h-7 rounded-[4px] flex items-center justify-center text-[11px] font-black uppercase tracking-wider border-2 transition-all active:scale-95 ${
                  masterOn
                    ? 'bg-gradient-to-b from-[#f97316] to-[#ea580c] text-white border-orange-400 shadow-[0_0_12px_rgba(234,88,12,0.85)]'
                    : 'bg-slate-800 text-slate-500 border-slate-700 shadow-inner'
                }`}
              >
                ON
              </button>
            </div>

            {/* Ventilation Band for Master */}
            <div className="h-4 bg-[#0a0c0f] flex flex-col justify-evenly px-1 border-y border-slate-900 pointer-events-none">
              <div className="h-[1.5px] bg-[#222733] rounded-full" />
              <div className="h-[1.5px] bg-[#222733] rounded-full" />
              <div className="h-[1.5px] bg-[#222733] rounded-full" />
            </div>

            {/* Master Red Fader */}
            <div className="p-1 pt-2 flex flex-col items-center bg-black/40">
              <HardwareFader
                value={masterVal127}
                onChange={handleMasterFader}
                colorLine="red"
                isStereo
                activityLevel={maxActivity}
              />
            </div>

            {/* Master Bottom Label */}
            <div className="p-1.5 bg-black/60 border-t border-slate-800 text-center">
              <span className="block text-[11px] font-black tracking-widest text-red-500 uppercase">
                SCARLETT
              </span>
              <span className="block text-[8px] font-mono text-slate-400">
                {midiToDb(masterVal127)} dB
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mixer Status Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-300 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium">
            Piste sélectionnée :{' '}
            <strong className="text-slate-900">
              Piste {selectedChannelIdx + 1} ({BAND_CHANNELS_TEMPLATE[selectedChannelIdx]?.roleTitle || 'Piste'} -{' '}
              {channels[selectedChannelIdx].customSf2
                ? `SF2: ${channels[selectedChannelIdx].customSf2.fileName}`
                : getInstrumentName(channels[selectedChannelIdx].program, channels[selectedChannelIdx].isDrum)})
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenInstrumentModal(selectedChannelIdx)}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Banque & SF2 Piste {selectedChannelIdx + 1}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
