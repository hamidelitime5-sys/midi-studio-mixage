import React, { useRef } from 'react';
import { Camera, Upload, Sparkles } from 'lucide-react';
import { BAND_CHANNELS_TEMPLATE } from '../data/bandTemplate';

interface Props {
  channelIndex: number;
  iconKey?: string;
  customImageUrl?: string;
  onCustomImageUpload?: (url: string) => void;
  accentColor?: string;
  glowColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const InstrumentArtBadge: React.FC<Props> = ({
  channelIndex,
  iconKey,
  customImageUrl,
  onCustomImageUpload,
  size = 'md',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tpl = BAND_CHANNELS_TEMPLATE[channelIndex] || BAND_CHANNELS_TEMPLATE[0];
  const key = iconKey || tpl.iconKey;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onCustomImageUpload) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onCustomImageUpload(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // If user uploaded a custom photo/drawing
  if (customImageUrl) {
    return (
      <div
        className="relative group cursor-pointer overflow-hidden rounded-lg border-2 shadow-md flex items-center justify-center bg-slate-900"
        style={{
          width: size === 'sm' ? '40px' : '52px',
          height: size === 'sm' ? '36px' : '46px',
          borderColor: tpl.accentColor,
          boxShadow: `0 2px 8px ${tpl.glowColor}`,
        }}
        onClick={() => fileInputRef.current?.click()}
        title="Cliquez pour changer la photo/dessin de cette piste"
      >
        <img
          src={customImageUrl}
          alt={tpl.roleTitle}
          className="w-full h-full object-cover rounded-md"
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Camera className="w-4 h-4 text-white" />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  // Colorful Vector Artwork Drawings (Rich SVG Illustrations)
  const renderInstrumentIllustration = () => {
    switch (key) {
      case 'piano':
        // Grand Piano & Keyboard with gold trim & ivory keys
        return (
          <svg viewBox="0 0 48 40" className="w-full h-full drop-shadow-sm">
            <defs>
              <linearGradient id="pianoBody" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="60%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>
              <linearGradient id="pianoGold" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            {/* Piano curved body */}
            <path
              d="M6 30 C6 18 10 8 24 8 C36 8 42 16 42 22 L42 30 Z"
              fill="url(#pianoBody)"
              stroke="#475569"
              strokeWidth="1"
            />
            {/* Gold rim hinge */}
            <path d="M12 12 C20 10 32 12 38 18" stroke="url(#pianoGold)" strokeWidth="1.5" fill="none" />
            {/* Keyboard bed */}
            <rect x="6" y="28" width="36" height="8" rx="1.5" fill="#f8fafc" stroke="#334155" strokeWidth="0.8" />
            {/* Black keys */}
            <rect x="10" y="28" width="2.5" height="5" fill="#0f172a" rx="0.5" />
            <rect x="15" y="28" width="2.5" height="5" fill="#0f172a" rx="0.5" />
            <rect x="23" y="28" width="2.5" height="5" fill="#0f172a" rx="0.5" />
            <rect x="28" y="28" width="2.5" height="5" fill="#0f172a" rx="0.5" />
            <rect x="33" y="28" width="2.5" height="5" fill="#0f172a" rx="0.5" />
          </svg>
        );

      case 'bass':
        // Electric Bass & Double Bass (Deep blue & varnished wood)
        return (
          <svg viewBox="0 0 48 40" className="w-full h-full drop-shadow-sm">
            <defs>
              <linearGradient id="bassGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="70%" stopColor="#1e3a8a" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="woodNeck" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#92400e" />
              </linearGradient>
            </defs>
            {/* Long bass neck */}
            <rect x="22" y="3" width="4" height="24" fill="url(#woodNeck)" rx="1" />
            {/* Headstock & tuning pegs */}
            <rect x="20" y="2" width="8" height="5" rx="1" fill="#1e293b" />
            <circle cx="19" cy="3.5" r="1.5" fill="#94a3b8" />
            <circle cx="29" cy="3.5" r="1.5" fill="#94a3b8" />
            <circle cx="19" cy="6" r="1.5" fill="#94a3b8" />
            <circle cx="29" cy="6" r="1.5" fill="#94a3b8" />
            {/* Double cutaway bass body */}
            <path
              d="M13 22 C13 17 19 18 20 23 C21 23 27 23 28 23 C29 18 35 17 35 22 C37 28 36 37 24 38 C12 37 11 28 13 22 Z"
              fill="url(#bassGradient)"
              stroke="#60a5fa"
              strokeWidth="1"
            />
            {/* Pickups */}
            <rect x="21" y="26" width="6" height="2" fill="#0f172a" stroke="#94a3b8" strokeWidth="0.5" />
            <rect x="21" y="30" width="6" height="2" fill="#0f172a" stroke="#94a3b8" strokeWidth="0.5" />
            {/* 4 Bass strings */}
            <line x1="22.8" y1="3" x2="22.8" y2="35" stroke="#e2e8f0" strokeWidth="0.6" />
            <line x1="23.6" y1="3" x2="23.6" y2="35" stroke="#e2e8f0" strokeWidth="0.6" />
            <line x1="24.4" y1="3" x2="24.4" y2="35" stroke="#e2e8f0" strokeWidth="0.6" />
            <line x1="25.2" y1="3" x2="25.2" y2="35" stroke="#e2e8f0" strokeWidth="0.6" />
          </svg>
        );

      case 'brass_solo':
        // Brilliant Gold Trumpet & Saxophone Bell
        return (
          <svg viewBox="0 0 48 40" className="w-full h-full drop-shadow-sm">
            <defs>
              <linearGradient id="goldBrass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="35%" stopColor="#eab308" />
                <stop offset="85%" stopColor="#ca8a04" />
                <stop offset="100%" stopColor="#854d0e" />
              </linearGradient>
            </defs>
            {/* Main trumpet tube loop */}
            <path
              d="M7 23 L26 23 C30 23 32 20 32 18 C32 14 26 14 22 14 L12 14 C9 14 7 16 7 19 Z"
              fill="none"
              stroke="url(#goldBrass)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* Trumpet flared bell */}
            <path
              d="M26 23 C33 23 37 20 42 16 L42 30 C37 26 33 23 26 23 Z"
              fill="url(#goldBrass)"
              stroke="#b45309"
              strokeWidth="0.8"
            />
            {/* Mouthpiece */}
            <rect x="5" y="21.5" width="3" height="3" rx="0.5" fill="#fde047" />
            {/* 3 Valves */}
            <rect x="18" y="9" width="2" height="7" fill="url(#goldBrass)" stroke="#78350f" strokeWidth="0.5" rx="0.5" />
            <rect x="22" y="9" width="2" height="7" fill="url(#goldBrass)" stroke="#78350f" strokeWidth="0.5" rx="0.5" />
            <rect x="26" y="9" width="2" height="7" fill="url(#goldBrass)" stroke="#78350f" strokeWidth="0.5" rx="0.5" />
          </svg>
        );

      case 'brass_ensemble':
        // Brass Ensemble Section (Crimson & Gold Fanfare)
        return (
          <svg viewBox="0 0 48 40" className="w-full h-full drop-shadow-sm">
            <defs>
              <linearGradient id="brassSectionGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
            </defs>
            {/* Left French Horn loop */}
            <circle cx="16" cy="22" r="10" fill="none" stroke="url(#brassSectionGrad)" strokeWidth="2.5" />
            <path d="M16 12 C18 6 25 5 28 8" stroke="url(#brassSectionGrad)" strokeWidth="2.5" fill="none" />
            {/* Right Horn Bell */}
            <path d="M26 18 C32 18 36 12 43 7 L43 28 C36 24 32 21 26 21 Z" fill="url(#brassSectionGrad)" />
            {/* Fanfare badge */}
            <circle cx="16" cy="22" r="5" fill="#7f1d1d" stroke="#fef08a" strokeWidth="1" />
            <polygon points="16,19 17.5,23.5 13.5,20.5 18.5,20.5 14.5,23.5" fill="#fde047" />
          </svg>
        );

      case 'flute':
        // Silver Concert Transverse Flute (Emerald & Silver chrome)
        return (
          <svg viewBox="0 0 48 40" className="w-full h-full drop-shadow-sm">
            <defs>
              <linearGradient id="silverTube" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#cbd5e1" />
                <stop offset="80%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>
            </defs>
            {/* Flute tube angled diagonally */}
            <line x1="6" y1="32" x2="42" y2="10" stroke="url(#silverTube)" strokeWidth="4.5" strokeLinecap="round" />
            {/* Headjoint & Lip plate */}
            <rect x="9" y="27" width="5" height="4" rx="1" fill="#f8fafc" stroke="#475569" strokeWidth="0.6" transform="rotate(-30 11 29)" />
            <ellipse cx="11" cy="29" rx="1.5" ry="1" fill="#0f172a" transform="rotate(-30 11 29)" />
            {/* Key cups along body */}
            <circle cx="21" cy="23" r="1.8" fill="#10b981" stroke="#f8fafc" strokeWidth="0.8" />
            <circle cx="26" cy="20" r="1.8" fill="#10b981" stroke="#f8fafc" strokeWidth="0.8" />
            <circle cx="31" cy="17" r="1.8" fill="#10b981" stroke="#f8fafc" strokeWidth="0.8" />
            <circle cx="36" cy="14" r="1.8" fill="#10b981" stroke="#f8fafc" strokeWidth="0.8" />
          </svg>
        );

      case 'accordion':
        // Pearloid Musette Accordion with Red Bellows & White Keys
        return (
          <svg viewBox="0 0 48 40" className="w-full h-full drop-shadow-sm">
            <defs>
              <linearGradient id="accBellows" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0891b2" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
            </defs>
            {/* Left Bass Cabinet */}
            <rect x="7" y="10" width="7" height="22" rx="2" fill="#e11d48" stroke="#f8fafc" strokeWidth="0.8" />
            {/* Bass buttons */}
            <circle cx="10" cy="15" r="1" fill="#f8fafc" />
            <circle cx="10" cy="19" r="1" fill="#f8fafc" />
            <circle cx="10" cy="23" r="1" fill="#f8fafc" />
            <circle cx="10" cy="27" r="1" fill="#f8fafc" />

            {/* Folding Bellows in Middle */}
            <path
              d="M14 11 L18 8 L22 11 L26 8 L30 11 L34 8 L34 31 L30 34 L26 31 L22 34 L18 31 L14 34 Z"
              fill="url(#accBellows)"
              stroke="#0e7490"
              strokeWidth="0.8"
            />
            {/* Bellows folds lines */}
            <line x1="18" y1="8" x2="18" y2="31" stroke="#cffafe" strokeWidth="0.8" />
            <line x1="22" y1="11" x2="22" y2="34" stroke="#0891b2" strokeWidth="0.8" />
            <line x1="26" y1="8" x2="26" y2="31" stroke="#cffafe" strokeWidth="0.8" />
            <line x1="30" y1="11" x2="30" y2="34" stroke="#0891b2" strokeWidth="0.8" />

            {/* Right Treble Cabinet with Piano Keys */}
            <rect x="34" y="10" width="7" height="22" rx="2" fill="#e11d48" stroke="#f8fafc" strokeWidth="0.8" />
            <rect x="39" y="12" width="2" height="18" fill="#ffffff" />
            <line x1="39" y1="15" x2="41" y2="15" stroke="#000" strokeWidth="0.5" />
            <line x1="39" y1="18" x2="41" y2="18" stroke="#000" strokeWidth="0.5" />
            <line x1="39" y1="21" x2="41" y2="21" stroke="#000" strokeWidth="0.5" />
            <line x1="39" y1="24" x2="41" y2="24" stroke="#000" strokeWidth="0.5" />
            <line x1="39" y1="27" x2="41" y2="27" stroke="#000" strokeWidth="0.5" />
          </svg>
        );

      case 'guitar':
        // Warm Sunburst Dreadnought Acoustic & Electric Guitar
        return (
          <svg viewBox="0 0 48 40" className="w-full h-full drop-shadow-sm">
            <defs>
              <radialGradient id="sunburstGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="55%" stopColor="#f97316" />
                <stop offset="90%" stopColor="#7c2d12" />
                <stop offset="100%" stopColor="#270e06" />
              </radialGradient>
            </defs>
            {/* Guitar neck */}
            <rect x="22" y="3" width="4" height="20" fill="#92400e" rx="1" />
            {/* Headstock */}
            <path d="M21 2 L27 2 L26 6 L22 6 Z" fill="#451a03" />
            {/* Figure-8 Guitar Body */}
            <path
              d="M17 17 C13 18 13 22 17 24 C12 28 12 36 24 37 C36 36 36 28 31 24 C35 22 35 18 31 17 C26 16 22 16 17 17 Z"
              fill="url(#sunburstGrad)"
              stroke="#fbbf24"
              strokeWidth="0.8"
            />
            {/* Soundhole with Rosette */}
            <circle cx="24" cy="22" r="3.5" fill="#0f172a" stroke="#fef08a" strokeWidth="0.8" />
            {/* Bridge */}
            <rect x="20" y="30" width="8" height="2" rx="0.5" fill="#451a03" />
          </svg>
        );

      case 'oud':
        // Traditional Arabian Luth (Oud) with Pear-shaped body & Ornate Rosette
        return (
          <svg viewBox="0 0 48 40" className="w-full h-full drop-shadow-sm">
            <defs>
              <radialGradient id="oudWood" cx="45%" cy="55%" r="55%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="60%" stopColor="#d97706" />
                <stop offset="95%" stopColor="#78350f" />
                <stop offset="100%" stopColor="#451a03" />
              </radialGradient>
              <linearGradient id="oudRose" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#ca8a04" />
              </linearGradient>
            </defs>
            {/* Angled Pegbox characteristic of Oud */}
            <path d="M21 3 L27 3 L25 8 L21 8 Z" fill="#451a03" />
            <circle cx="20" cy="4" r="1" fill="#fde047" />
            <circle cx="28" cy="4" r="1" fill="#fde047" />
            <circle cx="20" cy="7" r="1" fill="#fde047" />
            <circle cx="28" cy="7" r="1" fill="#fde047" />
            {/* Short fretless neck */}
            <rect x="22" y="8" width="4" height="7" fill="#78350f" />
            {/* Large pear-shaped bowl body */}
            <path
              d="M24 14 C14 16 11 25 12 31 C13 36 18 38 24 38 C30 38 35 36 36 31 C37 25 34 16 24 14 Z"
              fill="url(#oudWood)"
              stroke="#fbbf24"
              strokeWidth="0.8"
            />
            {/* Main Central Inlaid Rosette */}
            <circle cx="24" cy="24" r="4.2" fill="#0f172a" stroke="url(#oudRose)" strokeWidth="1" />
            <circle cx="24" cy="24" r="1.5" fill="#fde047" />
            {/* 2 Small side soundholes */}
            <circle cx="18" cy="19" r="1.8" fill="#0f172a" stroke="#fde047" strokeWidth="0.5" />
            <circle cx="30" cy="19" r="1.8" fill="#0f172a" stroke="#fde047" strokeWidth="0.5" />
            {/* Floating bridge */}
            <rect x="18" y="32" width="12" height="1.8" rx="0.5" fill="#311302" />
          </svg>
        );

      case 'atmosphere':
        // Celestial Nebula & Ambient Synth Waves
        return (
          <svg viewBox="0 0 48 40" className="w-full h-full drop-shadow-sm">
            <defs>
              <linearGradient id="nebulaGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="50%" stopColor="#9333ea" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            {/* Glowing cosmic cloud */}
            <ellipse cx="24" cy="20" rx="18" ry="12" fill="url(#nebulaGrad)" opacity="0.85" filter="drop-shadow(0 0 4px #a855f7)" />
            {/* Waveform harmonic rings */}
            <path d="M7 20 Q15 11 24 20 T41 20" stroke="#fde047" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M8 22 Q16 29 24 22 T40 22" stroke="#38bdf8" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.9" />
            {/* Stars spark */}
            <circle cx="16" cy="13" r="1.2" fill="#ffffff" />
            <circle cx="33" cy="12" r="1.5" fill="#ffffff" />
            <circle cx="28" cy="28" r="1" fill="#ffffff" />
          </svg>
        );

      case 'drums':
        // Acoustic Drum Kit (Kick, Snare, Toms, Gold Cymbals)
        return (
          <svg viewBox="0 0 48 40" className="w-full h-full drop-shadow-sm">
            <defs>
              <linearGradient id="cymbalGold" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#ca8a04" />
              </linearGradient>
            </defs>
            {/* Left Hi-Hat & Right Crash Cymbal */}
            <ellipse cx="12" cy="11" rx="8" ry="2.2" fill="url(#cymbalGold)" stroke="#a16207" strokeWidth="0.8" />
            <line x1="12" y1="11" x2="12" y2="28" stroke="#94a3b8" strokeWidth="1.5" />
            <ellipse cx="36" cy="9" rx="9" ry="2.5" fill="url(#cymbalGold)" stroke="#a16207" strokeWidth="0.8" />
            <line x1="36" y1="9" x2="36" y2="28" stroke="#94a3b8" strokeWidth="1.5" />

            {/* Big Center Bass Drum */}
            <circle cx="24" cy="26" r="11" fill="#0f172a" stroke="#e2e8f0" strokeWidth="2" />
            <circle cx="24" cy="26" r="8" fill="#1e293b" />
            <circle cx="24" cy="26" r="3" fill="#eab308" />

            {/* Snare Drum on Left */}
            <rect x="7" y="21" width="10" height="7" rx="1" fill="#ef4444" stroke="#e2e8f0" strokeWidth="1" />
            {/* Tom on Right */}
            <rect x="30" y="19" width="10" height="7" rx="1" fill="#3b82f6" stroke="#e2e8f0" strokeWidth="1" />
          </svg>
        );

      case 'percussion':
        // Latin Congas & Bongos Pair with Natural Wood & Skin Head
        return (
          <svg viewBox="0 0 48 40" className="w-full h-full drop-shadow-sm">
            <defs>
              <linearGradient id="congaWood" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#92400e" />
                <stop offset="50%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>
            </defs>
            {/* Left Quinto Conga */}
            <ellipse cx="17" cy="12" rx="7" ry="2.5" fill="#fef3c7" stroke="#78350f" strokeWidth="1" />
            <path d="M10 12 C10 18 11 31 14 36 L20 36 C23 31 24 18 24 12 Z" fill="url(#congaWood)" stroke="#78350f" strokeWidth="0.8" />
            <line x1="10" y1="16" x2="24" y2="16" stroke="#fbbf24" strokeWidth="1" />
            <line x1="12" y1="26" x2="22" y2="26" stroke="#fbbf24" strokeWidth="1" />

            {/* Right Tumba Conga */}
            <ellipse cx="31" cy="11" rx="8" ry="2.8" fill="#fef3c7" stroke="#78350f" strokeWidth="1" />
            <path d="M23 11 C23 18 24 32 27 37 L35 37 C38 32 39 18 39 11 Z" fill="url(#congaWood)" stroke="#78350f" strokeWidth="0.8" />
            <line x1="23" y1="15" x2="39" y2="15" stroke="#fbbf24" strokeWidth="1" />
            <line x1="25" y1="26" x2="37" y2="26" stroke="#fbbf24" strokeWidth="1" />
          </svg>
        );

      case 'darbouka':
        // Egyptian Aluminum Engraved Darbouka / Doumbek & Riq
        return (
          <svg viewBox="0 0 48 40" className="w-full h-full drop-shadow-sm">
            <defs>
              <linearGradient id="darboukaMetal" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="35%" stopColor="#94a3b8" />
                <stop offset="65%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
              <radialGradient id="darboukaHead" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="85%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#64748b" />
              </radialGradient>
            </defs>
            {/* Flared top rim head */}
            <ellipse cx="24" cy="9" rx="12" ry="4" fill="url(#darboukaHead)" stroke="#d97706" strokeWidth="1.2" />
            <ellipse cx="24" cy="9" rx="8" ry="2.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.5" />
            {/* Goblet curved body */}
            <path
              d="M12 9 C13 16 19 22 20 28 L20 35 L17 38 L31 38 L28 35 L28 28 C29 22 35 16 36 9 Z"
              fill="url(#darboukaMetal)"
              stroke="#b45309"
              strokeWidth="0.8"
            />
            {/* Inlaid mother-of-pearl rings */}
            <ellipse cx="24" cy="14" rx="9" ry="2.5" fill="none" stroke="#fef08a" strokeWidth="1" />
            <ellipse cx="24" cy="18" rx="6.5" ry="1.8" fill="none" stroke="#fef08a" strokeWidth="1" />
            <rect x="21" y="27" width="6" height="4" rx="0.5" fill="#d97706" />
          </svg>
        );

      case 'vocal_lead':
        // Studio Vocal Condenser Microphone & Sound Waves
        return (
          <svg viewBox="0 0 48 40" className="w-full h-full drop-shadow-sm">
            <defs>
              <linearGradient id="micGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#6b21a8" />
              </linearGradient>
            </defs>
            {/* Mic capsule grille */}
            <rect x="18" y="7" width="12" height="14" rx="6" fill="#f8fafc" stroke="#581c87" strokeWidth="1" />
            <line x1="18" y1="12" x2="30" y2="12" stroke="#94a3b8" strokeWidth="0.8" />
            <line x1="18" y1="16" x2="30" y2="16" stroke="#94a3b8" strokeWidth="0.8" />
            {/* Mic body */}
            <rect x="20" y="21" width="8" height="11" rx="1.5" fill="url(#micGrad)" stroke="#4c1d95" strokeWidth="1" />
            {/* Mic stand yoke */}
            <path d="M14 17 C14 27 34 27 34 17" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            <line x1="24" y1="27" x2="24" y2="36" stroke="#94a3b8" strokeWidth="2" />
          </svg>
        );

      case 'choir':
        // Choral Voices & Polyphonic Harmony
        return (
          <svg viewBox="0 0 48 40" className="w-full h-full drop-shadow-sm">
            <circle cx="24" cy="14" r="5" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
            <path d="M16 28 C16 22 32 22 32 28 Z" fill="#38bdf8" />
            <circle cx="13" cy="16" r="4" fill="#818cf8" stroke="#4338ca" strokeWidth="1" />
            <path d="M7 29 C7 24 19 24 19 29 Z" fill="#818cf8" />
            <circle cx="35" cy="16" r="4" fill="#818cf8" stroke="#4338ca" strokeWidth="1" />
            <path d="M29 29 C29 24 41 24 41 29 Z" fill="#818cf8" />
          </svg>
        );

      case 'fx':
        // Sound FX Waves & Lightning Synth Spark
        return (
          <svg viewBox="0 0 48 40" className="w-full h-full drop-shadow-sm">
            <polygon points="26,4 15,22 23,22 21,36 33,18 25,18" fill="#fb923c" stroke="#ea580c" strokeWidth="1.2" />
            <circle cx="10" cy="10" r="2" fill="#fed7aa" />
            <circle cx="38" cy="28" r="2.5" fill="#fed7aa" />
          </svg>
        );

      case 'click':
      default:
        // Metronome / Click Guide
        return (
          <svg viewBox="0 0 48 40" className="w-full h-full drop-shadow-sm">
            <polygon points="24,6 14,35 34,35" fill="#334155" stroke="#94a3b8" strokeWidth="1.2" />
            {/* Face cutout */}
            <polygon points="24,12 18,33 30,33" fill="#f8fafc" />
            {/* Metronome pendulum needle */}
            <line x1="24" y1="32" x2="31" y2="10" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
            {/* Sliding weight */}
            <rect x="27" y="16" width="4" height="4" rx="1" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
          </svg>
        );
    }
  };

  return (
    <div
      className="relative group cursor-pointer overflow-hidden rounded-lg border-2 shadow-md flex items-center justify-center p-1 bg-gradient-to-b from-slate-900 to-slate-950 transition-all hover:scale-105 active:scale-95"
      style={{
        width: size === 'sm' ? '42px' : '52px',
        height: size === 'sm' ? '36px' : '46px',
        borderColor: tpl.accentColor,
        boxShadow: `0 2px 8px ${tpl.glowColor}`,
      }}
      onClick={() => fileInputRef.current?.click()}
      title={`${tpl.roleTitle} (${tpl.instrumentDefault}) - Cliquez pour personnaliser ou ajouter votre photo`}
    >
      {renderInstrumentIllustration()}

      {/* Hover upload badge icon */}
      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
        <Camera className="w-3.5 h-3.5 text-white" />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};
