// /api/progreso.js — Proxy Vercel para el portal de progreso del cliente.
// Recibe ?folio= desde el portal y consulta Make internamente.
// El webhook de Make NUNCA se expone al navegador del cliente.

const MAKE_WEBHOOK = process.env.MAKE_PROGRESO_WEBHOOK;
// Agrega la variable de entorno MAKE_PROGRESO_WEBHOOK en Vercel.
// No pegues el webhook dentro de este archivo porque el repositorio es público.

export default async function handler(req, res) {
  // Solo GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { folio, vista } = req.query;

  if (!folio) {
    return res.status(400).json({ error: 'Falta el parámetro folio' });
  }

  if (!MAKE_WEBHOOK) {
    console.error('MAKE_PROGRESO_WEBHOOK no está configurado en variables de entorno');
    return res.status(500).json({ error: 'Configuración incompleta en el servidor' });
  }

  try {
    const params = new URLSearchParams({ folio });
    if (vista) params.set('vista', vista);

    const makeRes = await fetch(`${MAKE_WEBHOOK}?${params.toString()}`);
    const text = await makeRes.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: 'Respuesta inesperada de Make',
        raw: text.slice(0, 200)
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);

  } catch (err) {
    console.error('Error al consultar Make:', err);
    return res.status(502).json({ error: 'No se pudo consultar la operación' });
  }
}
