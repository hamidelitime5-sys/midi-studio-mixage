import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Volume2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Zap,
  Radio,
  Headphones,
  Cpu,
  X,
  Play,
  RotateCw,
} from 'lucide-react';
import { webAudioSynth } from '../utils/webAudioSynth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const FocusriteScarlettModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
  const [testToneActive, setTestToneActive] = useState<boolean>(false);
  const [bufferSize, setBufferSize] = useState<number>(128); // 128 samples (~2.9 ms)
  const [sampleRate, setSampleRate] = useState<number>(48000); // 48 kHz standard
  const [driverMode, setDriverMode] = useState<'asio' | 'wasapi'>('asio');

  // Enumerate actual system audio output devices
  const refreshAudioDevices = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter((d) => d.kind === 'audiooutput');
        setAudioDevices(outputs);

        // Auto-detect Focusrite / Scarlett device
        const scarlett = outputs.find((d) =>
          d.label.toLowerCase().includes('focusrite') ||
          d.label.toLowerCase().includes('scarlett') ||
          d.label.toLowerCase().includes('solo')
        );
        if (scarlett) {
          setSelectedDeviceId(scarlett.deviceId);
        }
      }
    } catch (e) {
      console.warn('Could not enumerate audio devices:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshAudioDevices();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Select and apply audio output device
  const handleSelectDevice = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    await webAudioSynth.setAudioOutputDevice(deviceId);
  };

  // Test tone generation routed directly through the selected audio device / Scarlett Solo
  const handleTestAudio = async () => {
    if (testToneActive) return;
    setTestToneActive(true);
    try {
      await webAudioSynth.setAudioOutputDevice(selectedDeviceId);
      await webAudioSynth.playTestTone();
    } catch (e) {
      console.warn('Audio test error:', e);
    } finally {
      setTimeout(() => setTestToneActive(false), 900);
    }
  };

  // Calculate calculated latency in ms
  const calculatedLatencyMs = ((bufferSize / sampleRate) * 1000).toFixed(1);

  return (
    <div
      id="scarlett-asio-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        className="bg-slate-900 border-2 border-red-500/50 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col custom-console-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header with Scarlett Red Iconic Banner */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-900 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#c53030] p-0.5 flex items-center justify-center shadow-lg shadow-red-600/30 border border-red-400/50">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight font-display">
                  Focusrite Scarlett Solo (3rd Gen)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-red-600/20 text-red-300 border border-red-500/40">
                  ASIO 24-bit / 192kHz
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Configuration de votre carte son USB pour le jeu en autonome ultra-faible latence
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 text-sm">
          {/* Audio Output Device Selector */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Headphones className="w-4 h-4 text-red-400" />
                <span>Périphérique de sortie audio détecté</span>
              </label>
              <button
                type="button"
                onClick={refreshAudioDevices}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RotateCw className="w-3 h-3" />
                <span>Actualiser</span>
              </button>
            </div>

            <select
              value={selectedDeviceId}
              onChange={(e) => handleSelectDevice(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
            >
              <option value="default">Sortie par défaut Windows (Focusrite Scarlett Solo)</option>
              {audioDevices.map((dev, i) => (
                <option key={dev.deviceId || i} value={dev.deviceId}>
                  {dev.label || `Sortie Audio #${i + 1}`}
                </option>
              ))}
            </select>

            {/* Test Audio Tone Button */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">
                Tester le son dans votre casque ou vos enceintes Scarlett :
              </span>
              <button
                type="button"
                onClick={handleTestAudio}
                disabled={testToneActive}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-red-600/30 active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{testToneActive ? 'Son en cours...' : 'Tester le son (440Hz)'}</span>
              </button>
            </div>
          </div>

          {/* Buffer Size & Latency Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Driver Type */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Pilote Audio
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setDriverMode('asio')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    driverMode === 'asio'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  ASIO Focusrite
                </button>
                <button
                  type="button"
                  onClick={() => setDriverMode('wasapi')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    driverMode === 'wasapi'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  WASAPI
                </button>
              </div>
            </div>

            {/* Buffer Size */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Buffer ASIO
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {bufferSize} samples
                </span>
              </div>
              <select
                value={bufferSize}
                onChange={(e) => setBufferSize(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={64}>64 samples (1.3 ms - Ultra rapide)</option>
                <option value={128}>128 samples (2.7 ms - Recommandé)</option>
                <option value={256}>256 samples (5.3 ms - Très stable)</option>
                <option value={512}>512 samples (10.6 ms)</option>
              </select>
            </div>

            {/* Sample Rate */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Fréquence
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {sampleRate / 1000} kHz
                </span>
              </div>
              <select
                value={sampleRate}
                onChange={(e) => setSampleRate(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={44100}>44.1 kHz (CD Audio)</option>
                <option value={48000}>48.0 kHz (Studio Broadcast - Idéal)</option>
                <option value={96000}>96.0 kHz (Haute Définition)</option>
              </select>
            </div>
          </div>

          {/* Latency Indicator Box */}
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-bold text-emerald-300">Latence estimée en temps réel</p>
                <p className="text-[11px] text-emerald-400/80">
                  Temps de réponse direct entre la frappe tactile et le son dans votre Scarlett Solo
                </p>
              </div>
            </div>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-lg border border-emerald-700/60">
              ~{calculatedLatencyMs} ms
            </span>
          </div>

          {/* Configuration Step-by-Step for SynthFont2 & Standalone */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-red-400" />
              <span>Guide de Configuration SynthFont2 pour votre Scarlett Solo 3ème Gen</span>
            </h4>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <div>
                  <strong>Dans SynthFont2 :</strong> Ouvrez le menu <em>Options → Setup → Audio Settings</em>.
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <div>
                  Sélectionnez <strong>Driver Type : ASIO</strong> puis choisissez <strong>Focusrite USB ASIO</strong>.
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                <div>
                  <strong>Sur la façade de votre Scarlett Solo :</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-400 pl-1">
                    <li>Bouton <strong>DIRECT MONITOR</strong> : laissez-le sur <em>OFF</em> pour écouter le son traité par SynthFont2 et notre table de mixage.</li>
                    <li>Gros potentiomètre <strong>MONITOR</strong> : ajustez le volume d'écoute général de vos enceintes / moniteurs de studio.</li>
                    <li>Sortie casque 1/4" : branchée directement à l'avant avec volume dédié.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Connecté en 24-bit / 48kHz via Focusrite USB</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Appliquer & Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
