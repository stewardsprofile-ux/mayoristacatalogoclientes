const crypto = require("crypto");

const DISTRIBUTORS_KEY = "elite:distributors:v1";
const QUOTES_KEY = "elite:distributor-quotes:v1";

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
      items.push({ ...item, quotes: quotes.get(item.code) || 0 });
    } catch {}
  }
  return items.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

async function save(input) {
  const previousCode = cleanCode(input.previousCode);
  const code = cleanCode(input.code) || newCode(input.name);
  const item = {
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

async function registerQuote(code) {
  const item = await find(code);
  if (!item || !item.active) return false;
  await redis(["HINCRBY", QUOTES_KEY, item.code, 1]);
  return true;
}

module.exports = { cleanCode, find, list, save, registerQuote };
