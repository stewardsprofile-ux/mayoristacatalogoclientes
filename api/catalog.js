const { catalog } = require("../lib/catalog-store");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
  try {
    return res.status(200).json(await catalog());
  } catch (error) {
    console.error("Catalog API:", error);
    return res.status(500).json({ error: "No se pudo cargar el catálogo" });
  }
};
