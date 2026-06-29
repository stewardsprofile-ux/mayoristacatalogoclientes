const crypto = require("crypto");

const COOKIE = "elite_admin_session";
const MAX_AGE = 8 * 60 * 60;

function secret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}

function sign(payload) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function createSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function cookieValue(req) {
  const cookies = String(req.headers.cookie || "").split(";");
  const match = cookies.find(item => item.trim().startsWith(`${COOKIE}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : "";
}

function isAuthenticated(req) {
  if (!secret()) return false;
  const [payload, signature] = cookieValue(req).split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).exp > Date.now();
  } catch {
    return false;
  }
}

function setSession(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(createSession())}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`);
}

function clearSession(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

function validPassword(password) {
  const configured = process.env.ADMIN_PASSWORD || "";
  return configured && safeEqual(password, configured);
}

module.exports = { isAuthenticated, setSession, clearSession, validPassword };
