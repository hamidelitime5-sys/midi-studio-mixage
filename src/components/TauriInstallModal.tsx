import React, { useState } from 'react';
import {
  Laptop,
  Download,
  Terminal,
  CheckCircle2,
  Copy,
  ExternalLink,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  X,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TauriInstallModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(id);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col custom-console-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-amber-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-amber-400">
                <Laptop className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Installer sur votre PC (Tauri & PWA)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Tauri v2 Configuré
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Exécutez cette application nativement sur votre écran tactile Windows / PC
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 text-sm">
          {/* Method 1: Instant Install (PWA Desktop App) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-slate-800/40 to-slate-900 border border-amber-500/30 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h4 className="font-bold text-slate-100 text-sm sm:text-base">
                Méthode Immédiate : Installer l'application en 1 clic
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Vous pouvez installer l'application immédiatement comme un vrai logiciel Windows sans aucune ligne de code ni compilation :
            </p>
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2">
              <p className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <span>Dans <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>, regardez à droite de la barre d'adresse.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <span>Cliquez sur l'icône <strong>"Installer MIDI Studio & Partitions"</strong> (ou dans le menu Chrome : <em>Enregistrer et partager → Installer</em>).</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                <span>L'application s'ouvre dans sa propre fenêtre Windows indépendante, avec icône sur le bureau et prise en charge tactile intégrale.</span>
              </p>
            </div>
          </div>

          {/* Method 2: Tauri Native Windows Executable (.exe / .msi) */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <div>
                <h4 className="font-bold text-slate-100 text-sm sm:text-base">
                  Méthode Tauri v2 : Compiler l'exécutable Windows (.exe / .msi)
                </h4>
                <p className="text-xs text-slate-400">
                  Tous les fichiers de configuration Tauri (`src-tauri/Cargo.toml`, `tauri.conf.json`, `main.rs`) sont déjà inclus dans le projet !
                </p>
              </div>
            </div>

            {/* Step by step */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-300">
                  1. Téléchargez le projet ZIP ou exportez vers GitHub
                </p>
                <p className="text-[11px] text-slate-400">
                  Utilisez le menu de partage ou d'export de votre environnement pour récupérer l'archive du projet.
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-300">
                  2. Prérequis sur votre PC Windows
                </p>
                <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-1 pl-1">
                  <li><strong>Node.js</strong> (version 20 ou supérieure) : <a href="https://nodejs.org" target="_blank" rel="noreferrer" className="text-indigo-400 underline">nodejs.org</a></li>
                  <li><strong>Rust</strong> : installez Rust via <a href="https://rustup.rs" target="_blank" rel="noreferrer" className="text-indigo-400 underline">rustup.rs</a> (rapide et automatique).</li>
                  <li>Les outils C++ Microsoft Build Tools (proposés automatiquement par l'installateur Rust).</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-300">
                    3. Compilez l'installeur Windows en une commande
                  </p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('npm install && npm run tauri:build', 'cmd1')}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
                  >
                    {copiedStep === 'cmd1' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedStep === 'cmd1' ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs text-amber-300 select-all space-y-1">
                  <div className="text-slate-500"># 1. Installer les dépendances</div>
                  <div>npm install --legacy-peer-deps</div>
                  <div className="text-slate-500 mt-2"># 2. Compiler le nouveau frontend (Console MG-16XU & Partitions)</div>
                  <div>npm run build</div>
                  <div className="text-slate-500 mt-2"># 3. Générer l'exécutable Windows (.exe)</div>
                  <div>npx @tauri-apps/cli build</div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Important : <code>npm run build</code> compile l'interface moderne (console MG-16XU, partitions et setlists) dans le dossier <code>dist</code> que Tauri va empaqueter.
                </p>
              </div>

              {/* Troubleshooting Note for icon.ico */}
              <div className="p-3 rounded-lg bg-sky-950/30 border border-sky-800/40 text-xs text-sky-300/90 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-sky-200">
                  <span>Résolution erreur <code>icons/icon.ico not found</code> :</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('npx @tauri-apps/cli icon app-icon.svg', 'ps-icon')}
                    className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono"
                  >
                    {copiedStep === 'ps-icon' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedStep === 'ps-icon' ? 'Copié !' : 'Copier fix Icône'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Si Tauri demande le fichier d'icône Windows <code>icon.ico</code>, exécutez simplement :
                </p>
                <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[11px] text-emerald-300 select-all">
                  npx @tauri-apps/cli icon app-icon.svg
                </div>
              </div>

              {/* Troubleshooting Note for OUT_DIR / build.rs */}
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300/90 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-amber-200">
                  <span>Résolution erreur <code>OUT_DIR / build script</code> :</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('Set-Content -Path "src-tauri\\build.rs" -Value "fn main() { tauri_build::build() }"', 'ps-fix')}
                    className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono"
                  >
                    {copiedStep === 'ps-fix' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedStep === 'ps-fix' ? 'Copié !' : 'Copier fix PowerShell'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Si vous avez le message <em>"error: OUT_DIR env var is not set, do you have a build script?"</em>, exécutez simplement cette commande dans votre terminal PowerShell pour créer <code>src-tauri\build.rs</code> :
                </p>
                <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[11px] text-emerald-300 select-all">
                  Set-Content -Path "src-tauri\build.rs" -Value "fn main() &#123; tauri_build::build() &#125;"
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  L'installeur Windows autonome sera généré dans <code>src-tauri/target/release/bundle/msi/</code> prêt à être installé sur votre PC tactile !
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
