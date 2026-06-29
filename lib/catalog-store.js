const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const OVERRIDES_KEY = "elite:catalog:admin-overrides:v1";

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

function productId(product) {
  return product.id || crypto.createHash("sha1").update(`${product.Title || ""}|${product.Image || ""}`).digest("hex").slice(0, 16);
}

function baseCatalog() {
  const items = JSON.parse(fs.readFileSync(path.join(process.cwd(), "perfumes.json"), "utf8"));
  return items.map(item => ({ ...item, id: productId(item), source: "base" }));
}

async function overrides() {
  const { url, token } = config();
  if (!url || !token) return new Map();
  const raw = await redis(["HGETALL", OVERRIDES_KEY]);
  const map = new Map();
  for (let i = 0; i < (raw || []).length; i += 2) {
    try { map.set(raw[i], JSON.parse(raw[i + 1])); } catch {}
  }
  return map;
}

async function catalog({ includeDeleted = false } = {}) {
  const base = baseCatalog();
  const changes = await overrides();
  const merged = base.map(item => changes.has(item.id) ? { ...item, ...changes.get(item.id), id: item.id } : item);
  const baseIds = new Set(base.map(item => item.id));
  changes.forEach((item, id) => { if (!baseIds.has(id)) merged.unshift({ ...item, id, source: "admin" }); });
  return includeDeleted ? merged : merged.filter(item => !item.deleted);
}

async function save(product) {
  const id = productId(product);
  const clean = {
    id,
    Title: String(product.Title || "").trim().slice(0, 180),
    Image: String(product.Image || "").trim().slice(0, 800),
    marca: String(product.marca || "Otros").trim().slice(0, 100),
    categoria: String(product.categoria || "Unisex").trim().slice(0, 80),
    tipo: String(product.tipo || product.categoria || "Unisex").trim().slice(0, 80),
    descripcion: String(product.descripcion || "").trim().slice(0, 1200),
    entregaInmediata: Boolean(product.entregaInmediata),
    deleted: Boolean(product.deleted),
    updatedAt: new Date().toISOString()
  };
  if (!clean.Title || !clean.Image) throw new Error("Nombre e imagen son obligatorios");
  await redis(["HSET", OVERRIDES_KEY, id, JSON.stringify(clean)]);
  return clean;
}

module.exports = { catalog, save, productId };
