export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { apiKey, requestBody } = req.body || {};
  const finalKey = (process.env.GEMINI_API_KEY || apiKey || '').replace(/\s+/g, '');

  if (!finalKey || !requestBody) {
    return res.status(400).json({ error: 'Chave API ou dados da consulta ausentes.' });
  }

  const endpoints = [
    'https://googleapis.com',
    'https://googleapis.com',
    'https://googleapis.com'
  ];

  let lastError = 'Falha desconhecida';

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': finalKey
        },
        body: JSON.stringify(requestBody)
      });

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        lastError = `HTTP ${response.status} em ${url}`;
        continue;
      }

      if (response.ok) {
        return res.status(200).json(data);
      }

      lastError = data.error ? `${data.error.message} (HTTP ${response.status})` : `HTTP ${response.status}`;
    } catch (err) {
      lastError = err.cause ? `${err.message} (${err.cause.code || err.cause.message})` : err.message;
    }
  }

  return res.status(502).json({
    error: { message: `Não foi possível conectar ao Google: ${lastError}` }
  });
}
