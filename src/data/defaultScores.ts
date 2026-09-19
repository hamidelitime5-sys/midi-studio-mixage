import { ScoreItem, Setlist } from '../types/score';
import { jsPDF } from 'jspdf';

// Helper to generate a clean sample musical PDF sheet in client memory
export function generateSamplePdfScore(): string {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Page Background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, 'F');

    // Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text('CANON EN RE MAJEUR', 105, 24, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text('Partition de Test Orchestrale - Johann Pachelbel', 105, 32, { align: 'center' });
    doc.text('Tempo: Andante (BPM 80) | Tonalite: D Maj', 105, 38, { align: 'center' });

    // Draw 5-line musical staves
    const drawStaff = (y: number, label: string, chords: string[]) => {
      doc.setDrawColor(71, 85, 105);
      doc.setLineWidth(0.3);

      // Label & Clef
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(label, 14, y + 6);

      // 5 lines
      for (let i = 0; i < 5; i++) {
        doc.line(26, y + i * 3, 196, y + i * 3);
      }

      // Bar lines
      doc.line(26, y, 26, y + 12);
      doc.line(68, y, 68, y + 12);
      doc.line(110, y, 110, y + 12);
      doc.line(152, y, 152, y + 12);
      doc.line(196, y, 196, y + 12);

      // Chords above bar
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(234, 88, 12); // Orange chord
      doc.text(chords[0] || '', 32, y - 2);
      doc.text(chords[1] || '', 74, y - 2);
      doc.text(chords[2] || '', 116, y - 2);
      doc.text(chords[3] || '', 158, y - 2);

      // Draw stylized note heads and stems
      doc.setFillColor(30, 41, 59);
      doc.setDrawColor(30, 41, 59);
      const notePositions = [
        { x: 38, y: y + 9 },
        { x: 50, y: y + 6 },
        { x: 80, y: y + 3 },
        { x: 92, y: y + 6 },
        { x: 122, y: y + 9 },
        { x: 134, y: y + 12 },
        { x: 164, y: y + 6 },
        { x: 176, y: y + 3 },
      ];

      notePositions.forEach((pos) => {
        doc.ellipse(pos.x, pos.y, 2, 1.4, 'F');
        doc.line(pos.x + 1.8, pos.y, pos.x + 1.8, pos.y - 8);
      });
    };

    // Staves across the sheet
    drawStaff(52, 'Violon I', ['D', 'A', 'Bm', 'F#m']);
    drawStaff(78, 'Violon II', ['G', 'D', 'G', 'A']);
    drawStaff(104, 'Alto', ['D', 'A', 'Bm', 'F#m']);
    drawStaff(130, 'Violoncelle', ['G', 'D', 'G', 'A']);
    drawStaff(156, 'Basse Cont.', ['D', 'A', 'Bm', 'F#m']);
    drawStaff(182, 'Clavier / SF2', ['G', 'D', 'G', 'A']);

    // Performance Notes
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Document PDF test pour ecran tactile - Utilisez le geste de pincement a 2 doigts pour zoomer et vous deplacer.',
      105,
      270,
      { align: 'center' }
    );

    return doc.output('datauristring');
  } catch (err) {
    console.error('Failed to create sample PDF:', err);
    return '';
  }
}

