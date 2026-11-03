import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { transcribe, askTranscript } from './api/_lib/engine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

// Body parser with 100MB limit for audio uploads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Transcription endpoint (model fallback chain lives in api/_lib/engine.ts)
app.post('/api/transcribe', async (req: Request, res: Response) => {
  try {
    const data = await transcribe(req.body || {});
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return res.status(error?.status || 500).json({
      error: error?.message || 'Failed to transcribe audio. Please try again.',
    });
  }
});

// Ask questions about a transcript
app.post('/api/ask-transcript', async (req: Request, res: Response) => {
  try {
    const { transcriptText, question } = req.body || {};
    if (!transcriptText || !question) {
      return res.status(400).json({ error: 'transcriptText and question are required' });
    }
    const answer = await askTranscript(transcriptText, question);
    return res.json({ answer: answer || 'No response generated.' });
  } catch (error: any) {
    console.error('Ask transcript error:', error);
    return res.status(error?.status || 500).json({
      error: error?.message || 'Failed to answer question about transcript.',
    });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Transcriber server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
