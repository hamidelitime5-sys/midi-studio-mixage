import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  FileText,
  FileImage,
  FileSpreadsheet,
  Play,
  Pause,
  Square,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Music2,
  Sun,
  Moon,
  Volume2,
  Repeat,
  Sparkles,
  Sliders,
  X,
} from 'lucide-react';
import { ScoreItem } from '../types/score';
import { parseChordPro, transposeChord } from '../utils/chordProParser';
import { PdfCanvasViewer } from './PdfCanvasViewer';

interface Props {
  score: ScoreItem;
  onClose?: () => void;
  onUpdateScore?: (id: string, partial: Partial<ScoreItem>) => void;
  onNextScore?: () => void;
  onPrevScore?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  // Always visible next song preview
  nextScore?: ScoreItem | null;
  // Playback integration
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onStop?: () => void;
  currentTime?: number;
  duration?: number;
  // Loop integration
  isLoopActive?: boolean;
  loopStart?: number;
  loopEnd?: number;
  onToggleLoop?: () => void;
  onSetLoopPointA?: (time?: number) => void;
  onSetLoopPointB?: (time?: number) => void;
}

export const ScoreViewer: React.FC<Props> = ({
  score,
  onClose,
  onUpdateScore,
  onNextScore,
  onPrevScore,
  hasNext = false,
  hasPrev = false,
  nextScore = null,
  isPlaying = false,
  onPlayPause,
  onStop,
  currentTime = 0,
  duration = 0,
  isLoopActive = false,
  loopStart = 0,
  loopEnd = 0,
  onToggleLoop,
  onSetLoopPointA,
  onSetLoopPointB,
}) => {
  // Zoom & Pan state (for pinch-to-zoom on touchscreen)
  const [scale, setScale] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [paperTheme, setPaperTheme] = useState<'dark' | 'light'>('light');
  const [showSpeedPopover, setShowSpeedPopover] = useState(false);

  // Auto-scroll state: speed from 0 (arrêt) to 20 maxi
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(3); // 0 = arrêt, 1 = très lent, 20 = maxi
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Synchronize with HTML5 Fullscreen API
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!isFullscreen) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen().catch(() => {});
        }
        setIsFullscreen(true);
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen(!isFullscreen);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFsChange = () => {
      const isDocFs = !!document.fullscreenElement;
      if (!isDocFs && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, [isFullscreen]);

  // Transpose state for ChordPro
  const currentTranspose = score.currentTranspose || 0;
  const handleTranspose = (delta: number) => {
    const next = Math.max(-12, Math.min(12, currentTranspose + delta));
    onUpdateScore?.(score.id, { currentTranspose: next });
  };

  // Font size multiplier for ChordPro text
  const [fontSize, setFontSize] = useState<number>(16);

  // Touch Gesture Handling for 2-finger pinch-to-zoom & 1-finger pan
  const containerRef = useRef<HTMLDivElement>(null);
  const initialTouchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1.0);
  const isPinchingRef = useRef<boolean>(false);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 2 fingers detected: Pinch-to-zoom mode
      isPinchingRef.current = true;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      initialTouchDistanceRef.current = dist;
      initialScaleRef.current = scale;
    } else if (e.touches.length === 1 && scale > 1.05) {
      // 1 finger pan when zoomed in
      lastPanPointRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialTouchDistanceRef.current !== null) {
      // Two-finger pinch zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = currentDist / initialTouchDistanceRef.current;
      const newScale = Math.max(0.6, Math.min(4.5, initialScaleRef.current * ratio));
      setScale(parseFloat(newScale.toFixed(2)));
    } else if (e.touches.length === 1 && lastPanPointRef.current && scale > 1.05) {
      // One finger dragging while zoomed
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - lastPanPointRef.current.x;
      const deltaY = currentY - lastPanPointRef.current.y;
      setPan((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      lastPanPointRef.current = { x: currentX, y: currentY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialTouchDistanceRef.current = null;
      isPinchingRef.current = false;
    }
    if (e.touches.length === 0) {
      lastPanPointRef.current = null;
    }
  };

  // Zoom button controls
  const handleZoomIn = () => {
    setScale((prev) => Math.min(4.0, parseFloat((prev + 0.25).toFixed(2))));
  };
  const handleZoomOut = () => {
    setScale((prev) => Math.max(0.6, parseFloat((prev - 0.25).toFixed(2))));
  };
  const handleResetZoom = () => {
    setScale(1.0);
    setPan({ x: 0, y: 0 });
  };

  // HIGH-PRECISION SUB-PIXEL AUTO-SCROLL ENGINE (0 = Arrêt, 1 = ~2.4px/s, 20 = ~36px/s)
  useEffect(() => {
    if (!isAutoScrolling || scrollSpeed <= 0) return;

    let animId: number;
    let lastTime: number | null = null;
    let accumulator = 0;

    // Calibrated so speed 1 is comfortably slow for reading ballads, speed 20 is fast
    const pxPerSec = 0.8 + (scrollSpeed - 1) * 1.8;

    const tick = (time: number) => {
      if (lastTime !== null && scrollContainerRef.current) {
        const dt = (time - lastTime) / 1000;
        accumulator += dt * pxPerSec;
        if (accumulator >= 1) {
          const toScroll = Math.floor(accumulator);
          scrollContainerRef.current.scrollTop += toScroll;
          accumulator -= toScroll;
        }
      }
      lastTime = time;
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isAutoScrolling, scrollSpeed]);

  const toggleAutoScroll = () => {
    if (!isAutoScrolling) {
      if (scrollSpeed === 0) setScrollSpeed(3);
      setIsAutoScrolling(true);
    } else {
      setIsAutoScrolling(false);
    }
  };

  // ChordPro Parsing & Transposition with React Rendering
  const parsedChordPro = useMemo(() => {
    if (score.type !== 'chordpro') return null;
    return parseChordPro(score.content);
  }, [score.content, score.type]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const renderChordProContent = () => {
    if (!parsedChordPro) return null;
    return (
      <div className="space-y-4" style={{ fontSize: `${fontSize}px` }}>
        {parsedChordPro.lines.map((line, lineIdx) => {
          if (line.type === 'empty') {
            return <div key={lineIdx} className="h-4" />;
          }
          if (line.type === 'comment') {
            return (
              <div key={lineIdx} className="italic text-indigo-400 font-semibold text-sm">
                {line.directiveVal}
              </div>
            );
          }
          if (line.type === 'chorus-start') {
            return (
              <div key={lineIdx} className="font-bold text-amber-500 uppercase tracking-wider text-xs border-b border-amber-500/20 pb-1 mt-2">
                Refrain / Chorus
              </div>
            );
          }
          if (line.type === 'chorus-end' || line.type === 'directive') {
            return null;
          }

          const segments = line.segments || [];
          return (
            <div key={lineIdx} className="flex flex-wrap items-baseline gap-x-1.5 leading-relaxed">
              {segments.map((seg, segIdx) => {
                const chord = seg.chord ? transposeChord(seg.chord, currentTranspose) : null;
                return (
                  <div key={segIdx} className="inline-flex flex-col">
                    {chord && (
                      <span className="font-mono font-bold text-amber-500 text-sm tracking-wide select-none">
                        {chord}
                      </span>
                    )}
                    <span className="font-serif text-base tracking-normal select-text whitespace-pre">
                      {seg.text || ' '}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      id="score-viewer-screen"
      className={`flex flex-col bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden transition-all ${
        isFullscreen ? 'fixed inset-0 z-[9999] w-screen h-screen rounded-none border-none' : 'w-full h-[680px] rounded-2xl'
      }`}
    >
      {/* 1. TOP HEADER & TACTICAL TOOLBAR */}
      <div className="bg-slate-950/95 border-b border-slate-800 p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2.5 shrink-0 select-none">
        {/* Left: Score Title & Navigation */}
        <div className="flex items-center gap-2">
          {onPrevScore && (
            <button
              type="button"
              onClick={onPrevScore}
              disabled={!hasPrev}
              title="Partition précédente"
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              {score.type === 'chordpro' && <FileText className="w-4 h-4" />}
              {score.type === 'pdf' && <FileSpreadsheet className="w-4 h-4 text-rose-400" />}
              {score.type === 'image' && <FileImage className="w-4 h-4 text-emerald-400" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 truncate max-w-[180px] sm:max-w-xs flex items-center gap-1.5">
                <span>{score.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-slate-800 text-slate-300">
                  {score.type}
                </span>
                {(score.midiFileName || score.midiSongId) && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hidden sm:inline">
                    🎵 MIDI
                  </span>
                )}
              </h3>
              {score.artist && <p className="text-[11px] text-slate-400 truncate">{score.artist}</p>}
            </div>
          </div>

          {onNextScore && (
            <button
              type="button"
              onClick={onNextScore}
              disabled={!hasNext}
              title="Partition suivante"
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 active:scale-95 transition-transform"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Center: Mini Transport Bar & MIDI Loop integration */}
        <div className="flex items-center gap-2">
          {onPlayPause && (
            <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 shadow-sm">
              <button
                type="button"
                id="score-mini-play-btn"
                onClick={onPlayPause}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 ${
                  isPlaying
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
                title={isPlaying ? 'Pause la lecture MIDI' : 'Lancer la lecture MIDI'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Lecture'}</span>
              </button>

              {onStop && (
                <button
                  type="button"
                  onClick={onStop}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95"
                  title="Stop & Rembobiner"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              )}

              {/* Loop quick toggle on score viewer */}
              {onToggleLoop && (
                <button
                  type="button"
                  onClick={onToggleLoop}
                  className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition-all ${
                    isLoopActive
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                  }`}
                  title="Boucle MIDI A ⇄ B"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">{isLoopActive ? 'Boucle ON' : 'Boucle'}</span>
                </button>
              )}

              {duration > 0 && (
                <span className="text-[11px] font-mono font-bold text-slate-400 pl-1">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Tactile Auto-Scroll & View Controls */}
        <div className="flex items-center gap-1.5">
          {/* ChordPro Specific: Transposition */}
          {score.type === 'chordpro' && (
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase hidden sm:inline">Ton:</span>
              <button
                type="button"
                onClick={() => handleTranspose(-1)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 font-bold text-slate-200 active:scale-95"
                title="Transposer -1 demi-ton"
              >
                -
              </button>
              <span className="font-mono font-bold px-1 text-amber-400 min-w-[28px] text-center">
                {currentTranspose > 0 ? `+${currentTranspose}` : currentTranspose}
              </span>
              <button
                type="button"
                onClick={() => handleTranspose(1)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 font-bold text-slate-200 active:scale-95"
                title="Transposer +1 demi-ton"
              >
                +
              </button>
            </div>
          )}

          {/* AUTO-SCROLL CONTROL WITH TACTILE 0 to 20 SPEED ADJUSTMENT */}
          <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-0.5">
            <button
              type="button"
              id="toggle-auto-scroll-btn"
              onClick={toggleAutoScroll}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                isAutoScrolling
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                  : 'bg-transparent text-slate-300 hover:bg-slate-800'
              }`}
              title="Défilement automatique pour jeu mains libres (Tactile)"
            >
              <ArrowDown className={`w-3.5 h-3.5 ${isAutoScrolling && scrollSpeed > 0 ? 'animate-bounce' : ''}`} />
              <span>{isAutoScrolling ? 'Auto-Scroll ON' : 'Auto-Scroll'}</span>
            </button>

            {/* Stepper Speed Buttons (0 = Arrêt, 20 = Maxi) */}
            <div className="flex items-center px-1">
              <button
                type="button"
                onClick={() => setScrollSpeed((s) => Math.max(0, s - 1))}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold active:scale-95"
                title="Diminuer vitesse de défilement (vers 0)"
              >
                -
              </button>

              <button
                type="button"
                onClick={() => setShowSpeedPopover(!showSpeedPopover)}
                className="px-1.5 py-0.5 text-[11px] font-mono font-bold text-amber-400 hover:underline min-w-[55px] text-center"
                title="Cliquez pour régler la vitesse de 0 à 20"
              >
                {scrollSpeed === 0 ? '0 (Arrêt)' : `Vit: ${scrollSpeed}/20`}
              </button>

              <button
                type="button"
                onClick={() => setScrollSpeed((s) => Math.min(20, s + 1))}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold active:scale-95"
                title="Augmenter vitesse de défilement (maxi 20)"
              >
                +
              </button>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 active:scale-95"
              title="Dézoomer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-1.5 py-1 text-[11px] font-mono font-bold text-slate-300 hover:text-white"
              title="Réinitialiser zoom (100%)"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 active:scale-95"
              title="Zoomer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Theme Switch (Papier Blanc / Sombre Scène) */}
          <button
            type="button"
            onClick={() => setPaperTheme(paperTheme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95"
            title={paperTheme === 'light' ? 'Mode Sombre Scène' : 'Mode Papier Blanc'}
          >
            {paperTheme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* FULLSCREEN BUTTON WITH HIGH VISIBILITY ON TACTILE */}
          {isFullscreen ? (
            <button
              type="button"
              id="exit-fullscreen-btn-header"
              onClick={toggleFullscreen}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all border border-rose-400/50"
              title="Quitter le mode plein écran et revenir à la console"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span>Quitter Plein Écran</span>
            </button>
          ) : (
            <button
              type="button"
              id="enter-fullscreen-btn"
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 active:scale-95 transition-all"
              title="Afficher la partition en Plein Écran (Tactile)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}

          {onClose && !isFullscreen && (
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 hover:text-rose-300 text-slate-400 active:scale-95"
              title="Fermer la partition"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. PERSISTENT STAGE HUD: ALWAYS VISIBLE NEXT SONG PREVIEW */}
      {nextScore ? (
        <div
          id="stage-next-song-banner"
          className="bg-gradient-to-r from-amber-500/25 via-slate-900 to-indigo-950/40 border-b border-amber-500/40 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-mono shadow-sm animate-pulse">
              PROCHAIN MORCEAU ⏭
            </span>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-amber-200 truncate max-w-xs sm:max-w-md">
                {nextScore.title}
              </span>
              {nextScore.artist && (
                <span className="text-xs text-slate-400 hidden sm:inline truncate">
                  ({nextScore.artist})
                </span>
              )}
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {nextScore.type}
              </span>
              {(nextScore.midiFileName || nextScore.midiSongId) && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                  🎵 MIDI Inclus
                </span>
              )}
            </div>
          </div>

          {onNextScore && (
            <button
              type="button"
              id="stage-jump-next-btn"
              onClick={onNextScore}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all"
              title="Passer immédiatement au morceau suivant"
            >
              <span>Passer au suivant</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="font-medium text-slate-400 flex items-center gap-2">
            🏁 <strong>Fin de la Setlist</strong> : C&apos;est le dernier morceau du programme !
          </span>
          {onPrevScore && hasPrev && (
            <button
              type="button"
              onClick={onPrevScore}
              className="text-xs text-indigo-400 hover:underline"
            >
              Revenir au morceau précédent
            </button>
          )}
        </div>
      )}

      {/* 3. TACTILE SPEED CONTROLLER POPOVER */}
      {showSpeedPopover && (
        <div className="bg-slate-900 border-b border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 bg-slate-900/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-200">
              Vitesse de défilement : <span className="font-mono text-amber-400 font-bold">{scrollSpeed} / 20</span>
              {scrollSpeed === 0 && <span className="text-rose-400 ml-1">(Arrêt complet)</span>}
            </span>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(parseInt(e.target.value, 10))}
              className="w-40 sm:w-56 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] uppercase mr-1">Préréglages:</span>
            <button
              type="button"
              onClick={() => setScrollSpeed(0)}
              className={`px-2 py-1 rounded text-[11px] font-bold ${scrollSpeed === 0 ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'}`}
            >
              0 (Arrêt)
            </button>
            <button
              type="button"
              onClick={() => setScrollSpeed(2)}
              className={`px-2 py-1 rounded text-[11px] font-bold ${scrollSpeed === 2 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
            >
              2 (Lent)
            </button>
            <button
              type="button"
              onClick={() => setScrollSpeed(5)}
              className={`px-2 py-1 rounded text-[11px] font-bold ${scrollSpeed === 5 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
            >
              5 (Normal)
            </button>
            <button
              type="button"
              onClick={() => setScrollSpeed(10)}
              className={`px-2 py-1 rounded text-[11px] font-bold ${scrollSpeed === 10 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
            >
              10 (Rapide)
            </button>
            <button
              type="button"
              onClick={() => setScrollSpeed(20)}
              className={`px-2 py-1 rounded text-[11px] font-bold ${scrollSpeed === 20 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
            >
              20 (Max)
            </button>
            <button
              type="button"
              onClick={() => setShowSpeedPopover(false)}
              className="ml-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px]"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN TOUCH-RESPONSIVE CANVAS / VIEWPORT */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative flex-1 overflow-hidden touch-none select-none flex items-center justify-center p-2 sm:p-4 ${
          paperTheme === 'light' ? 'bg-[#d8dce2]' : 'bg-[#0f1217]'
        }`}
      >
        {/* Scrollable Container with Zoom & Pan Transform */}
        <div
          ref={scrollContainerRef}
          className="w-full h-full overflow-y-auto overflow-x-auto rounded-xl flex justify-center custom-console-scroll"
        >
          <div
            style={{
              transform: `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: 'top center',
              transition: isPinchingRef.current ? 'none' : 'transform 0.1s ease-out',
            }}
            className={`min-h-full transition-shadow ${
              paperTheme === 'light'
                ? 'bg-white text-slate-900 shadow-2xl border border-slate-300'
                : 'bg-slate-950 text-slate-100 shadow-2xl border border-slate-800'
            } rounded-xl p-6 sm:p-10 w-full max-w-4xl shrink-0 my-auto`}
          >
            {/* 1. CHORDPRO RENDERER */}
            {score.type === 'chordpro' && renderChordProContent()}

            {/* 2. PDF RENDERER (Native Canvas rendering, bypasses Chrome sandbox iframe blocking) */}
            {score.type === 'pdf' && (
              <PdfCanvasViewer pdfUrl={score.content} title={score.title} />
            )}

            {/* 3. PHOTO / IMAGE SCORE RENDERER */}
            {score.type === 'image' && (
              <div className="flex flex-col items-center justify-center w-full min-h-[500px]">
                <img
                  src={score.content}
                  alt={score.title}
                  className="max-w-full h-auto object-contain rounded-lg shadow-lg pointer-events-none"
                  draggable={false}
                />
              </div>
            )}
          </div>
        </div>

        {/* Floating Tactile Gesture Hint Pill */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-950/80 backdrop-blur-md border border-slate-800 text-slate-300 px-3.5 py-1.5 rounded-full text-xs font-medium shadow-xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Écran tactile : <strong>Pincez avec 2 doigts</strong> pour zoomer</span>
          {scale !== 1 && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="pointer-events-auto text-amber-400 hover:text-amber-300 font-bold underline ml-1"
            >
              Reset
            </button>
          )}
        </div>

        {/* FULLSCREEN EMERGENCY EXIT PILL (Fixed at bottom right corner for easy 1-thumb touch tap) */}
        {isFullscreen && (
          <button
            type="button"
            id="exit-fullscreen-btn-floating"
            onClick={toggleFullscreen}
            className="absolute bottom-5 right-5 z-50 px-4 py-2.5 rounded-2xl bg-rose-600/90 hover:bg-rose-500 active:scale-95 text-white font-black text-xs flex items-center gap-2 shadow-2xl backdrop-blur-md border border-rose-400/50"
            title="Quitter Plein Écran (Touche tactile)"
          >
            <X className="w-4 h-4 stroke-[3]" />
            <span>Quitter Plein Écran</span>
          </button>
        )}
      </div>
    </div>
  );
};
