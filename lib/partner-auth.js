const crypto = require("crypto");

const COOKIE = "elite_partner_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  return process.env.PARTNER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || "";
}

function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function sessionValue(code) {
  const payload = Buffer.from(JSON.stringify({ code, expires: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function session(req) {
  if (!secret()) return null;
  const cookies = String(req.headers.cookie || "").split(";").map(v => v.trim());
  const raw = cookies.find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw) return null;
  try {
    const [payload, signature] = raw.split(".");
    if (!signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(sign(payload)))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.expires > Date.now() ? data : null;
  } catch { return null; }
}

function setSession(res, code) {
  res.setHeader("Set-Cookie", `${COOKIE}=${sessionValue(code)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`);
}

function clearSession(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

module.exports = { session, setSession, clearSession, configured: () => Boolean(secret()) };
