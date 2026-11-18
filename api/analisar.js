export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { apiKey, requestBody } = req.body || {};

  if (!apiKey || !requestBody) {
    return res.status(400).json({ error: 'Chave API ou dados da consulta ausentes.' });
  }

  try {
    const cleanKey = apiKey.replace(/\s+/g, '');

    const googleResponse = await fetch(
      'https://googleapis.com',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey
        },
        body: JSON.stringify(requestBody)
      }
    );

    const data = await googleResponse.json();
    return res.status(googleResponse.status).json(data);

  } catch (err) {
    return res.status(500).json({
      error: { message: `Erro interno na ponte Vercel: ${err.message}` }
    });
  }
}
