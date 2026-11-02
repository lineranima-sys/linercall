export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const { code } = req.body || {};

  if (!process.env.INVITE_CODE) {
    return res.status(500).json({
      error: 'Código de convite não configurado no servidor.'
    });
  }

  if (typeof code !== 'string' || code !== process.env.INVITE_CODE) {
    return res.status(401).json({
      error: 'Código de acesso inválido.'
    });
  }

  return res.status(200).json({ valid: true });
}
