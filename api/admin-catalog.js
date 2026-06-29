const { isAuthenticated } = require("../lib/admin-auth");
const { catalog, save } = require("../lib/catalog-store");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!isAuthenticated(req)) return res.status(401).json({ error: "No autorizado" });
  try {
    if (req.method === "GET") return res.status(200).json({ items: await catalog({ includeDeleted: true }) });
    if (req.method === "POST" || req.method === "PUT") return res.status(200).json({ item: await save(req.body || {}) });
    return res.status(405).json({ error: "Método no permitido" });
  } catch (error) {
    console.error("Admin catalog:", error);
    return res.status(500).json({ error: error.message || "No se pudo guardar" });
  }
};
