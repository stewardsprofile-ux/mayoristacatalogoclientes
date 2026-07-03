const { cleanCode, find, registerQuote } = require("../lib/distributor-store");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const code = cleanCode(req.query?.code || req.body?.code);
  if (!code) return res.status(400).json({ error: "Código requerido" });

  try {
    if (req.method === "GET") {
      const item = await find(code);
      if (!item || !item.active) return res.status(404).json({ error: "Enlace no válido" });
      return res.status(200).json({ code: item.code, name: item.name, phone: item.phone });
    }
    if (req.method === "POST") {
      await registerQuote(code);
      return res.status(204).end();
    }
    return res.status(405).json({ error: "Método no permitido" });
  } catch (error) {
    console.error("Distributor API:", error);
    return res.status(500).json({ error: "No se pudo consultar el mayorista" });
  }
};
