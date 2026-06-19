// /api/progreso.js — Proxy Vercel para el portal de progreso del cliente.
// Recibe ?folio= desde el portal y consulta Make internamente.
// El webhook de Make NUNCA se expone al navegador del cliente.

const MAKE_WEBHOOK = process.env.MAKE_PROGRESO_WEBHOOK;
// Configurar MAKE_PROGRESO_WEBHOOK únicamente en variables de entorno de Vercel.
// No pegar aquí valores reales, URLs privadas, tokens ni credenciales.

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
      // Make respondió pero no es JSON válido
      return res.status(502).json({ error: 'Respuesta inesperada de Make', raw: text.slice(0, 200) });
    }

    // Si Make envuelve los datos en {ok:true, ...datos}, aplanar al nivel raíz
    // para que el portal encuentre d.propiedad, d.folio, etc. directamente.
    if (data && data.ok === true) {
      const { ok, ...payload } = data;
      data = payload;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);

  } catch (err) {
    console.error('Error al consultar Make:', err);
    return res.status(502).json({ error: 'No se pudo consultar la operación' });
  }
}
