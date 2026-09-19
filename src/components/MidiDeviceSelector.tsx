import React, { useEffect, useState } from 'react';
import {
  Cable,
  Volume2,
  RefreshCw,
  AlertTriangle,
  Music,
  Radio,
  Sliders,
  Headphones,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { webMidi } from '../utils/webMidiService';
import { webAudioSynth } from '../utils/webAudioSynth';
import { MidiOutputDevice } from '../types/midi';

interface Props {
  internalAudioEnabled: boolean;
  onToggleInternalAudio: (enabled: boolean) => void;
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
}

export const MidiDeviceSelector: React.FC<Props> = ({
  internalAudioEnabled,
  onToggleInternalAudio,
  selectedDeviceId,
  onSelectDevice,
}) => {
  const [devices, setDevices] = useState<MidiOutputDevice[]>([]);
  const [midiSupported, setMidiSupported] = useState<boolean>(true);
  const [midiError, setMidiError] = useState<string | null>(null);
  const [isAuditioning, setIsAuditioning] = useState<boolean>(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);
  const [audioMode, setAudioMode] = useState<'standalone' | 'external'>(
    internalAudioEnabled ? 'standalone' : 'external'
  );

  useEffect(() => {
    webMidi.initialize().then((res) => {
      setMidiSupported(res.supported);
      if (!res.supported && res.error) {
        setMidiError(res.error);
      }
    });

    webMidi.onDevicesChanged((devs) => {
      setDevices(devs);
      if (devs.length > 0 && !selectedDeviceId) {
        onSelectDevice(devs[0].id);
      }
    });
  }, [selectedDeviceId, onSelectDevice]);

  // Ensure internal audio is synchronized with standalone mode
  const switchAudioMode = (mode: 'standalone' | 'external') => {
    setAudioMode(mode);
    if (mode === 'standalone') {
      onToggleInternalAudio(true);
      webAudioSynth.setEnabled(true);
      webAudioSynth.init();
    } else {
      // In external mode, keep MIDI routing primary
      webMidi.initialize();
    }
  };

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    onSelectDevice(id);
    webMidi.selectOutput(id);
  };

  const handleSendPanic = () => {
    webMidi.allNotesOff();
    webAudioSynth.stopAll();
    setResetFeedback('Arrêt d\'urgence (All Notes Off) envoyé !');
    setTimeout(() => setResetFeedback(null), 2500);
  };

  const handleGmReset = () => {
    webMidi.sendGmReset();
    setResetFeedback('Reset GM/GS envoyé au port externe !');
    setTimeout(() => setResetFeedback(null), 2500);
  };

  const handleTestPiano = () => {
    setIsAuditioning(true);
    webAudioSynth.init();
    webAudioSynth.noteOn(0, 60, 0.85, 0, false);
    setTimeout(() => webAudioSynth.noteOff(0, 60), 600);

    if (audioMode === 'external') {
      webMidi.sendProgramChange(0, 0, 0, 0);
      webMidi.testAudition(0, 60, 500);
    }
    setTimeout(() => setIsAuditioning(false), 600);
  };

  const handleTestDrums = () => {
    setIsAuditioning(true);
    webAudioSynth.init();
    // Kick + Snare + Hat test
    webAudioSynth.noteOn(9, 36, 0.95, 0, true);
    setTimeout(() => {
      webAudioSynth.noteOn(9, 38, 0.85, 0, true);
      webAudioSynth.noteOn(9, 42, 0.7, 0, true);
    }, 180);

    if (audioMode === 'external') {
      webMidi.sendProgramChange(9, 0, 128, 0);
      webMidi.sendNoteOn(9, 36, 0.9);
      setTimeout(() => webMidi.sendNoteOff(9, 36), 150);
      setTimeout(() => {
        webMidi.sendNoteOn(9, 38, 0.85);
        setTimeout(() => webMidi.sendNoteOff(9, 38), 150);
      }, 180);
    }
    setTimeout(() => setIsAuditioning(false), 500);
  };

  const handleTestChord = () => {
    setIsAuditioning(true);
    webAudioSynth.playTestTone();
    setTimeout(() => setIsAuditioning(false), 1400);
  };

  const loadedSf2 = webAudioSynth.getLoadedSf2Metadata();

  return (
    <div id="midi-device-selector-panel" className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-xl">
      {/* Mode Switch Bar: Standalone vs Externe */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mode d'écoute :</span>
          <div className="inline-flex p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              id="mode-standalone-btn"
              onClick={() => switchAudioMode('standalone')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                audioMode === 'standalone'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Mode Standalone (Audio HD Direct)</span>
              <span className="ml-1 text-[10px] px-1 py-0.2 rounded bg-indigo-950/90 text-indigo-200 border border-indigo-700/50">
                Recommandé
              </span>
            </button>

            <button
              id="mode-external-btn"
              onClick={() => switchAudioMode('external')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                audioMode === 'external'
                  ? 'bg-slate-800 text-slate-100 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cable className="w-3.5 h-3.5" />
              <span>Mode SynthFont2 (Port MIDI Externe)</span>
            </button>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {audioMode === 'standalone' ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                Audio HD Actif : {loadedSf2 ? `Banque SF2 "${loadedSf2.bankName}"` : 'Synthèse Physique GM Studio'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-md">
              <Cable className="w-3.5 h-3.5" />
              <span>Routage vers loopMIDI / SynthFont2</span>
            </div>
          )}
        </div>
      </div>

      {/* Mode Details & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {audioMode === 'standalone' ? (
          /* Standalone Controls: No external MIDI port needed! */
          <div className="flex items-center gap-3 min-w-[280px] flex-1">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Rendu Audio Standalone Direct
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                  <Sparkles className="w-3 h-3" />
                  Sortie Focusrite Scarlett Solo / Enceintes PC
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Aucun port ni logiciel MIDI requis. Les pistes jouent immédiatement avec un son réaliste et vos banques SoundFont SF2.
              </p>
            </div>
          </div>
        ) : (
          /* External MIDI Port Selector */
          <div className="flex items-center gap-3 min-w-[280px] flex-1">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Cable className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Port MIDI Sortie</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                  SynthFont2
                </span>
              </div>
              {devices.length > 0 ? (
                <select
                  id="midi-output-port-select"
                  aria-label="MIDI Output Port"
                  value={selectedDeviceId || ''}
                  onChange={handleDeviceChange}
                  className="mt-1 w-full bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                >
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name} {device.manufacturer ? `(${device.manufacturer})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-1 text-xs text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Aucun port virtuel détecté. Basculez en Mode Standalone ci-dessus !</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Diagnostics & Sound Test Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            id="test-chord-btn"
            onClick={handleTestChord}
            disabled={isAuditioning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-xs font-semibold text-white transition-colors shadow"
            title="Joue un accord C Major 9 réaliste pour vérifier vos enceintes ou votre Scarlett Solo"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tester le Son HD</span>
          </button>

          <button
            id="test-ch1-piano-btn"
            onClick={handleTestPiano}
            disabled={isAuditioning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
            title="Auditionne le Piano Grand Acoustique"
          >
            <Music className="w-3.5 h-3.5 text-indigo-400" />
            <span>Piano C4</span>
          </button>

          <button
            id="test-ch10-drums-btn"
            onClick={handleTestDrums}
            disabled={isAuditioning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
            title="Auditionne la Batterie Studio (Kick, Snare, Hi-Hat)"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>Batterie</span>
          </button>

          {audioMode === 'external' && (
            <button
              id="send-gm-reset-btn"
              onClick={handleGmReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition-colors"
              title="Envoie un Reset GM/GS au synthétiseur externe"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Reset GM</span>
            </button>
          )}

          <button
            id="panic-all-notes-off-btn"
            onClick={handleSendPanic}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-semibold transition-colors"
            title="Coupe immédiatement toutes les notes en cours"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Silence / Panic</span>
          </button>
        </div>
      </div>

      {resetFeedback && (
        <div className="mt-2 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded">
          ✓ {resetFeedback}
        </div>
      )}

      {midiError && audioMode === 'external' && (
        <div className="mt-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-900/40 px-2.5 py-1.5 rounded flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{midiError} (Le Mode Standalone fonctionne néanmoins parfaitement !)</span>
        </div>
      )}
    </div>
  );
};
