import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Disc3,
  Sliders,
  Volume2,
  FileMusic,
  LayoutGrid,
  Laptop,
  Radio,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ParsedMidiSong, MidiChannelConfig, CustomSf2SoundFont } from './types/midi';
import { ScoreItem, Setlist } from './types/score';
import { getStandByMeSong } from './data/demoSongs';
import { getInitialScores, DEFAULT_SETLISTS } from './data/defaultScores';
import { createBandTemplateChannels } from './data/bandTemplate';
import { webMidi } from './utils/webMidiService';
import { webAudioSynth } from './utils/webAudioSynth';
import { MidiDeviceSelector } from './components/MidiDeviceSelector';
import { ChannelMixer } from './components/ChannelMixer';
import { PlaybackControls } from './components/PlaybackControls';
import { MidiFileDropzone } from './components/MidiFileDropzone';
import { InstrumentModal } from './components/InstrumentModal';
import { ScoreViewer } from './components/ScoreViewer';
import { SetlistManager } from './components/SetlistManager';
import { TauriInstallModal } from './components/TauriInstallModal';
import { FocusriteScarlettModal } from './components/FocusriteScarlettModal';
import { SoundFontLibraryTab } from './components/SoundFontLibraryTab';
import { loadSoundFontFromIndexedDB } from './utils/sf2Storage';
import { parseSf2Header } from './utils/sf2Parser';
import { createKetronSd2CustomSf2 } from './data/ketronSd2Presets';

