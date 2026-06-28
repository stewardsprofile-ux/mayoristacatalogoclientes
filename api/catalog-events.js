const RANKING_KEY = "elite:catalog:quote-ranking:v1";
const MAX_FIELD_LENGTH = 500;
const requestLog = new Map();

function redisConfig() {
  return {
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  };
}

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

function withinRateLimit(req) {
  const ip = clientIp(req);
  const now = Date.now();
  const recent = (requestLog.get(ip) || []).filter(time => now - time < 60_000);
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length <= 40;
}

function clean(value, max = MAX_FIELD_LENGTH) {
  return String(value || "").trim().slice(0, max);
}

async function redis(command) {
  const { url, token } = redisConfig();
  if (!url || !token) throw new Error("Redis no configurado");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });

  if (!response.ok) throw new Error(`Redis respondio ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error);
  return payload.result;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { url, token } = redisConfig();
  if (!url || !token) {
    return res.status(503).json({ configured: false, ranking: [] });
  }

  try {
    if (req.method === "POST") {
      if (!withinRateLimit(req)) return res.status(429).json({ error: "Demasiadas solicitudes" });

      const product = {
        Title: clean(req.body?.Title, 180),
        Image: clean(req.body?.Image),
        marca: clean(req.body?.marca, 100)
      };

      if (!product.Title || !product.Image) {
        return res.status(400).json({ error: "Producto invalido" });
      }

      await redis(["ZINCRBY", RANKING_KEY, 1, JSON.stringify(product)]);
      return res.status(200).json({ ok: true });
    }

    if (req.method === "GET") {
      const raw = await redis(["ZREVRANGE", RANKING_KEY, 0, 7, "WITHSCORES"]);
      const ranking = [];

      for (let index = 0; index < raw.length; index += 2) {
        try {
          ranking.push({ ...JSON.parse(raw[index]), clicks: Number(raw[index + 1]) || 0 });
        } catch {
          // Ignora entradas antiguas o corruptas sin romper el ranking.
        }
      }

      return res.status(200).json({ configured: true, ranking });
    }

    return res.status(405).json({ error: "Metodo no permitido" });
  } catch (error) {
    console.error("Error en ranking de catalogo:", error);
    return res.status(500).json({ error: "No se pudo procesar el ranking" });
  }
};
