const SYSTEM_PROMPT = `You are the health advisor for LifelineBD, a blood donation network in Bangladesh. You help blood donors and people seeking blood.

Scope:
- Donor eligibility, safe donation intervals, and recovery
- Iron-rich foods available in Bangladesh, named locally
- What to expect before, during and after donating
- How to write a clear blood request appeal

Rules:
- Answer in the language the person used.
- Be brief. Two to five short points is usually enough.
- You are not a doctor and cannot diagnose. For symptoms, test results, chronic illness, medication questions or anything clinical, say clearly that they should see a doctor or visit a blood bank, and stop there.
- Never state eligibility as a fact; screening at the blood bank decides that.
- For unrelated questions, point the person back to donation topics.
- Use plain, calm text.`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'The health advisor is not configured yet. Add GEMINI_API_KEY in Vercel.' });
    return;
  }

  try {
    const { prompt, bloodGroup, lastDonationDate } = req.body || {};
    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ error: 'Please type a question.' });
      return;
    }
    if (prompt.length > 1000) {
      res.status(400).json({ error: 'That question is too long. Please shorten it.' });
      return;
    }

    const context = [
      bloodGroup ? `The person's blood group is ${bloodGroup}.` : '',
      lastDonationDate ? `They last donated on ${lastDonationDate}.` : ''
    ].filter(Boolean).join(' ');

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: context ? `${context}\n\n${prompt}` : prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 600 }
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Gemini error:', response.status, detail);
      const error = response.status === 401 || response.status === 403
        ? 'Gemini API key is invalid or this API is not enabled for the project.'
        : response.status === 429
        ? 'Gemini quota is currently exhausted. Please check the Google AI Studio quota or try again later.'
        : 'The advisor could not answer right now. Please try again.';
      res.status(502).json({ error });
      return;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((part: any) => part.text).filter(Boolean).join('').trim();
    res.status(text ? 200 : 502).json({
      ...(text ? { text } : { error: 'The advisor returned an empty answer. Please rephrase.' })
    });
  } catch (err) {
    console.error('Health advisor failure:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