export function App() {
  // Page / Tab Navigation: 'mixer' (Table de mixage & Import), 'scores' (Partitions & Setlist), or 'soundfonts' (Banque SF2)
  const [activeTab, setActiveTab] = useState<'mixer' | 'scores' | 'soundfonts'>('mixer');
  const [isTauriModalOpen, setIsTauriModalOpen] = useState<boolean>(false);
  const [isScarlettModalOpen, setIsScarlettModalOpen] = useState<boolean>(false);

  // SoundFont Library & Auto-matching state - Pre-loaded with official Ketron SD2 SBA profile
  const [loadedSf2, setLoadedSf2] = useState<CustomSf2SoundFont | null>(() => createKetronSd2CustomSf2());
  const [autoMatchOnImport, setAutoMatchOnImport] = useState<boolean>(true);

  // Scores & Setlists state
  const [scores, setScores] = useState<ScoreItem[]>(() => getInitialScores());
  const [setlists, setSetlists] = useState<Setlist[]>(() => DEFAULT_SETLISTS);
  const [activeSetlistId, setActiveSetlistId] = useState<string>('all-scores');
  const [selectedScoreId, setSelectedScoreId] = useState<string | null>('score-1');

  // Current loaded song (defaults to Stand By Me demo)
  const [song, setSong] = useState<ParsedMidiSong>(() => getStandByMeSong());
  const [channels, setChannels] = useState<MidiChannelConfig[]>(() => song.channels);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [transpose, setTranspose] = useState<number>(0);
  const [tempoMultiplier, setTempoMultiplier] = useState<number>(1.0);
  const [masterVolume, setMasterVolume] = useState<number>(0.85);

  // Audio routing state
  const [internalAudioEnabled, setInternalAudioEnabled] = useState<boolean>(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Modal state
  const [modalChannelIdx, setModalChannelIdx] = useState<number | null>(null);

  // Intelligent Loop & Practice State
  const [isLoopActive, setIsLoopActive] = useState<boolean>(false);
  const [loopStart, setLoopStart] = useState<number>(0);
  const [loopEnd, setLoopEnd] = useState<number>(song.duration);
  const [smartSnap, setSmartSnap] = useState<boolean>(true);

  // Refs for animation loop and scheduling
  const animationFrameRef = useRef<number | null>(null);
  const lastWallTimeRef = useRef<number | null>(null);
  const currentTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const channelsRef = useRef<MidiChannelConfig[]>(channels);
  const transposeRef = useRef<number>(transpose);
  const tempoRef = useRef<number>(tempoMultiplier);
  const songRef = useRef<ParsedMidiSong>(song);
  const internalAudioRef = useRef<boolean>(internalAudioEnabled);
  const isLoopActiveRef = useRef<boolean>(isLoopActive);
  const loopStartRef = useRef<number>(loopStart);
  const loopEndRef = useRef<number>(loopEnd);
  const playbackNoteIndexRef = useRef<number>(0);

  // Keep refs synchronized
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);
  useEffect(() => {
    transposeRef.current = transpose;
  }, [transpose]);
  useEffect(() => {
    tempoRef.current = tempoMultiplier;
  }, [tempoMultiplier]);
  useEffect(() => {
    songRef.current = song;
  }, [song]);
  useEffect(() => {
    internalAudioRef.current = internalAudioEnabled;
    webAudioSynth.setEnabled(internalAudioEnabled);
  }, [internalAudioEnabled]);
  useEffect(() => {
    webAudioSynth.setMasterVolume(masterVolume);
  }, [masterVolume]);
  useEffect(() => {
    isLoopActiveRef.current = isLoopActive;
  }, [isLoopActive]);
  useEffect(() => {
    loopStartRef.current = loopStart;
  }, [loopStart]);
  useEffect(() => {
    loopEndRef.current = loopEnd;
  }, [loopEnd]);

  // Binary search cursor to jump playback index in O(log N) instead of scanning all notes
  const resetPlaybackIndex = useCallback((targetTime: number) => {
    const notes = songRef.current.notes;
    let low = 0;
    let high = notes.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (notes[mid].time < targetTime) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    playbackNoteIndexRef.current = low;
  }, []);

  // Restore cached SoundFont 2 from IndexedDB on application startup
  useEffect(() => {
    loadSoundFontFromIndexedDB()
      .then((cached) => {
        if (cached && cached.buffer) {
          try {
            const meta = parseSf2Header(cached.buffer);
            const restoredSf2: CustomSf2SoundFont = {
              fileName: cached.fileName,
              fileSize: cached.buffer.byteLength,
              bankMsb: meta.presets[0]?.bank || 0,
              bankLsb: 0,
              presetProgram: meta.presets[0]?.program || 0,
              presetName: meta.presets[0]?.name || cached.fileName,
              loadedAt: new Date().toISOString(),
              presetsList: meta.presets.map((p) => ({
                name: p.name,
                program: p.program,
                bank: p.bank,
              })),
            };
            setLoadedSf2(restoredSf2);
            webAudioSynth.loadSoundFontMetadata(meta);
            console.log(`[Storage] Restored SF2 bank: ${cached.fileName} (${meta.presets.length} presets)`);
          } catch (e) {
            console.warn('Could not parse cached SF2:', e);
          }
        }
      })
      .catch((err) => {
        console.warn('Error accessing SF2 storage:', err);
      });
  }, []);

  // Batch update multiple channels (e.g. for SF2 auto-matching)
  const handleBatchUpdateChannels = (
    updates: { channelIndex: number; partial: Partial<MidiChannelConfig> }[]
  ) => {
    setChannels((prev) => {
      const copy = [...prev];
      updates.forEach(({ channelIndex, partial }) => {
        if (copy[channelIndex]) {
          copy[channelIndex] = { ...copy[channelIndex], ...partial };
        }
      });
      webMidi.chaseState(copy);
      return copy;
    });
  };

  // When song changes, update channels, auto-match SF2 if active, and reset position
  const handleSongLoaded = (newSong: ParsedMidiSong) => {
    handleStop();
    setSong(newSong);

    let updatedChannels = newSong.channels;

    // If a custom SF2 library is loaded and auto-match is enabled, match instruments automatically
    if (autoMatchOnImport && loadedSf2?.presetsList && loadedSf2.presetsList.length > 0) {
      updatedChannels = updatedChannels.map((ch, idx) => {
        const isDrum = ch.isDrum || idx === 9;
        let matchedPreset = isDrum
          ? loadedSf2.presetsList?.find((p) => p.bank === 128) ||
            loadedSf2.presetsList?.find((p) => p.name.toLowerCase().includes('drum')) ||
            loadedSf2.presetsList?.[0]
          : loadedSf2.presetsList?.find((p) => p.program === ch.program && p.bank === 0) ||
            loadedSf2.presetsList?.find((p) => p.program === ch.program) ||
            loadedSf2.presetsList?.[0];

        if (matchedPreset) {
          return {
            ...ch,
            program: matchedPreset.program,
            bankMsb: matchedPreset.bank,
            bankLsb: 0,
            customSf2: {
              fileName: loadedSf2.fileName,
              bankMsb: matchedPreset.bank,
              bankLsb: 0,
              presetProgram: matchedPreset.program,
              presetName: matchedPreset.name,
              loadedAt: new Date().toISOString(),
            },
            name: `${ch.roleTitle ? ch.roleTitle.split('/')[0].trim() : 'Piste'} - ${matchedPreset.name}`,
          };
        }
        return ch;
      });
    }

    setChannels(updatedChannels);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    resetPlaybackIndex(0);
    setLoopStart(0);
    setLoopEnd(newSong.duration);

    // Sync channel mixing parameters to internal audio synth
    updatedChannels.forEach((ch, idx) => {
      webAudioSynth.setChannelVolume(idx, ch.volume);
      webAudioSynth.setChannelPan(idx, ch.pan);
      webAudioSynth.setChannelMute(idx, ch.muted);
      webAudioSynth.setChannelSolo(idx, ch.solo);
    });

    // Chase new song channel settings
    webMidi.chaseState(updatedChannels);
  };

  // Re-apply / lock the 12 fixed band channels template
  const handleApplyBandTemplate = () => {
    setChannels((prev) => {
      const updated = createBandTemplateChannels(prev);
      updated.forEach((ch, idx) => {
        webAudioSynth.setChannelVolume(idx, ch.volume);
        webAudioSynth.setChannelPan(idx, ch.pan);
        webAudioSynth.setChannelMute(idx, ch.muted);
        webAudioSynth.setChannelSolo(idx, ch.solo);
      });
      webMidi.chaseState(updated);
      return updated;
    });
  };

  // Activity timer cleaner to reset VU-meter lights
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setChannels((prev) => {
        let changed = false;
        const updated = prev.map((ch) => {
          if (ch.activeNoteCount > 0 && now - ch.lastActivityTime > 140) {
            changed = true;
            return { ...ch, activeNoteCount: 0 };
          }
          return ch;
        });
        return changed ? updated : prev;
      });
    }, 80);

    return () => clearInterval(timer);
  }, []);

  // Update a single channel setting
  const handleUpdateChannel = (channelIndex: number, partial: Partial<MidiChannelConfig>) => {
    setChannels((prev) => {
      const copy = [...prev];
      copy[channelIndex] = { ...copy[channelIndex], ...partial };
      return copy;
    });

    if (channelsRef.current && channelsRef.current[channelIndex]) {
      channelsRef.current[channelIndex] = {
        ...channelsRef.current[channelIndex],
        ...partial,
      };
    }

    // Sync directly to internal HD synth
    if (partial.volume !== undefined) {
      webAudioSynth.setChannelVolume(channelIndex, partial.volume);
    }
    if (partial.pan !== undefined) {
      webAudioSynth.setChannelPan(channelIndex, partial.pan);
    }
    if (partial.muted !== undefined) {
      webAudioSynth.setChannelMute(channelIndex, partial.muted);
    }
    if (partial.solo !== undefined) {
      webAudioSynth.setChannelSolo(channelIndex, partial.solo);
    }

    // If program or bank was modified, send immediately to MIDI output
    if (partial.program !== undefined || partial.bankMsb !== undefined || partial.bankLsb !== undefined) {
      const target = { ...channels[channelIndex], ...partial };
      webMidi.sendProgramChange(channelIndex, target.program, target.bankMsb, target.bankLsb);
    }
  };

  // Note scheduling loop with high-precision cursor & Web Audio timing
  const triggerPlaybackNotes = useCallback(
    (timeStart: number, timeEnd: number) => {
      const curSong = songRef.current;
      const curChannels = channelsRef.current;
      const curTranspose = transposeRef.current;
      const curTempo = Math.max(0.1, tempoRef.current);
      const hasSolo = curChannels.some((c) => c.solo);
      const notes = curSong.notes;

      let idx = playbackNoteIndexRef.current;
      // Resynchronize cursor if it's out of boundary
      if (idx >= notes.length || (idx > 0 && notes[idx]?.time > timeEnd)) {
        resetPlaybackIndex(timeStart);
        idx = playbackNoteIndexRef.current;
      }

      const audioCtx = webAudioSynth.getAudioContext();
      const baseAudioTime = audioCtx ? audioCtx.currentTime : 0;

      while (idx < notes.length) {
        const note = notes[idx];
        if (note.time >= timeEnd) {
          break;
        }

        if (note.time >= timeStart) {
          const chIdx = note.channel;
          const chConfig = curChannels[chIdx];

          if (chConfig && !chConfig.muted && (!hasSolo || chConfig.solo)) {
            // Melodic notes get transposed; Drum channel (Ch 10 / index 9) is strictly preserved!
            const pitch =
              chIdx === 9 || chConfig.isDrum
                ? note.midi
                : Math.max(0, Math.min(127, note.midi + curTranspose));

            const timeDelta = Math.max(0, (note.time - timeStart) / curTempo);
            const exactAudioTime = baseAudioTime + timeDelta;
            const noteDurationSec = Math.max(0.04, note.duration / curTempo);

            // 1. Send to Web MIDI / SynthFont2
            webMidi.sendNoteOn(chIdx, pitch, note.velocity);

            // 2. High-precision Web Audio synthesis with scheduled duration & 0 overload
            if (internalAudioRef.current) {
              webAudioSynth.scheduleNote(
                chIdx,
                pitch,
                note.velocity,
                noteDurationSec,
                exactAudioTime,
                chConfig.program,
                chIdx === 9 || chConfig.isDrum,
                chConfig.bankMsb
              );
            }

            // Schedule Note Off for external MIDI hardware
            setTimeout(() => {
              webMidi.sendNoteOff(chIdx, pitch);
            }, Math.max(30, noteDurationSec * 1000));

            // Trigger visual VU-meter activity on channel
            chConfig.activeNoteCount = Math.max(1, Math.round(note.velocity * 10));
            chConfig.lastActivityTime = Date.now();
          }
        }
        idx++;
      }
      playbackNoteIndexRef.current = idx;
    },
    [resetPlaybackIndex]
  );

  // Animation frame loop
  const runPlaybackTick = useCallback(
    (timestamp: number) => {
      if (!isPlayingRef.current) return;

      if (lastWallTimeRef.current === null) {
        lastWallTimeRef.current = timestamp;
      }

      const wallDeltaSec = (timestamp - lastWallTimeRef.current) / 1000;
      lastWallTimeRef.current = timestamp;

      // Adjust delta by tempo multiplier
      const effectiveDeltaSec = wallDeltaSec * tempoRef.current;
      const prevTime = currentTimeRef.current;
      const nextTime = prevTime + effectiveDeltaSec;

      // Check if practice loop end reached
      if (
        isLoopActiveRef.current &&
        loopEndRef.current > loopStartRef.current &&
        nextTime >= loopEndRef.current
      ) {
        webMidi.allNotesOff();
        webAudioSynth.stopAll();
        const loopPoint = loopStartRef.current;
        currentTimeRef.current = loopPoint;
        setCurrentTime(loopPoint);
        resetPlaybackIndex(loopPoint);
        webMidi.chaseState(channelsRef.current);
        lastWallTimeRef.current = timestamp;
        animationFrameRef.current = requestAnimationFrame(runPlaybackTick);
        return;
      }

      // Check if song ended
      if (nextTime >= songRef.current.duration) {
        // Stop playback
        handleStop();
        return;
      }

      // Schedule notes that fall in this frame interval
      triggerPlaybackNotes(prevTime, nextTime);

      currentTimeRef.current = nextTime;
      setCurrentTime(nextTime);

      animationFrameRef.current = requestAnimationFrame(runPlaybackTick);
    },
    [triggerPlaybackNotes, resetPlaybackIndex]
  );

  const handleMasterVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    webAudioSynth.setMasterVolume(vol);
    webMidi.sendMasterVolume(Math.round(vol * 127));
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      // Pause
      isPlayingRef.current = false;
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastWallTimeRef.current = null;
      webMidi.allNotesOff();
      webAudioSynth.stopAll();
    } else {
      // Start Playback
      if (internalAudioEnabled) {
        webAudioSynth.init();
      }

      // Resync note scheduling cursor to current playback position
      resetPlaybackIndex(currentTimeRef.current);

      // 1. Chase MIDI State (Bank MSB/LSB, Program Change, Volume, Pan) to SynthFont2
      webMidi.chaseState(channelsRef.current);

      isPlayingRef.current = true;
      setIsPlaying(true);
      lastWallTimeRef.current = null;
      animationFrameRef.current = requestAnimationFrame(runPlaybackTick);
    }
  };

  const handleStop = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    lastWallTimeRef.current = null;
    currentTimeRef.current = 0;
    setCurrentTime(0);
    resetPlaybackIndex(0);
    webMidi.allNotesOff();
    webAudioSynth.stopAll();
  };

  const handleRewind = () => {
    webMidi.allNotesOff();
    webAudioSynth.stopAll();
    currentTimeRef.current = 0;
    setCurrentTime(0);
    resetPlaybackIndex(0);
    webMidi.chaseState(channelsRef.current);
  };

  const handleSeek = (targetTime: number) => {
    webMidi.allNotesOff();
    webAudioSynth.stopAll();
    const clamped = Math.max(0, Math.min(song.duration, targetTime));
    currentTimeRef.current = clamped;
    setCurrentTime(clamped);
    resetPlaybackIndex(clamped);
    // Chase state so SynthFont2 instruments are aligned at new seek position
    webMidi.chaseState(channelsRef.current);
  };

  // Loop & Practice Handlers
  const handleToggleLoop = () => {
    setIsLoopActive((prev) => !prev);
  };

  const handleSetLoopPointA = (time?: number) => {
    const target = time !== undefined ? time : currentTimeRef.current;
    setLoopStart(Math.max(0, target));
    if (loopEnd <= target) {
      setLoopEnd(Math.min(song.duration, target + 8));
    }
  };

  const handleSetLoopPointB = (time?: number) => {
    const target = time !== undefined ? time : currentTimeRef.current;
    if (target > loopStart) {
      setLoopEnd(Math.min(song.duration, target));
    }
  };

  const handleSetLoopBars = (bars: number) => {
    const bpm = song.bpm || 120;
    const beatsPerMeasure = song.timeSignature ? song.timeSignature[0] : 4;
    const secondsPerBar = (60 / bpm) * beatsPerMeasure;
    const duration = secondsPerBar * bars;
    const start = currentTimeRef.current;
    setLoopStart(start);
    setLoopEnd(Math.min(song.duration, start + duration));
    setIsLoopActive(true);
  };

  // Score & Setlist handlers
  const handleSelectScore = (score: ScoreItem) => {
    setSelectedScoreId(score.id);
  };

  const handleAddScores = (newItems: ScoreItem[]) => {
    setScores((prev) => [...newItems, ...prev]);
    if (activeSetlistId !== 'all-scores') {
      setSetlists((prev) =>
        prev.map((s) =>
          s.id === activeSetlistId
            ? { ...s, scoreIds: [...newItems.map((item) => item.id), ...s.scoreIds] }
            : s
        )
      );
    }
  };

  const handleDeleteScore = (scoreId: string) => {
    setScores((prev) => prev.filter((s) => s.id !== scoreId));
    setSetlists((prev) =>
      prev.map((s) => ({
        ...s,
        scoreIds: s.scoreIds.filter((id) => id !== scoreId),
      }))
    );
    if (selectedScoreId === scoreId) {
      setSelectedScoreId(null);
    }
  };

  const handleUpdateScore = (scoreId: string, partial: Partial<ScoreItem>) => {
    setScores((prev) =>
      prev.map((s) => (s.id === scoreId ? { ...s, ...partial } : s))
    );
  };

  const handleCreateSetlist = (name: string) => {
    const newSet: Setlist = {
      id: `setlist-${Date.now()}`,
      name,
      scoreIds: [],
      createdAt: Date.now(),
    };
    setSetlists((prev) => [...prev, newSet]);
    setActiveSetlistId(newSet.id);
  };

  const handleToggleScoreInSetlist = (setlistId: string, scoreId: string) => {
    setSetlists((prev) =>
      prev.map((s) => {
        if (s.id !== setlistId) return s;
        const exists = s.scoreIds.includes(scoreId);
        return {
          ...s,
          scoreIds: exists ? s.scoreIds.filter((id) => id !== scoreId) : [...s.scoreIds, scoreId],
        };
      })
    );
  };

  // Currently selected score object
  const currentSelectedScore = scores.find((s) => s.id === selectedScoreId) || scores[0] || null;

  // Active setlist scores array for next / prev navigation
  const activeSetlistScores = scores.filter((score) => {
    if (activeSetlistId === 'all-scores') return true;
    const set = setlists.find((s) => s.id === activeSetlistId);
    return set?.scoreIds.includes(score.id);
  });

  const currentScoreIndex = currentSelectedScore
    ? activeSetlistScores.findIndex((s) => s.id === currentSelectedScore.id)
    : -1;

  const handleNextScore = () => {
    if (currentScoreIndex >= 0 && currentScoreIndex < activeSetlistScores.length - 1) {
      setSelectedScoreId(activeSetlistScores[currentScoreIndex + 1].id);
    }
  };

  const handlePrevScore = () => {
    if (currentScoreIndex > 0) {
      setSelectedScoreId(activeSetlistScores[currentScoreIndex - 1].id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white pb-12">
      {/* Top Navigation / Studio Rack Banner */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-amber-500 to-orange-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-amber-400">
                <Disc3 className={`w-5 h-5 ${isPlaying ? 'animate-spin' : ''}`} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-100 uppercase">
                  MIDI Studio & Partitions
                </h1>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  SF2 / SynthFont2 2.9.2.2
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Console MG-16XU, partitions ChordPro / PDF / Photos avec zoom tactile 2 doigts & gestion de setlist
              </p>
            </div>
          </div>

          {/* Big Tactile Touch Tabs (Mixer vs Partitions) */}
          <nav className="flex items-center gap-2">
            <button
              type="button"
              id="nav-tab-mixer"
              onClick={() => setActiveTab('mixer')}
              className={`min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                activeTab === 'mixer'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4 text-indigo-300" />
              <span>Table de Mixage & Import</span>
            </button>

            <button
              type="button"
              id="nav-tab-scores"
              onClick={() => setActiveTab('scores')}
              className={`min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                activeTab === 'scores'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/30 ring-2 ring-amber-300'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <FileMusic className="w-4 h-4 text-amber-500" />
              <span>Partitions & Setlist ({scores.length})</span>
            </button>

            {/* SoundFont Library & Matcher Dedicated Tab */}
            <button
              type="button"
              id="nav-tab-soundfonts"
              onClick={() => setActiveTab('soundfonts')}
              className={`min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                activeTab === 'soundfonts'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/30 ring-2 ring-amber-300'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>🎹 Grande Banque SF2 & Recherche</span>
            </button>

            {/* Tauri Desktop App & Install Modal Trigger */}
            <button
              type="button"
              id="btn-open-tauri-modal"
              onClick={() => setIsTauriModalOpen(true)}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer group"
              title="Installer sur votre PC Windows / Linux / Mac avec Tauri ou en PWA"
            >
              <Laptop className="w-4 h-4 text-indigo-400 group-hover:text-amber-400 transition-colors" />
              <span className="hidden md:inline font-medium">Installer sur PC (Tauri)</span>
            </button>

            {/* Scarlett Solo 3rd Gen ASIO Quick Trigger */}
            <button
              type="button"
              id="btn-open-scarlett-modal"
              onClick={() => setIsScarlettModalOpen(true)}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white border border-red-500/80 flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer group"
              title="Focusrite Scarlett Solo (3rd Gen) - Pilote ASIO & buffer faible latence"
            >
              <Radio className="w-4 h-4 text-red-300 group-hover:scale-110 transition-transform" />
              <span className="hidden lg:inline font-bold">Scarlett Solo ASIO</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1 w-full">
        {/* PAGE 1: TABLE DE MIXAGE & IMPORT */}
        {activeTab === 'mixer' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* 1. MIDI Output Device & Diagnostic Controls */}
            <MidiDeviceSelector
              internalAudioEnabled={internalAudioEnabled}
              onToggleInternalAudio={setInternalAudioEnabled}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={setSelectedDeviceId}
            />

            {/* 2. Transport & Playback Control Bar */}
            <PlaybackControls
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onStop={handleStop}
              onRewind={handleRewind}
              currentTime={currentTime}
              duration={song.duration}
              onSeek={handleSeek}
              transpose={transpose}
              onTransposeChange={setTranspose}
              tempoMultiplier={tempoMultiplier}
              onTempoChange={setTempoMultiplier}
              baseBpm={song.bpm}
              masterVolume={masterVolume}
              onMasterVolumeChange={handleMasterVolumeChange}
              isLoopActive={isLoopActive}
              loopStart={loopStart}
              loopEnd={loopEnd}
              smartSnap={smartSnap}
              onToggleLoop={handleToggleLoop}
              onSetLoopPointA={handleSetLoopPointA}
              onSetLoopPointB={handleSetLoopPointB}
              onSetLoopBars={handleSetLoopBars}
              onToggleSmartSnap={() => setSmartSnap(!smartSnap)}
              timeSignature={song.timeSignature}
            />

            {/* 3. Yamaha MG Series Style 16-Channel Console */}
            <ChannelMixer
              channels={channels}
              onUpdateChannel={handleUpdateChannel}
              onOpenInstrumentModal={(idx) => setModalChannelIdx(idx)}
              internalAudioEnabled={internalAudioEnabled}
              masterVolume={masterVolume}
              onMasterVolumeChange={handleMasterVolumeChange}
              onOpenScarlettModal={() => setIsScarlettModalOpen(true)}
              onApplyBandTemplate={handleApplyBandTemplate}
            />

            {/* 4. MIDI & KAR File Uploader / Preloaded Demos */}
            <MidiFileDropzone onSongLoaded={handleSongLoaded} currentSongTitle={song.title} />

            {/* Explanatory Info Card for SynthFont2 Users */}
            <div className="rounded-xl bg-slate-900/40 border border-slate-800/80 p-4 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  <strong>SynthFont2 Note:</strong> In SynthFont2 (v2.9.2.2), connect loopMIDI or your virtual MIDI port as the Input.
                  Bank Select MSB (CC 0) and LSB (CC 32) are sent prior to each Program Change (0-127), and Channel 10 is locked to Bank 128 for percussion.
                </span>
              </div>
              <button
                type="button"
                onClick={() => webMidi.sendGmReset()}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline whitespace-nowrap shrink-0"
              >
                Re-sync All Banks
              </button>
            </div>
          </div>
        )}

        {/* PAGE 2: PARTITIONS & SETLIST */}
        {activeTab === 'scores' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 1. Full-Featured Tactile Score Viewer with 2-Finger Pinch Zoom */}
            {currentSelectedScore ? (
              <ScoreViewer
                score={currentSelectedScore}
                onUpdateScore={handleUpdateScore}
                onNextScore={handleNextScore}
                onPrevScore={handlePrevScore}
                hasNext={currentScoreIndex < activeSetlistScores.length - 1}
                hasPrev={currentScoreIndex > 0}
                nextScore={
                  currentScoreIndex >= 0 && currentScoreIndex < activeSetlistScores.length - 1
                    ? activeSetlistScores[currentScoreIndex + 1]
                    : null
                }
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onStop={handleStop}
                currentTime={currentTime}
                duration={song.duration}
                isLoopActive={isLoopActive}
                loopStart={loopStart}
                loopEnd={loopEnd}
                onToggleLoop={handleToggleLoop}
                onSetLoopPointA={handleSetLoopPointA}
                onSetLoopPointB={handleSetLoopPointB}
              />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
                <FileMusic className="w-10 h-10 mx-auto text-amber-500 mb-2" />
                <p className="font-bold text-slate-200">Sélectionnez ou importez une partition ci-dessous</p>
              </div>
            )}

            {/* 2. Setlist Manager & Mass Import (.chordpro, .pdf, photos) */}
            <SetlistManager
              scores={scores}
              setlists={setlists}
              activeSetlistId={activeSetlistId}
              selectedScoreId={selectedScoreId}
              onSelectScore={handleSelectScore}
              onAddScores={handleAddScores}
              onDeleteScore={handleDeleteScore}
              onSetActiveSetlistId={setActiveSetlistId}
              onCreateSetlist={handleCreateSetlist}
              onToggleScoreInSetlist={handleToggleScoreInSetlist}
            />
          </div>
        )}

        {/* PAGE 3: BANQUES SF2 & INSTRUMENTS */}
        {activeTab === 'soundfonts' && (
          <SoundFontLibraryTab
            channels={channels}
            song={song}
            onUpdateChannel={handleUpdateChannel}
            onBatchUpdateChannels={handleBatchUpdateChannels}
            loadedSf2={loadedSf2}
            onLoadedSf2Change={setLoadedSf2}
            onOpenScarlettModal={() => setIsScarlettModalOpen(true)}
            autoMatchOnImport={autoMatchOnImport}
            onToggleAutoMatch={setAutoMatchOnImport}
          />
        )}
      </main>

      {/* Instrument & Bank Preset Picker Modal */}
      {modalChannelIdx !== null && (
        <InstrumentModal
          channelConfig={channels[modalChannelIdx]}
          isOpen={true}
          onClose={() => setModalChannelIdx(null)}
          onApply={(updated) => {
            handleUpdateChannel(modalChannelIdx, updated);
          }}
          internalAudioEnabled={internalAudioEnabled}
        />
      )}

      {/* Tauri Desktop App & Installation Guide Modal */}
      <TauriInstallModal
        isOpen={isTauriModalOpen}
        onClose={() => setIsTauriModalOpen(false)}
      />

      {/* Focusrite Scarlett Solo 3rd Gen Configuration Modal */}
      <FocusriteScarlettModal
        isOpen={isScarlettModalOpen}
        onClose={() => setIsScarlettModalOpen(false)}
      />
    </div>
  );
}
export default App;
