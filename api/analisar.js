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

    // Se a chave começar com AQ. usa o endpoint Vertex AI Express; se for AIzaSy usa o AI Studio padrão
    const endpointUrl = cleanKey.startsWith('AQ.')
      ? `https://googleapis.com{encodeURIComponent(cleanKey)}`
      : `https://googleapis.com{encodeURIComponent(cleanKey)}`;

    const googleResponse = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const rawResponseText = await googleResponse.text();

    let data;
    try {
      data = JSON.parse(rawResponseText);
    } catch {
      return res.status(502).json({
        error: { message: `Resposta inesperada do Google (HTTP ${googleResponse.status}). Verifique se a chave AQ. está ativa no Google Cloud.` }
      });
    }

    return res.status(googleResponse.status).json(data);

  } catch (err) {
    return res.status(500).json({
      error: { message: `Erro interno na ponte Vercel: ${err.message}` }
    });
  }
}
