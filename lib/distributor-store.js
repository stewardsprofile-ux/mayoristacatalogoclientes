const crypto = require("crypto");

const DISTRIBUTORS_KEY = "elite:distributors:v1";
const QUOTES_KEY = "elite:distributor-quotes:v1";
const USERS_KEY = "elite:distributor-users:v1";

function config() {
  return {
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  };
}

async function redis(command) {
  const { url, token } = config();
  if (!url || !token) throw new Error("Redis no configurado");
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command)
  });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(body.error || `Redis ${response.status}`);
  return body.result;
}

function cleanCode(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9_-]/g, "").slice(0, 48);
}

function newCode(name) {
  const base = String(name || "mayorista").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "mayorista";
  return `${base}-${crypto.randomBytes(2).toString("hex")}`;
}

function cleanPhone(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 18);
}

function cleanUsername(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9._-]/g, "").slice(0, 48);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function validPassword(password, stored) {
  try {
    const [salt, expected] = String(stored || "").split(":");
    const actual = hashPassword(password, salt).split(":")[1];
    return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
  } catch { return false; }
}

async function find(code) {
  const key = cleanCode(code);
  if (!key) return null;
  const raw = await redis(["HGET", DISTRIBUTORS_KEY, key]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function list() {
  const [raw, quoteRaw] = await Promise.all([
    redis(["HGETALL", DISTRIBUTORS_KEY]),
    redis(["HGETALL", QUOTES_KEY])
  ]);
  const quotes = new Map();
  for (let i = 0; i < (quoteRaw || []).length; i += 2) quotes.set(quoteRaw[i], Number(quoteRaw[i + 1]) || 0);
  const items = [];
  for (let i = 0; i < (raw || []).length; i += 2) {
    try {
      const item = JSON.parse(raw[i + 1]);
      const { passwordHash, ...safeItem } = item;
      items.push({ ...safeItem, quotes: quotes.get(item.code) || 0 });
    } catch {}
  }
  return items.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

async function save(input) {
  const previousCode = cleanCode(input.previousCode);
  const code = cleanCode(input.code) || newCode(input.name);
  const previous = previousCode ? await find(previousCode) : null;
  const item = {
    ...previous,
    code,
    name: String(input.name || "").trim().slice(0, 100),
    phone: cleanPhone(input.phone),
    active: input.active !== false,
    updatedAt: new Date().toISOString()
  };
  if (!item.name) throw new Error("El nombre es obligatorio");
  if (item.phone.length < 8) throw new Error("El WhatsApp no es válido");
  if (previousCode !== code) {
    if (await find(code)) throw new Error("Ese código ya pertenece a otro mayorista");
    if (previousCode) {
      const previousQuotes = await redis(["HGET", QUOTES_KEY, previousCode]);
      await redis(["HDEL", DISTRIBUTORS_KEY, previousCode]);
      if (previousQuotes) {
        await redis(["HSET", QUOTES_KEY, code, previousQuotes]);
        await redis(["HDEL", QUOTES_KEY, previousCode]);
      }
    }
  }
  await redis(["HSET", DISTRIBUTORS_KEY, code, JSON.stringify(item)]);
  return item;
}

async function register(input) {
  const username = cleanUsername(input.username);
  const password = String(input.password || "");
  const name = String(input.name || "").trim().slice(0, 100);
  const phone = cleanPhone(input.phone);
  if (username.length < 4) throw new Error("El usuario debe tener al menos 4 caracteres");
  if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");
  if (!name) throw new Error("El nombre es obligatorio");
  if (phone.length < 8) throw new Error("El WhatsApp no es válido");
  if (await redis(["HGET", USERS_KEY, username])) throw new Error("Ese usuario ya está registrado");

  let code = newCode(name);
  while (await find(code)) code = newCode(name);
  const item = { code, name, phone, username, passwordHash: hashPassword(password), active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await redis(["HSET", DISTRIBUTORS_KEY, code, JSON.stringify(item)]);
  await redis(["HSET", USERS_KEY, username, code]);
  return item;
}

async function authenticate(usernameValue, password) {
  const username = cleanUsername(usernameValue);
  const code = await redis(["HGET", USERS_KEY, username]);
  const item = code ? await find(code) : null;
  if (!item || !item.active || !validPassword(password, item.passwordHash)) return null;
  return item;
}

async function updateOwnProfile(codeValue, input) {
  const item = await find(codeValue);
  if (!item || !item.active || !item.username) throw new Error("Cuenta no encontrada");
  const phone = cleanPhone(input.phone);
  if (phone.length < 8) throw new Error("El WhatsApp no es válido");
  const updated = { ...item, phone, updatedAt: new Date().toISOString() };
  if (input.password) {
    if (String(input.password).length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");
    updated.passwordHash = hashPassword(input.password);
  }
  await redis(["HSET", DISTRIBUTORS_KEY, item.code, JSON.stringify(updated)]);
  return updated;
}

async function registerQuote(code) {
  const item = await find(code);
  if (!item || !item.active) return false;
  await redis(["HINCRBY", QUOTES_KEY, item.code, 1]);
  return true;
}

module.exports = { cleanCode, find, list, save, registerQuote, register, authenticate, updateOwnProfile };
