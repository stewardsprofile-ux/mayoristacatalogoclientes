const { register, authenticate, find, updateOwnProfile } = require("../lib/distributor-store");
const { session, setSession, clearSession, configured } = require("../lib/partner-auth");

function publicProfile(item) {
  return { code: item.code, name: item.name, phone: item.phone, link: `/?vendedor=${encodeURIComponent(item.code)}` };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      const current = session(req);
      const item = current ? await find(current.code) : null;
      return res.status(200).json({ authenticated: Boolean(item?.active), configured: configured(), profile: item?.active ? publicProfile(item) : null });
    }
    if (!configured()) return res.status(503).json({ error: "El portal todavía no está configurado" });
    if (req.method === "POST") {
      const action = req.body?.action;
      let item;
      if (action === "register") item = await register(req.body || {});
      else if (action === "login") item = await authenticate(req.body?.username, req.body?.password);
      else return res.status(400).json({ error: "Acción no válida" });
      if (!item) return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
      setSession(res, item.code);
      return res.status(200).json({ authenticated: true, profile: publicProfile(item) });
    }
    if (req.method === "PUT") {
      const current = session(req);
      if (!current) return res.status(401).json({ error: "Sesión vencida" });
      const item = await updateOwnProfile(current.code, req.body || {});
      return res.status(200).json({ profile: publicProfile(item) });
    }
    if (req.method === "DELETE") {
      clearSession(res);
      return res.status(200).json({ authenticated: false });
    }
    return res.status(405).json({ error: "Método no permitido" });
  } catch (error) {
    console.error("Partner auth:", error);
    return res.status(400).json({ error: error.message || "No se pudo procesar la solicitud" });
  }
};
