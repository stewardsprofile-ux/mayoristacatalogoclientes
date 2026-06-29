const { isAuthenticated, setSession, clearSession, validPassword } = require("../lib/admin-auth");
const attempts = new Map();

function allowed(req) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter(time => now - time < 15 * 60 * 1000);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length <= 10;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") return res.status(200).json({ authenticated: isAuthenticated(req), configured: Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET) });
  if (req.method === "POST") {
    if (!allowed(req)) return res.status(429).json({ error: "Demasiados intentos. Espera 15 minutos." });
    if (!validPassword(req.body?.password)) return res.status(401).json({ error: "Contraseña incorrecta" });
    setSession(res);
    return res.status(200).json({ authenticated: true });
  }
  if (req.method === "DELETE") {
    clearSession(res);
    return res.status(200).json({ authenticated: false });
  }
  return res.status(405).json({ error: "Método no permitido" });
};
