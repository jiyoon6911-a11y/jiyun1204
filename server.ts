import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * POST /api/gemini/analyze-track
 * Analyzes a YouTube song to detect its BPM, time signature, intro start time,
 * and pickup beat (못갖춘마디 / 예비박 / anacrusis).
 */
app.post('/api/gemini/analyze-track', async (req: Request, res: Response): Promise<void> => {
  try {
    const { titleOrUrl, videoId } = req.body;

    if (!titleOrUrl && !videoId) {
      res.status(400).json({ error: '곡 제목이나 유튜브 링크를 입력해 주세요.' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(200).json({
        success: false,
        fallback: true,
        message: 'GEMINI_API_KEY가 설정되지 않아 기본 템포 분석을 진행합니다.',
        bpm: 120,
        timeSignature: { beats: 4, noteValue: 4 },
        pickupBeat: 0,
        pickupType: 'none',
        estimatedStartTimeSec: 0,
        analysisSummary: 'API 키가 설정되지 않아 수동 설정 모드로 안내합니다.',
      });
      return;
    }

    const prompt = `Analyze the musical tempo, meter, intro structure, and pickup beats (못갖춘마디/예비박/anacrusis) for the song identified by: "${titleOrUrl}" (YouTube Video ID: ${videoId || 'unknown'}).

Musicians need exact timing to synchronize a metronome with this video.
Specifically answer:
1. songTitle and artistName.
2. exactBpm: The original studio BPM (beats per minute) as a number (e.g. 115, 128, 96).
3. timeSignatureBeats: numerator (typically 4 or 3 or 6).
4. timeSignatureNoteValue: denominator (typically 4 or 8).
5. hasPickupBeat: boolean (true if the song melody/rhythm enters with an upbeat/pickup note/anacrusis before the first full downbeat measure).
6. pickupBeatsCount: number of beats in the pickup (e.g., 1 for a 1-beat pickup entering on beat 4, 2 for 2-beat pickup entering on beat 3, 0.5 for an eighth-note pickup, 0 for none/straight downbeat).
7. estimatedAudioStartSeconds: estimated timestamp in seconds when the actual music/intro sound begins in typical versions of this music video/track (e.g. 0.5, 1.2, 3.0).
8. rhythmFeel: (e.g. "Straight 4/4", "Swing / Shuffle", "Half-time 16th Funk", "Waltz 3/4").
9. koreanAnalysisExplanation: A clear 2-3 sentence explanation in Korean explaining how this song starts (e.g., "이 곡은 약 1.2초 지점에서 1박의 예비박(못갖춘마디)으로 멜로디가 먼저 진입한 후 정박(강박)이 시작됩니다. 4/4박자 118 BPM으로 맞추면 정확합니다.").`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a professional audio engineer and music rhythm theorist. Provide precise JSON output analyzing song tempo, pickup beats (예비박/못갖춘마디), and audio entry times.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            songTitle: { type: Type.STRING },
            artistName: { type: Type.STRING },
            exactBpm: { type: Type.NUMBER },
            timeSignatureBeats: { type: Type.INTEGER },
            timeSignatureNoteValue: { type: Type.INTEGER },
            hasPickupBeat: { type: Type.BOOLEAN },
            pickupBeatsCount: { type: Type.NUMBER },
            estimatedAudioStartSeconds: { type: Type.NUMBER },
            rhythmFeel: { type: Type.STRING },
            koreanAnalysisExplanation: { type: Type.STRING },
          },
          required: [
            'exactBpm',
            'timeSignatureBeats',
            'timeSignatureNoteValue',
            'hasPickupBeat',
            'pickupBeatsCount',
            'koreanAnalysisExplanation',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    res.json({
      success: true,
      title: parsed.songTitle || titleOrUrl,
      artist: parsed.artistName || '',
      bpm: parsed.exactBpm || 120,
      timeSignature: {
        beats: parsed.timeSignatureBeats || 4,
        noteValue: parsed.timeSignatureNoteValue || 4,
      },
      hasPickupBeat: !!parsed.hasPickupBeat,
      pickupBeatsCount: parsed.pickupBeatsCount || 0,
      estimatedStartTimeSec: parsed.estimatedAudioStartSeconds || 0,
      rhythmFeel: parsed.rhythmFeel || 'Standard',
      analysisSummary: parsed.koreanAnalysisExplanation || '',
    });
  } catch (err: any) {
    console.warn('Gemini API call failed, using intelligent music heuristic fallback:', err?.message || err);
    
    // Heuristic detection based on title query
    const lower = String(req.body.titleOrUrl || '').toLowerCase();
    let estimatedBpm = 120;
    let pickupCount = 0;
    let startTime = 0.5;
    let explanation = '음원 분석 결과: 4/4박자 기본 리듬으로 추정됩니다. 소리가 진입하는 순간 [지금 소리 시작됨] 버튼을 눌러 정밀하게 맞춰보세요.';

    const bpmMatch = lower.match(/(\d{2,3})\s*bpm/);
    if (bpmMatch && bpmMatch[1]) {
      estimatedBpm = parseInt(bpmMatch[1], 10);
      explanation = `제목에서 ${estimatedBpm} BPM을 감지했습니다.`;
    } else if (lower.includes('hype boy') || lower.includes('뉴진스')) {
      estimatedBpm = 100;
      pickupCount = 1;
      startTime = 0.15;
      explanation = 'Hype Boy (뉴진스): 100 BPM, 4/4박자 곡입니다. 1박의 예비박(못갖춘마디)으로 멜로디가 먼저 시작되는 구조입니다.';
    } else if (lower.includes('uptown funk') || lower.includes('bruno mars')) {
      estimatedBpm = 115;
      pickupCount = 0;
      startTime = 0.3;
      explanation = 'Uptown Funk: 115 BPM, 4/4박자 정박 펑크 그루브입니다.';
    } else if (lower.includes('just the two of us')) {
      estimatedBpm = 96;
      pickupCount = 1;
      startTime = 0.4;
      explanation = 'Just the Two of Us: 96 BPM, 4/4박자 대표 소울 곡으로 1박 예비박으로 진입합니다.';
    } else if (lower.includes('blues') || lower.includes('12 bar')) {
      estimatedBpm = 120;
      pickupCount = 0;
      startTime = 0.0;
      explanation = '스탠다드 12마디 블루스: 120 BPM 정박 시작입니다.';
    } else {
      // Default guess for common pop/dance songs: 1 beat pickup is very common
      pickupCount = 1;
      explanation = '추정 리듬: 4/4박자 120 BPM 및 1박 예비박(4박 진입)으로 계산되었습니다. [지금 소리 시작됨]을 누르면 시작점이 즉시 고정됩니다.';
    }

    res.json({
      success: true,
      fallback: true,
      title: req.body.titleOrUrl || '분석 곡',
      artist: '',
      bpm: estimatedBpm,
      timeSignature: { beats: 4, noteValue: 4 },
      hasPickupBeat: pickupCount > 0,
      pickupBeatsCount: pickupCount,
      estimatedStartTimeSec: startTime,
      rhythmFeel: 'Standard 4/4',
      analysisSummary: explanation,
    });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Vite middleware in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`SyncBeat Server running on port ${PORT}`);
  });
}

startServer();
