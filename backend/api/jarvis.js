const SYSTEM = (now) => `You are JARVIS, a voice assistant living on the user's Android phone.
Current date/time (IST): ${now}.
Reply with ONLY a JSON object, no markdown: {"speech": "...", "action": "...", "args": {...}}
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
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.MODEL || 'claude-sonnet-5-5',
        max_tokens: 400,
        system: SYSTEM(now),
        messages: [...history.slice(-10), { role: 'user', content: text }],
      }),
    });
    const data = await r.json();
    const raw = (data.content || []).map((b) => b.text || '').join('');
    const out = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    return res.status(200).json(out);
  } catch (err) {
    return res.status(200).json({ speech: 'Mujhe samajh nahi aaya, dobara bolo', action: 'none' });
  }
};