import React from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Volume2,
  Gauge,
  Music2,
  Repeat,
  Sparkles,
  Bookmark,
} from 'lucide-react';

interface Props {
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onRewind: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  transpose: number;
  onTransposeChange: (semitones: number) => void;
  tempoMultiplier: number;
  onTempoChange: (multiplier: number) => void;
  baseBpm: number;
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
  // Intelligent Loop Controls
  isLoopActive?: boolean;
  loopStart?: number;
  loopEnd?: number;
  smartSnap?: boolean;
  onToggleLoop?: () => void;
  onSetLoopPointA?: (time?: number) => void;
  onSetLoopPointB?: (time?: number) => void;
  onSetLoopBars?: (bars: number) => void;
  onToggleSmartSnap?: () => void;
  timeSignature?: [number, number];
}

export const PlaybackControls: React.FC<Props> = ({
  isPlaying,
  onPlayPause,
  onStop,
  onRewind,
  currentTime,
  duration,
  onSeek,
  transpose,
  onTransposeChange,
  tempoMultiplier,
  onTempoChange,
  baseBpm,
  masterVolume,
  onMasterVolumeChange,
  isLoopActive = false,
  loopStart = 0,
  loopEnd = 0,
  smartSnap = true,
  onToggleLoop,
  onSetLoopPointA,
  onSetLoopPointB,
  onSetLoopBars,
  onToggleSmartSnap,
  timeSignature = [4, 4],
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseFloat(e.target.value));
  };

  const currentBpm = Math.round(baseBpm * tempoMultiplier);
  const beatSec = 60 / (currentBpm || 120);
  const beatsPerBar = timeSignature[0] || 4;
  const barSec = beatSec * beatsPerBar;
  const loopDuration = Math.max(0, loopEnd - loopStart);
  const loopBarsCount = barSec > 0 ? (loopDuration / barSec).toFixed(1) : '0';

  const safeDuration = duration > 0 ? duration : 100;
  const startPercent = Math.max(0, Math.min(100, (loopStart / safeDuration) * 100));
  const endPercent = Math.max(0, Math.min(100, (loopEnd / safeDuration) * 100));
  const widthPercent = Math.max(0, endPercent - startPercent);

  return (
    <div
      id="playback-control-bar"
      className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md space-y-4"
    >
      {/* Timeline Seeker Bar with Loop Region Indicator */}
      <div className="space-y-1.5 relative">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="font-semibold text-slate-200">{formatTime(currentTime)}</span>
          <div className="flex items-center gap-2">
            {isLoopActive && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                BOUCLE ACTIVE : {formatTime(loopStart)} ➔ {formatTime(loopEnd)} ({loopBarsCount} mes.)
              </span>
            )}
            <span className="text-[11px] text-slate-500">
              {duration > 0 ? `${Math.round((currentTime / duration) * 100)}%` : '0%'}
            </span>
          </div>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="relative w-full h-4 flex items-center">
          {/* Visual Highlighted Loop Zone */}
          {duration > 0 && loopEnd > loopStart && (
            <div
              className={`absolute top-0 bottom-0 rounded transition-all pointer-events-none z-10 flex items-center justify-between ${
                isLoopActive
                  ? 'bg-amber-500/30 border-y border-amber-400/80'
                  : 'bg-slate-700/30 border-y border-slate-600/50'
              }`}
              style={{
                left: `${startPercent}%`,
                width: `${widthPercent}%`,
              }}
            >
              {/* Marker A */}
              <div className="w-1.5 h-full bg-amber-400 rounded-l shadow-sm relative flex items-center justify-center">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-amber-300 bg-slate-950 px-1 rounded shadow">
                  A
                </span>
              </div>
              {/* Marker B */}
              <div className="w-1.5 h-full bg-amber-400 rounded-r shadow-sm relative flex items-center justify-center">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-amber-300 bg-slate-950 px-1 rounded shadow">
                  B
                </span>
              </div>
            </div>
          )}

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            aria-label="Timeline seek bar"
            value={currentTime}
            onChange={handleSeekChange}
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-3 transition-all relative z-20"
          />
        </div>
      </div>

      {/* Main Transport and Adjustment Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Transport Buttons (Large tactile touch targets) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="rewind-playback-btn"
            onClick={onRewind}
            className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 flex items-center justify-center text-slate-300 border border-slate-700 transition-all shadow-sm"
            title="Rewind to start"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            id="play-pause-btn"
            onClick={onPlayPause}
            className={`px-6 h-12 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-lg active:scale-95 ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            id="stop-playback-btn"
            onClick={onStop}
            className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 flex items-center justify-center text-slate-300 border border-slate-700 transition-all shadow-sm"
            title="Stop & Reset"
          >
            <Square className="w-5 h-5 fill-current" />
          </button>
        </div>

        {/* Center: Pitch Key Transposition (-12 to +12) */}
        <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800">
          <Music2 className="w-4 h-4 text-indigo-400" />
          <div className="text-left mr-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Key Transpose</p>
            <p className="text-xs font-mono font-bold text-slate-200">
              {transpose > 0 ? `+${transpose}` : transpose} st
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="transpose-down-btn"
              onClick={() => onTransposeChange(Math.max(-12, transpose - 1))}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 flex items-center justify-center text-sm font-bold text-slate-200 border border-slate-700"
              title="Lower key by 1 semitone"
            >
              -
            </button>

            {transpose !== 0 && (
              <button
                id="reset-transpose-btn"
                onClick={() => onTransposeChange(0)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-medium text-slate-400"
                title="Reset to original key"
              >
                Reset
              </button>
            )}

            <button
              id="transpose-up-btn"
              onClick={() => onTransposeChange(Math.min(12, transpose + 1))}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 flex items-center justify-center text-sm font-bold text-slate-200 border border-slate-700"
              title="Raise key by 1 semitone"
            >
              +
            </button>
          </div>
        </div>

        {/* Right: Tempo Scale (BPM) */}
        <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <div className="text-left mr-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tempo / Speed</p>
            <p className="text-xs font-mono font-bold text-slate-200">
              {currentBpm} BPM ({Math.round(tempoMultiplier * 100)}%)
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="tempo-down-btn"
              onClick={() => onTempoChange(Math.max(0.5, parseFloat((tempoMultiplier - 0.05).toFixed(2))))}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 flex items-center justify-center text-sm font-bold text-slate-200 border border-slate-700"
              title="Slow down"
            >
              -
            </button>

            {tempoMultiplier !== 1 && (
              <button
                id="reset-tempo-btn"
                onClick={() => onTempoChange(1)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-medium text-slate-400"
                title="Reset tempo to 100%"
              >
                100%
              </button>
            )}

            <button
              id="tempo-up-btn"
              onClick={() => onTempoChange(Math.min(1.5, parseFloat((tempoMultiplier + 0.05).toFixed(2))))}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 flex items-center justify-center text-sm font-bold text-slate-200 border border-slate-700"
              title="Speed up"
            >
              +
            </button>
          </div>
        </div>

        {/* Master Volume */}
        <div className="flex items-center gap-2.5 min-w-[140px]">
          <Volume2 className="w-4 h-4 text-slate-400" />
          <div className="flex-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>Master Vol</span>
              <span className="font-mono">{Math.round(masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              aria-label="Master Volume"
              value={masterVolume}
              onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* INTELLIGENT MIDI LOOP MODULE (A ⇄ B) */}
      {onToggleLoop && (
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 bg-slate-950/40 p-3 rounded-xl">
          {/* Left: Loop Toggle & Status */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="toggle-midi-loop-btn"
              onClick={onToggleLoop}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 ${
                isLoopActive
                  ? 'bg-amber-500 text-slate-950 shadow-amber-500/30 ring-2 ring-amber-400/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Activer ou désactiver la boucle MIDI A ⇄ B"
            >
              <Repeat className={`w-4 h-4 ${isLoopActive ? 'animate-spin' : ''}`} />
              <span>{isLoopActive ? 'Boucle A ⇄ B ACTIVE' : 'Activer Boucle A ⇄ B'}</span>
            </button>

            {onToggleSmartSnap && (
              <button
                type="button"
                onClick={onToggleSmartSnap}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                  smartSnap
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
                title="Calage intelligent : aligne automatiquement les points A et B sur le début exact d'une mesure (Bar)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Contrôle Intelligent : {smartSnap ? 'Mesures (Bar Snap)' : 'Temps Libre'}</span>
              </button>
            )}
          </div>

          {/* Center: Point A and Point B selectors */}
          <div className="flex items-center gap-2">
            {/* Point A */}
            <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
              <span className="font-bold text-amber-400 font-mono">A:</span>
              <span className="font-mono text-slate-200">{formatTime(loopStart)}</span>
              {onSetLoopPointA && (
                <button
                  type="button"
                  onClick={() => onSetLoopPointA()}
                  className="ml-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-600 hover:text-slate-950 text-[10px] font-bold text-amber-400 transition-colors"
                  title="Définir le Point A à la position actuelle de lecture"
                >
                  [A Pos.
                </button>
              )}
            </div>

            {/* Point B */}
            <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
              <span className="font-bold text-amber-400 font-mono">B:</span>
              <span className="font-mono text-slate-200">{formatTime(loopEnd)}</span>
              {onSetLoopPointB && (
                <button
                  type="button"
                  onClick={() => onSetLoopPointB()}
                  className="ml-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-600 hover:text-slate-950 text-[10px] font-bold text-amber-400 transition-colors"
                  title="Définir le Point B à la position actuelle de lecture"
                >
                  Pos. B]
                </button>
              )}
            </div>
          </div>

          {/* Right: Quick Musical Presets */}
          {onSetLoopBars && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[10px] font-semibold text-slate-500 uppercase mr-0.5 hidden sm:inline">
                Boucle rapide:
              </span>
              <button
                type="button"
                onClick={() => onSetLoopBars(4)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] font-semibold"
                title="Boucle parfaite de 4 mesures à partir de la position"
              >
                4 mes.
              </button>
              <button
                type="button"
                onClick={() => onSetLoopBars(8)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] font-semibold"
                title="Boucle parfaite de 8 mesures à partir de la position"
              >
                8 mes.
              </button>
              <button
                type="button"
                onClick={() => onSetLoopBars(16)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] font-semibold"
                title="Boucle parfaite de 16 mesures à partir de la position"
              >
                16 mes.
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

