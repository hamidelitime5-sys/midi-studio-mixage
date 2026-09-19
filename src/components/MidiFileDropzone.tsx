import React, { useRef, useState } from 'react';
import { Upload, FileMusic, Sparkles, CheckCircle2 } from 'lucide-react';
import { parseMidiFile } from '../utils/midiParser';
import { ParsedMidiSong } from '../types/midi';
import { DEMO_SONGS } from '../data/demoSongs';

interface Props {
  onSongLoaded: (song: ParsedMidiSong) => void;
  currentSongTitle: string;
}

export const MidiFileDropzone: React.FC<Props> = ({ onSongLoaded, currentSongTitle }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(mid|kar|midi)$/i)) {
      setError('Please upload a standard MIDI (.mid, .midi) or Karaoke (.kar) file.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const song = parseMidiFile(buffer, file.name);
      onSongLoaded(song);
    } catch (err: any) {
      console.error('Failed to parse MIDI file:', err);
      setError(err?.message || 'Error parsing MIDI file. Check format.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDemoSelect = (factory: () => ParsedMidiSong) => {
    setError(null);
    const song = factory();
    onSongLoaded(song);
  };

  return (
    <div id="midi-dropzone-section" className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 w-full border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all flex items-center justify-center gap-4 ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
              : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".mid,.midi,.kar"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFile(e.target.files[0]);
              }
            }}
          />

          <div className="w-11 h-11 rounded-xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Upload className="w-5 h-5" />
          </div>

          <div className="text-left">
            <p className="text-sm font-semibold text-slate-200">
              {loading ? 'Analyzing MIDI & Karaoke Data...' : 'Drop your .MID or .KAR file here, or browse'}
            </p>
            <p className="text-xs text-slate-400">
              Supports Type 0/1 MIDI, Karaoke lyrics tracks, SysEx, and custom SF2 SoundFont mappings
            </p>
          </div>
        </div>

        {/* Preloaded Demo Songs */}
        <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0 w-full md:w-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Try Demos:</span>
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {DEMO_SONGS.map((demo) => {
              const isActive = currentSongTitle.includes(demo.name.split('(')[0].trim());
              return (
                <button
                  key={demo.id}
                  type="button"
                  id={`load-demo-${demo.id}-btn`}
                  onClick={() => handleDemoSelect(demo.factory)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    isActive
                      ? 'bg-indigo-950/80 text-indigo-300 border-indigo-600 shadow-md shadow-indigo-600/20'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  <FileMusic className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{demo.name}</span>
                  {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 text-xs text-rose-400 bg-rose-950/50 border border-rose-900/50 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};
