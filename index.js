import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import { Resend } from 'resend';

const app = express();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.static('public'));
app.use(express.json({ limit: '1mb' }));

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function markdownToHtml(md) {
  const lines = md.split('\n');
  const html = [];
  let inList = false;

  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h3 style="font-size:15px;font-weight:600;margin:20px 0 8px;">${line.slice(4)}</h3>`);
    } else if (line.startsWith('## ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h2 style="font-size:17px;font-weight:600;margin:24px 0 10px;">${line.slice(3)}</h2>`);
    } else if (line.startsWith('# ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h1 style="font-size:20px;font-weight:600;margin:0 0 16px;">${line.slice(2)}</h1>`);
    } else if (line.startsWith('- ')) {
      if (!inList) { html.push('<ul style="padding-left:20px;margin:8px 0;">'); inList = true; }
      html.push(`<li style="margin:4px 0;">${inline(line.slice(2))}</li>`);
    } else if (line.trim() === '') {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push('<br>');
    } else {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<p style="margin:4px 0;">${inline(line)}</p>`);
    }
  }

  if (inList) html.push('</ul>');
  return html.join('\n');
}

function inline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

// Structure and email the transcript
app.post('/send-report', async (req, res) => {
  const { transcript, language } = req.body;
  if (!transcript || typeof transcript !== 'string') {
    return res.status(400).json({ error: 'No transcript provided' });
  }
  if (transcript.length > 50000) {
    return res.status(400).json({ error: 'Transcript too long' });
  }

  const languageName = language || 'the same language as the transcript';

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a personal assistant that turns spoken voice memos into clean, structured reports.
You MUST write the entire report in ${languageName}. Do not switch languages under any circumstances.
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
    const safeTranscript = escapeHtml(transcript);

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: process.env.RECIPIENT_EMAIL,
      subject: `Voice Memo — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
          <p style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-bottom: 24px;">Voice Memo Report</p>
          <div style="line-height: 1.7; font-size: 15px;">${markdownToHtml(report)}</div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #aaa; margin-bottom: 12px;">Original transcript</p>
          <p style="font-size: 13px; color: #666; line-height: 1.6; font-style: italic;">${safeTranscript}</p>
        </div>
      `,
    });

    // Return the report text so the client can save it to history
    res.json({ ok: true, report });
  } catch (err) {
    console.error('Send error:', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Something went wrong' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Voice Memo running on port ${PORT}`));