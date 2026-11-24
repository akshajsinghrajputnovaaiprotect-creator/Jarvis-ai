const SYSTEM = (now) => `You are JARVIS, a voice assistant living on the user's Android phone.
Current date/time (IST): ${now}.
Reply with ONLY a JSON object: {"speech": "...", "action": "...", "args": {...}}
- speech: short, friendly Hinglish in Roman letters, max 2 sentences.
- action is one of:
  none
  call {contact}
  sms {contact, text}
  whatsapp {contact, text}
  open_app {app}
  flashlight {on: true|false}
  alarm {hour (0-23), minute, label}
  timer {seconds}
  search {query}
  navigate {place}
  play {query}
- For call and sms, speech MUST be a short confirmation question (e.g. "Mummy ko call laga doon?").
- Write contact names in Roman letters as they are likely saved in the phone.
- For general chat/questions use action "none" and answer in speech.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (req.headers['x-app-key'] !== process.env.APP_KEY) return res.status(401).json({ error: 'unauthorized' });
  const { text, history = [] } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text missing' });
  try {
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const contents = [
      ...history.slice(-10).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text }] },
    ];
    const model = process.env.MODEL || 'gemini-2.5-flash-lite';
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM(now) }] },
          contents,
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 400 },
        }),
      }
    );
    const data = await r.json();
    const raw = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    const out = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    return res.status(200).json(out);
  } catch (err) {
    return res.status(200).json({ speech: 'Mujhe samajh nahi aaya, dobara bolo', action: 'none' });
  }
};