export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const expectedCode = process.env.INVITE_CODE;
  if (!expectedCode) {
    return res.status(500).json({
      error: 'Código de convite não configurado no servidor.'
    });
  }

  const code = req.body?.code;
  if (
    typeof code !== 'string' ||
    code.length === 0 ||
    code.length > 128
  ) {
    return res.status(400).json({
      error: 'Código de acesso inválido.'
    });
  }

  if (code !== expectedCode) {
    return res.status(401).json({
      error: 'Código de acesso inválido.'
    });
  }

  return res.status(200).json({ valid: true });
}
