import React, { useState, useRef } from 'react';
import {
  FolderPlus,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileImage,
  Search,
  Trash2,
  Plus,
  Music,
  CheckCircle2,
  FolderOpen,
  ListOrdered,
  Layers,
  Sparkles,
  Play,
} from 'lucide-react';
import { ScoreItem, Setlist, ScoreType } from '../types/score';
import { parseChordPro } from '../utils/chordProParser';

interface Props {
  scores: ScoreItem[];
  setlists: Setlist[];
  activeSetlistId: string;
  selectedScoreId: string | null;
  onSelectScore: (score: ScoreItem) => void;
  onAddScores: (newScores: ScoreItem[]) => void;
  onDeleteScore: (scoreId: string) => void;
  onSetActiveSetlistId: (setlistId: string) => void;
  onCreateSetlist: (name: string) => void;
  onToggleScoreInSetlist: (setlistId: string, scoreId: string) => void;
}

export const SetlistManager: React.FC<Props> = ({
  scores,
  setlists,
  activeSetlistId,
  selectedScoreId,
  onSelectScore,
  onAddScores,
  onDeleteScore,
  onSetActiveSetlistId,
  onCreateSetlist,
  onToggleScoreInSetlist,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all'); // 'all' | 'chordpro' | 'pdf' | 'image'
  const [isDragging, setIsDragging] = useState(false);
  const [newSetlistName, setNewSetlistName] = useState('');
  const [showNewSetlistInput, setShowNewSetlistInput] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active setlist object
  const activeSetlist = setlists.find((s) => s.id === activeSetlistId) || null;

  // Filter scores
  const displayedScores = scores.filter((score) => {
    // Check setlist membership if not "all"
    if (activeSetlistId !== 'all-scores') {
      if (!activeSetlist?.scoreIds.includes(score.id)) {
        return false;
      }
    }

    // Type filter
    if (filterType !== 'all' && score.type !== filterType) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = score.title.toLowerCase().includes(q);
      const matchArtist = score.artist?.toLowerCase().includes(q);
      const matchTags = score.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchArtist && !matchTags) return false;
    }

    return true;
  });

  // Handle mass file processing
  const processFiles = async (fileList: FileList) => {
    setIsImporting(true);
    const newItems: ScoreItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      let type: ScoreType = 'chordpro';
      if (ext === 'pdf') {
        type = 'pdf';
      } else if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) {
        type = 'image';
      } else {
        type = 'chordpro';
      }

      try {
        if (type === 'chordpro') {
          const text = await readFileAsText(file);
          const parsed = parseChordPro(text);
          const cleanTitle =
            parsed.title !== 'Untitled Score'
              ? parsed.title
              : file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

          newItems.push({
            id: `score-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title: cleanTitle,
            artist: parsed.artist || '',
            type: 'chordpro',
            content: text,
            fileName: file.name,
            fileSize: file.size,
            originalKey: parsed.key || undefined,
            bpm: parsed.tempo || undefined,
            dateAdded: Date.now(),
            tags: ['Importé'],
          });
        } else {
          // PDF or Image
          const dataUrl = await readFileAsDataUrl(file);
          const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

          newItems.push({
            id: `score-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title: cleanTitle,
            type,
            content: dataUrl,
            fileName: file.name,
            fileSize: file.size,
            dateAdded: Date.now(),
            tags: [type === 'pdf' ? 'PDF' : 'Photo'],
          });
        }
      } catch (err) {
        console.error(`Error reading ${file.name}:`, err);
      }
    }

    if (newItems.length > 0) {
      onAddScores(newItems);
      // Auto select first uploaded item
      onSelectScore(newItems[0]);
    }
    setIsImporting(false);
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleCreateNewSetlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetlistName.trim()) return;
    onCreateSetlist(newSetlistName.trim());
    setNewSetlistName('');
    setShowNewSetlistInput(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5 shadow-xl">
      {/* Setlist Tabs & Creation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSetActiveSetlistId('all-scores')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSetlistId === 'all-scores'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tous les Morceaux ({scores.length})</span>
          </button>

          {setlists.map((set) => {
            const isActive = activeSetlistId === set.id;
            return (
              <button
                key={set.id}
                type="button"
                onClick={() => onSetActiveSetlistId(set.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{set.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                  {set.scoreIds.length}
                </span>
              </button>
            );
          })}

          {!showNewSetlistInput ? (
            <button
              type="button"
              onClick={() => setShowNewSetlistInput(true)}
              className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-dashed border-slate-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Set</span>
            </button>
          ) : (
            <form onSubmit={handleCreateNewSetlist} className="flex items-center gap-1">
              <input
                type="text"
                value={newSetlistName}
                onChange={(e) => setNewSetlistName(e.target.value)}
                placeholder="Nom du set (ex: Concert)..."
                autoFocus
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-indigo-500/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => setShowNewSetlistInput(false)}
                className="px-2 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs hover:bg-slate-700"
              >
                ✕
              </button>
            </form>
          )}
        </div>

        {/* Mass Import Button */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".chordpro,.cho,.pro,.chopro,.txt,.pdf,image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                processFiles(e.target.files);
              }
            }}
          />

          <button
            type="button"
            id="mass-import-scores-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{isImporting ? 'Importation...' : 'Import en Masse (ChordPro / PDF / Photos)'}</span>
          </button>
        </div>
      </div>

      {/* Drag and Drop Zone for mass import */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
            : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-amber-400">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs sm:text-sm font-bold text-slate-200">
              Glissez-déposez vos partitions en masse ou cliquez pour parcourir
            </p>
            <p className="text-[11px] text-slate-400">
              Formats acceptés : <strong>.chordpro</strong>, <strong>.cho</strong>, <strong>.txt</strong>, documents <strong>PDF</strong> et <strong>photos / images</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un morceau, artiste, tonalité..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500/60 transition-colors"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filterType === 'all' ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tous ({scores.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('chordpro')}
            className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors ${
              filterType === 'chordpro'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3 h-3 text-amber-400" />
            <span>ChordPro</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('pdf')}
            className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors ${
              filterType === 'pdf'
                ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3 h-3 text-rose-400" />
            <span>PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('image')}
            className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors ${
              filterType === 'image'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileImage className="w-3 h-3 text-emerald-400" />
            <span>Photos</span>
          </button>
        </div>
      </div>

      {/* Scores Grid / Cards List */}
      {displayedScores.length === 0 ? (
        <div className="text-center py-12 text-slate-500 space-y-2">
          <Music className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-sm font-semibold text-slate-400">Aucune partition trouvée</p>
          <p className="text-xs">Importez vos fichiers ChordPro, PDF ou photos ci-dessus.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedScores.map((item) => {
            const isSelected = selectedScoreId === item.id;
            const inActiveSet = activeSetlist?.scoreIds.includes(item.id);

            return (
              <div
                key={item.id}
                onClick={() => onSelectScore(item)}
                className={`relative group p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                  isSelected
                    ? 'bg-gradient-to-br from-indigo-950/60 to-slate-900 border-indigo-500 shadow-lg shadow-indigo-950/50 scale-[1.01]'
                    : 'bg-slate-950/70 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          item.type === 'chordpro'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : item.type === 'pdf'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {item.type === 'chordpro' && <FileText className="w-3.5 h-3.5" />}
                        {item.type === 'pdf' && <FileSpreadsheet className="w-3.5 h-3.5" />}
                        {item.type === 'image' && <FileImage className="w-3.5 h-3.5" />}
                      </div>

                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-amber-300 transition-colors truncate max-w-[170px] sm:max-w-[200px]">
                          {item.title}
                        </h4>
                        {item.artist && (
                          <p className="text-[11px] text-slate-400 truncate max-w-[170px]">
                            {item.artist}
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono uppercase font-bold ${
                        item.type === 'chordpro'
                          ? 'bg-amber-500/10 text-amber-400'
                          : item.type === 'pdf'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {item.type}
                    </span>
                  </div>

                  {/* Metadata tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {item.originalKey && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300">
                        {item.originalKey}
                      </span>
                    )}
                    {item.bpm && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-400">
                        {item.bpm} BPM
                      </span>
                    )}
                    {item.tags?.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800/70 text-slate-400"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card footer actions */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-1">
                    {activeSetlist && activeSetlistId !== 'all-scores' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleScoreInSetlist(activeSetlistId, item.id);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 transition-colors ${
                          inActiveSet
                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                        title="Ajouter / Retirer de ce set"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{inActiveSet ? 'Dans le set' : 'Ajouter au set'}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteScore(item.id);
                      }}
                      className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Supprimer la partition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
