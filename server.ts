import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy Gemini AI client initialization
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'MIDI Karaoke Studio', time: new Date().toISOString() });
});

// AI Song Assistant (Optional AI Lyric or Musical Structure Suggestion)
app.post('/api/ai-song-info', async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ info: 'SynthFont2 ready. Connect via loopMIDI or hardware MIDI out.' });
    }

    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Provide a 2-sentence musical summary of the song "${title}" ${artist ? `by ${artist}` : ''} including key, tempo, and signature instruments for SoundFont GM/SF2 arrangement.`,
    });

    res.json({ info: response.text || '' });
  } catch (error: any) {
    res.json({ info: 'General MIDI and SoundFont SF2 format loaded.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MIDI Karaoke Studio server running on http://localhost:${PORT}`);
  });
}

startServer();
