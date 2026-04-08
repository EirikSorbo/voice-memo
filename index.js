import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { Resend } from 'resend';
import { createReadStream, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.static('public'));

app.post('/transcribe-and-email', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file received' });

  const tmpPath = join(tmpdir(), `memo-${randomUUID()}.webm`);

  try {
    // Write buffer to temp file (OpenAI SDK needs a stream with a filename)
    writeFileSync(tmpPath, req.file.buffer);

    // 1. Transcribe with Whisper (auto-detects language)
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(tmpPath),
      model: 'whisper-1',
    });

    const transcript = transcription.text;
    if (!transcript || transcript.trim().length === 0) {
      return res.status(422).json({ error: 'Could not transcribe audio — please try again' });
    }

    // 2. Structure the transcript into a report with GPT
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a personal assistant that turns spoken voice memos into clean, structured reports.
The user may speak in Norwegian or English — always respond in the same language they used.
Format the report with:
- A short title summarizing the main topic
- Key points as a bulleted list
- A brief action items section (if any tasks or follow-ups were mentioned)
- A one-sentence summary at the end
Keep it concise and professional. Use markdown formatting.`,
        },
        {
          role: 'user',
          content: `Please turn this voice memo transcript into a structured report:\n\n${transcript}`,
        },
      ],
    });

    const report = completion.choices[0].message.content;

    // 3. Send the report by email
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: process.env.RECIPIENT_EMAIL,
      subject: `Voice Memo Report — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
          <p style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-bottom: 24px;">Voice Memo Report</p>
          <div style="white-space: pre-wrap; line-height: 1.7; font-size: 15px;">${markdownToHtml(report)}</div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <details>
            <summary style="font-size: 12px; color: #aaa; cursor: pointer; letter-spacing: 0.05em;">Original transcript</summary>
            <p style="font-size: 13px; color: #666; margin-top: 12px; line-height: 1.6; font-style: italic;">${transcript}</p>
          </details>
        </div>
      `,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Something went wrong' });
  } finally {
    try { unlinkSync(tmpPath); } catch {}
  }
});

// Simple markdown-to-HTML converter for email
function markdownToHtml(md) {
  return md
    .replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:600;margin:20px 0 8px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:17px;font-weight:600;margin:24px 0 10px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:600;margin:0 0 16px;">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li style="margin:4px 0;">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul style="padding-left:20px;margin:8px 0;">$&</ul>')
    .replace(/\n\n/g, '<br><br>');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Voice Memo running on port ${PORT}`));