// Helper to generate a sample high-res sheet music photo/image (SVG Data URI)
export function generateSamplePhotoScore(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600" width="1200" height="1600" style="background:#ffffff;font-family:Georgia,serif;">
    <rect width="1200" height="1600" fill="#ffffff"/>
    <rect x="30" y="30" width="1140" height="1540" fill="none" stroke="#e2e8f0" stroke-width="2"/>
    
    <text x="600" y="100" text-anchor="middle" font-size="38" font-weight="bold" fill="#0f172a">AUTUMN LEAVES (LES FEUILLES MORTES)</text>
    <text x="600" y="145" text-anchor="middle" font-size="20" fill="#475569">Musique de Joseph Kosma • Paroles de Jacques Prévert</text>
    <text x="600" y="180" text-anchor="middle" font-size="16" fill="#ea580c" font-weight="bold">Standard Jazz • Tonalité : Em / G Maj • Tempo : 120 Swing</text>

    <!-- Stave 1 -->
    <g transform="translate(80, 240)">
      <text x="-40" y="32" font-size="18" font-weight="bold" fill="#334155">A1</text>
      <!-- Stave lines -->
      <line x1="0" y1="0" x2="1040" y2="0" stroke="#334155" stroke-width="1.8"/>
      <line x1="0" y1="16" x2="1040" y2="16" stroke="#334155" stroke-width="1.8"/>
      <line x1="0" y1="32" x2="1040" y2="32" stroke="#334155" stroke-width="1.8"/>
      <line x1="0" y1="48" x2="1040" y2="48" stroke="#334155" stroke-width="1.8"/>
      <line x1="0" y1="64" x2="1040" y2="64" stroke="#334155" stroke-width="1.8"/>
      <!-- Measure bars -->
      <line x1="0" y1="0" x2="0" y2="64" stroke="#334155" stroke-width="2.5"/>
      <line x1="260" y1="0" x2="260" y2="64" stroke="#334155" stroke-width="2"/>
      <line x1="520" y1="0" x2="520" y2="64" stroke="#334155" stroke-width="2"/>
      <line x1="780" y1="0" x2="780" y2="64" stroke="#334155" stroke-width="2"/>
      <line x1="1040" y1="0" x2="1040" y2="64" stroke="#334155" stroke-width="2.5"/>
      <!-- Chords -->
      <text x="30" y="-14" font-size="24" font-weight="bold" fill="#ea580c">Am7</text>
      <text x="290" y="-14" font-size="24" font-weight="bold" fill="#ea580c">D7</text>
      <text x="550" y="-14" font-size="24" font-weight="bold" fill="#ea580c">Gmaj7</text>
      <text x="810" y="-14" font-size="24" font-weight="bold" fill="#ea580c">Cmaj7</text>
      <!-- Notes representation -->
      <circle cx="80" cy="32" r="8" fill="#0f172a"/>
      <line x1="87" y1="32" x2="87" y2="-10" stroke="#0f172a" stroke-width="2.5"/>
      <circle cx="160" cy="24" r="8" fill="#0f172a"/>
      <line x1="167" y1="24" x2="167" y2="-18" stroke="#0f172a" stroke-width="2.5"/>
      <circle cx="340" cy="16" r="8" fill="#0f172a"/>
      <line x1="347" y1="16" x2="347" y2="-26" stroke="#0f172a" stroke-width="2.5"/>
      <circle cx="600" cy="8" r="8" fill="#0f172a"/>
      <line x1="607" y1="8" x2="607" y2="-34" stroke="#0f172a" stroke-width="2.5"/>
      <circle cx="860" cy="24" r="8" fill="#0f172a"/>
      <line x1="867" y1="24" x2="867" y2="-18" stroke="#0f172a" stroke-width="2.5"/>
    </g>

    <!-- Stave 2 -->
    <g transform="translate(80, 420)">
      <line x1="0" y1="0" x2="1040" y2="0" stroke="#334155" stroke-width="1.8"/>
      <line x1="0" y1="16" x2="1040" y2="16" stroke="#334155" stroke-width="1.8"/>
      <line x1="0" y1="32" x2="1040" y2="32" stroke="#334155" stroke-width="1.8"/>
      <line x1="0" y1="48" x2="1040" y2="48" stroke="#334155" stroke-width="1.8"/>
      <line x1="0" y1="64" x2="1040" y2="64" stroke="#334155" stroke-width="1.8"/>
      <line x1="0" y1="0" x2="0" y2="64" stroke="#334155" stroke-width="2.5"/>
      <line x1="260" y1="0" x2="260" y2="64" stroke="#334155" stroke-width="2"/>
      <line x1="520" y1="0" x2="520" y2="64" stroke="#334155" stroke-width="2"/>
      <line x1="780" y1="0" x2="780" y2="64" stroke="#334155" stroke-width="2"/>
      <line x1="1040" y1="0" x2="1040" y2="64" stroke="#334155" stroke-width="2.5"/>
      <text x="30" y="-14" font-size="24" font-weight="bold" fill="#ea580c">F#m7(b5)</text>
      <text x="290" y="-14" font-size="24" font-weight="bold" fill="#ea580c">B7(b9)</text>
      <text x="550" y="-14" font-size="24" font-weight="bold" fill="#ea580c">Em7</text>
      <text x="810" y="-14" font-size="24" font-weight="bold" fill="#ea580c">Em7</text>
      <circle cx="90" cy="40" r="8" fill="#0f172a"/>
      <circle cx="350" cy="32" r="8" fill="#0f172a"/>
      <circle cx="610" cy="48" r="8" fill="#0f172a"/>
    </g>

    <!-- Stave 3 -->
    <g transform="translate(80, 600)">
      <text x="-40" y="32" font-size="18" font-weight="bold" fill="#334155">B</text>
      <line x1="0" y1="0" x2="1040" y2="0" stroke="#334155" stroke-width="1.8"/>
      <line x1="0" y1="16" x2="1040" y2="16" stroke="#334155" stroke-width="1.8"/>
      <line x1="0" y1="32" x2="1040" y2="32" stroke="#334155" stroke-width="1.8"/>
      <line x1="0" y1="48" x2="1040" y2="48" stroke="#334155" stroke-width="1.8"/>
      <line x1="0" y1="64" x2="1040" y2="64" stroke="#334155" stroke-width="1.8"/>
      <line x1="0" y1="0" x2="0" y2="64" stroke="#334155" stroke-width="2.5"/>
      <line x1="260" y1="0" x2="260" y2="64" stroke="#334155" stroke-width="2"/>
      <line x1="520" y1="0" x2="520" y2="64" stroke="#334155" stroke-width="2"/>
      <line x1="780" y1="0" x2="780" y2="64" stroke="#334155" stroke-width="2"/>
      <line x1="1040" y1="0" x2="1040" y2="64" stroke="#334155" stroke-width="2.5"/>
      <text x="30" y="-14" font-size="24" font-weight="bold" fill="#ea580c">B7</text>
      <text x="290" y="-14" font-size="24" font-weight="bold" fill="#ea580c">Em7</text>
      <text x="550" y="-14" font-size="24" font-weight="bold" fill="#ea580c">Am7</text>
      <text x="810" y="-14" font-size="24" font-weight="bold" fill="#ea580c">D7</text>
    </g>

    <!-- Instructions banner -->
    <rect x="80" y="800" width="1040" height="120" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
    <text x="600" y="845" text-anchor="middle" font-size="22" font-weight="bold" fill="#0f172a">PHOTO PARTITION TEST • ZOOM TACTILE 2 DOIGTS</text>
    <text x="600" y="885" text-anchor="middle" font-size="16" fill="#475569">Pincez l'ecran avec deux doigts pour zoomer et dezoomer, ou faites glisser pour naviguer sur la page.</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_CHORDPRO_STAND_BY_ME = `{title: Stand By Me}
{artist: Ben E. King}
{key: A}
{tempo: 118}
{comment: Intro (Basse & Percussions)}
[A]    [F#m]    [D]    [E7]    [A]

{comment: Couplet 1}
When the [A]night has come, [F#m]and the land is dark
And the [D]moon is the [E7]only light we'll [A]see
No, I [A]won't be afraid, no, I [F#m]won't be afraid
Just as [D]long as you [E7]stand, stand by [A]me

{comment: Refrain}
So darling, darling, [A]stand by me, oh [F#m]stand by me
Oh [D]stand, [E7]stand by me, [A]stand by me

{comment: Couplet 2}
If the [A]sky that we look upon [F#m]should tumble and fall
Or the [D]mountain should [E7]crumble to the [A]sea
I won't [A]cry, I won't cry, no, I [F#m]won't shed a tear
Just as [D]long as you [E7]stand, stand by [A]me

{comment: Refrain & Outro}
And darling, darling, [A]stand by me, oh [F#m]stand by me
Oh [D]stand, [E7]stand by me, [A]stand by me
Whenever you're in trouble won't you [A]stand by me, oh [F#m]stand by me
Oh [D]stand now, [E7]stand by me, [A]stand by me.
`;

export const DEFAULT_CHORDPRO_LET_IT_BE = `{title: Let It Be}
{artist: The Beatles}
{key: C}
{tempo: 75}
{comment: Intro Piano}
[C]  [G]  [Am]  [F]  [C]  [G]  [F]  [C]

{comment: Couplet 1}
When I [C]find myself in [G]times of trouble, [Am]Mother Mary [F]comes to me
[C]Speaking words of [G]wisdom, let it [F]be [C]
And in my [C]hour of darkness she is [G]standing right in [Am]front of [F]me
[C]Speaking words of [G]wisdom, let it [F]be [C]

{comment: Refrain}
Let it [Am]be, let it [G]be, let it [F]be, let it [C]be
[C]Whisper words of [G]wisdom, let it [F]be [C]

{comment: Couplet 2}
And when the [C]broken hearted [G]people living [Am]in the world [F]agree
[C]There will be an [G]answer, let it [F]be [C]
For though they [C]may be parted there is [G]still a chance that [Am]they will [F]see
[C]There will be an [G]answer, let it [F]be [C]
`;

export const DEFAULT_CHORDPRO_HALLELUJAH = `{title: Hallelujah}
{artist: Leonard Cohen}
{key: C}
{tempo: 60}
{comment: Intro}
[C]    [Am]    [C]    [Am]

{comment: Couplet 1}
Now I've [C]heard there was a [Am]secret chord
That [C]David played, and it [Am]pleased the Lord
But [F]you don't really [G]care for music, [C]do you? [G]
It [C]goes like this, the [F]fourth, the [G]fifth
The [Am]minor fall, the [F]major lift
The [G]baffled king com[E7]posing Halle[Am]lujah

{comment: Refrain}
Halle[F]lujah, Halle[Am]lujah
Halle[F]lujah, Halle[C]lu---[G]--[C]jah
`;

export function getInitialScores(): ScoreItem[] {
  const now = Date.now();
  return [
    {
      id: 'score-1',
      title: 'Stand By Me',
      artist: 'Ben E. King',
      type: 'chordpro',
      content: DEFAULT_CHORDPRO_STAND_BY_ME,
      fileName: 'stand-by-me.chordpro',
      fileSize: DEFAULT_CHORDPRO_STAND_BY_ME.length,
      originalKey: 'A',
      currentTranspose: 0,
      bpm: 118,
      dateAdded: now - 3600000 * 3,
      tags: ['Pop', 'Classique', 'R&B', 'MIDI Inclus'],
      midiSongId: 'stand-by-me',
      midiFileName: 'stand-by-me.mid',
    },
    {
      id: 'score-2',
      title: 'Let It Be',
      artist: 'The Beatles',
      type: 'chordpro',
      content: DEFAULT_CHORDPRO_LET_IT_BE,
      fileName: 'let-it-be.chordpro',
      fileSize: DEFAULT_CHORDPRO_LET_IT_BE.length,
      originalKey: 'C',
      currentTranspose: 0,
      bpm: 75,
      dateAdded: now - 3600000 * 2,
      tags: ['Rock', 'Ballade', 'MIDI Inclus'],
      midiSongId: 'let-it-be',
      midiFileName: 'let-it-be.mid',
    },
    {
      id: 'score-3',
      title: 'Hallelujah',
      artist: 'Leonard Cohen',
      type: 'chordpro',
      content: DEFAULT_CHORDPRO_HALLELUJAH,
      fileName: 'hallelujah.chordpro',
      fileSize: DEFAULT_CHORDPRO_HALLELUJAH.length,
      originalKey: 'C',
      currentTranspose: 0,
      bpm: 60,
      dateAdded: now - 3600000 * 1,
      tags: ['Acoustique', 'Folk'],
    },
    {
      id: 'score-4',
      title: 'Canon en Ré Majeur (PDF Test)',
      artist: 'Johann Pachelbel',
      type: 'pdf',
      content: generateSamplePdfScore(),
      fileName: 'canon-pachelbel.pdf',
      fileSize: 45000,
      originalKey: 'D',
      bpm: 80,
      dateAdded: now - 1800000,
      tags: ['Classique', 'PDF Test', 'Zoom Tactile', 'MIDI Inclus'],
      midiSongId: 'stand-by-me', // backing track
      midiFileName: 'canon-orchestral.mid',
    },
    {
      id: 'score-5',
      title: 'Autumn Leaves (Photo Test)',
      artist: 'Joseph Kosma',
      type: 'image',
      content: generateSamplePhotoScore(),
      fileName: 'autumn-leaves-score.png',
      fileSize: 62000,
      originalKey: 'Em',
      bpm: 120,
      dateAdded: now - 900000,
      tags: ['Jazz', 'Photo Test', 'Zoom 2 Doigts'],
    },
  ];
}

export const DEFAULT_SETLISTS: Setlist[] = [
  {
    id: 'setlist-1',
    name: 'Set Principal Concert',
    scoreIds: ['score-1', 'score-2', 'score-5', 'score-3'],
    createdAt: Date.now(),
  },
  {
    id: 'setlist-2',
    name: 'Répétition Acoustique',
    scoreIds: ['score-2', 'score-3'],
    createdAt: Date.now(),
  },
];
