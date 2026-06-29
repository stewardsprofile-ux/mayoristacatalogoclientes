const { put } = require("@vercel/blob");
const { isAuthenticated } = require("../lib/admin-auth");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!isAuthenticated(req)) return res.status(401).json({ error: "No autorizado" });
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: "Vercel Blob aún no está conectado" });

  try {
    const contentType = String(req.body?.contentType || "");
    const data = String(req.body?.data || "");
    if (!/^image\/(jpeg|png|webp|avif)$/i.test(contentType)) return res.status(400).json({ error: "Formato no permitido" });
    const buffer = Buffer.from(data, "base64");
    if (!buffer.length || buffer.length > 4_000_000) return res.status(400).json({ error: "La imagen debe pesar menos de 4 MB" });
    const safeName = String(req.body?.name || "perfume").replace(/[^a-z0-9._-]/gi, "-").slice(-100);
    const blob = await put(`perfumes/${Date.now()}-${safeName}`, buffer, { access: "public", contentType, addRandomSuffix: true });
    return res.status(200).json({ url: blob.url });
  } catch (error) {
    console.error("Admin upload:", error);
    return res.status(500).json({ error: "No se pudo subir la imagen" });
  }
};
