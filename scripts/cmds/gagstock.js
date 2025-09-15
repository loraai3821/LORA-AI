const { sendMessage } = require("../handles/sendMessage");
const WebSocket = require("ws");
const axios = require("axios");

const activeSessions = new Map();
const lastSentCache = new Map();
const favoriteMap = new Map();
const globalLastSeen = new Map();

let sharedWebSocket = null;
let keepAliveInterval = null;
let connecting = false;

function formatValue(val) {
  if (val >= 1_000_000) return `x${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `x${(val / 1_000).toFixed(1)}K`;
  return `x${val}`;
}

function getPHTime() {
  // PH timezone (Asia/Manila)
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

function getTimeAgo(date) {
  if (!date) return "Unknown";
  const now = getPHTime();
  const diff = now - new Date(date);
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);

  if (sec < 60) return `${sec}s ago`;
  if (min < 60) return `${min}m ago`;
  if (hour < 24) return `${hour}h ago`;
  return `${day}d ago`;
}

function formatItems(items, useEmoji = true) {
  if (!Array.isArray(items)) return "";
  return items
    .filter(i => i && typeof i.quantity === "number" && i.quantity > 0)
    .map(i => `- ${useEmoji && i.emoji ? i.emoji + " " : ""}${i.name}: ${formatValue(i.quantity)}`)
    .join("\n");
}

function cleanText(text) {
  if (!text) return "";
  return String(text).trim().toLowerCase();
}

function updateLastSeen(category, items) {
  if (!Array.isArray(items)) return;
  if (!globalLastSeen.has(category)) globalLastSeen.set(category, new Map());
  const catMap = globalLastSeen.get(category);
  const now = getPHTime();
  for (const item of items) {
    if (item && typeof item.quantity === "number" && item.quantity > 0 && item.name) {
      catMap.set(cleanText(item.name), now);
    }
  }
}

function safeJsonStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

function ensureWebSocketConnection() {
  if (connecting) return;
  if (sharedWebSocket && sharedWebSocket.readyState === WebSocket.OPEN) return;

  connecting = true;
  sharedWebSocket = new WebSocket("wss://gagstock.gleeze.com");

  sharedWebSocket.on("open", () => {
    connecting = false;
    // clear any old interval first
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
    keepAliveInterval = setInterval(() => {
      try {
        if (sharedWebSocket && sharedWebSocket.readyState === WebSocket.OPEN) {
          sharedWebSocket.send("ping");
        }
      } catch (err) {
        console.error("Ping error:", err);
      }
    }, 10000);
    console.log("[gagstock] websocket opened");
  });

  sharedWebSocket.on("message", async (data) => {
    try {
      let payload;
      try {
        payload = JSON.parse(data);
      } catch (err) {
        console.warn("[gagstock] non-json message received:", data);
        return;
      }

      if (payload.status !== "success" || !payload.data) return;

      const stock = payload.data;

      // normalize sections with defaults
      const stockData = {
        gear: stock.gear || { items: [] , countdown: stock.gear?.countdown },
        seed: stock.seed || { items: [] , countdown: stock.seed?.countdown },
        egg: stock.egg || { items: [], countdown: stock.egg?.countdown },
        cosmetics: stock.cosmetics || { items: [] , countdown: stock.cosmetics?.countdown },
        event: stock.honey || { items: [] , countdown: stock.honey?.countdown },
        travelingmerchant: stock.travelingmerchant || { items: [], appearIn: stock.travelingmerchant?.appearIn }
      };

      // Update last seen
      updateLastSeen("gear", stockData.gear.items);
      updateLastSeen("seed", stockData.seed.items);
      updateLastSeen("egg", stockData.egg.items);
      updateLastSeen("cosmetics", stockData.cosmetics.items);
      updateLastSeen("event", stockData.event.items);
      updateLastSeen("travelingmerchant", stockData.travelingmerchant.items);

      // For each active session, compose and send message
      for (const [senderId, session] of activeSessions.entries()) {
        try {
          const favList = Array.isArray(favoriteMap.get(senderId)) ? favoriteMap.get(senderId) : [];
          const sections = [];
          let matchCount = 0;

          function checkAndAdd(label, section, useEmoji, altCountdown = null) {
            const items = Array.isArray(section?.items) ? section.items.filter(i => i && typeof i.quantity === "number" && i.quantity > 0) : [];
            if (items.length === 0) return false;

            const matchedItems = favList.length > 0
              ? items.filter(i => favList.includes(cleanText(i.name)))
              : items;

            if (favList.length > 0 && matchedItems.length === 0) return false;

            matchCount += matchedItems.length;

            const restockLabel = section.countdown || altCountdown;
            const formattedItems = formatItems(matchedItems, useEmoji);
            const block = `${label}:\n${formattedItems}${restockLabel ? `\n⏳ Restock In: ${restockLabel}` : ""}`;
            sections.push(block);
            return true;
          }

          checkAndAdd("🛠️ 𝗚𝗲𝗮𝗿", stockData.gear, true);
          checkAndAdd("🌱 𝗦𝗲𝗲𝗱𝘀", stockData.seed, true);
          checkAndAdd("🥚 𝗘𝗴𝗴𝘀", stockData.egg, true);
          checkAndAdd("🎨 𝗖𝗼𝘀𝗺𝗲𝘁𝗶𝗰𝘀", stockData.cosmetics, false);
          checkAndAdd("🎉 𝗘𝘃𝗲𝗻𝘁", stockData.event, false);
          checkAndAdd("🚚 𝗧𝗿𝗮𝘃𝗲𝗹𝗶𝗻𝗴 𝗠𝗲𝗿𝗰𝗵𝗮𝗻𝘁", stockData.travelingmerchant, false, stockData.travelingmerchant.appearIn);

          if (favList.length > 0 && matchCount === 0) continue;
          if (sections.length === 0) continue;

          const updatedAt = getPHTime().toLocaleString("en-PH", {
            hour: "numeric", minute: "numeric", second: "numeric",
            hour12: true, day: "2-digit", month: "short", year: "numeric"
          });

          // Weather fetch (safe)
          let weatherInfo = "";
          try {
            const wres = await axios.get("https://growagardenstock.com/api/stock/weather", { timeout: 4000 });
            const weather = wres?.data;
            if (weather) {
              weatherInfo = `🌤️ 𝗪𝗲𝗮𝘁𝗵𝗲𝗿: ${weather.icon || ""} ${weather.weatherType || ""}\n📋 ${weather.description || ""}\n🎯 ${weather.cropBonuses || ""}\n`;
            }
          } catch (err) {
            // ignore weather errors
          }

          const title = favList.length > 0
            ? `♥️ ${matchCount} Favorite item${matchCount > 1 ? "s" : ""} Found!`
            : "🌾 Grow A Garden — Tracker";

          const messageKey = safeJsonStringify({ title, sections, weatherInfo, updatedAt });

          const lastSent = lastSentCache.get(senderId);
          if (lastSent === messageKey) continue; // already sent same

          lastSentCache.set(senderId, messageKey);

          // sendMessage might throw; handle per session
          try {
            await sendMessage(senderId, {
              text: `${title}\n\n${sections.join("\n\n")}\n\n${weatherInfo}📅 Updated at (PH): ${updatedAt}`
            }, session.pageAccessToken);
            // small delay to reduce burst risk if many sessions
            await new Promise(res => setTimeout(res, 120));
          } catch (err) {
            console.error(`[gagstock] sendMessage failed for ${senderId}:`, err?.message || err);
          }
        } catch (err) {
          console.error("[gagstock] per-session processing error:", err?.message || err);
        }
      }
    } catch (err) {
      console.error("[gagstock] websocket message handler error:", err?.message || err);
    }
  });

  sharedWebSocket.on("close", (code, reason) => {
    console.warn(`[gagstock] websocket closed: ${code} ${reason}`);
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    sharedWebSocket = null;
    connecting = false;
    // reconnect with backoff
    setTimeout(ensureWebSocketConnection, 3000);
  });

  sharedWebSocket.on("error", (err) => {
    console.error("[gagstock] websocket error:", err?.message || err);
    // close to trigger reconnect logic
    try { sharedWebSocket.close(); } catch {}
  });
}

async function fetchPredict(params) {
  try {
    const res = await axios.get("https://gagstock.gleeze.com/predict", { params, timeout: 6000 });
    if (res && res.data && res.data.status === "success" && res.data.data) return res.data.data;
  } catch (err) {
    console.error("[gagstock] predict fetch error:", err?.message || err);
  }
  return null;
}

function formatPredictData(data, filters = []) {
  if (!data) return "⚠️ Failed to fetch predictions.";

  const cats = ["seed", "gear", "egg"];
  let selectedCats = cats;
  if (Array.isArray(filters) && filters.length > 0) {
    selectedCats = filters.filter(c => cats.includes(c));
  }

  const lines = [];
  for (const cat of selectedCats) {
    if (!data[cat] || !Array.isArray(data[cat])) continue;
    if (data[cat].length === 0) continue;

    lines.push(`🔹 ${cat.toUpperCase()} (${data[cat].length})`);
    for (const item of data[cat]) {
      const showTime = item?.showTime || "Unknown";
      lines.push(`- ${item.name}: ${showTime}`);
    }
    lines.push("");
  }

  if (lines.length === 0) return "⚠️ No predictions found for the specified filters.";
  return lines.join("\n").trim();
}

module.exports = {
  name: "gagstock",
  description: "Track Grow A Garden stock with favorites, shared WebSocket, global lastseen and gagstock predict support.",
  usage: "gagstock on | gagstock off | gagstock fav add Item1 | gagstock lastseen gear | gagstock predict",
  category: "Tools ⚒️",

  async execute(senderId, args, pageAccessToken) {
    const subcmd = args[0]?.toLowerCase();

    if (subcmd === "fav") {
      const action = args[1]?.toLowerCase();
      const input = args.slice(2).join(" ").split("|").map(i => cleanText(i)).filter(Boolean);
      if (!action || !["add", "remove"].includes(action) || input.length === 0) {
        return sendMessage(senderId, { text: "📌 Usage: gagstock fav add/remove Item1 | Item2" }, pageAccessToken);
      }
      const currentFav = favoriteMap.get(senderId) || [];
      const updated = new Set(currentFav);
      for (const name of input) {
        if (action === "add") updated.add(name);
        else if (action === "remove") updated.delete(name);
      }
      favoriteMap.set(senderId, Array.from(updated));
      return sendMessage(senderId, { text: `✅ Favorite list updated: ${Array.from(updated).join(", ") || "(empty)"}` }, pageAccessToken);
    }

    if (subcmd === "lastseen") {
      const filters = args.slice(1).join(" ").split("|").map(c => c.trim().toLowerCase()).filter(Boolean);
      const categories = filters.length > 0 ? filters : ["gear", "seed", "egg", "cosmetics", "event", "travelingmerchant"];

      let result = [];
      for (const cat of categories) {
        const entries = globalLastSeen.get(cat);
        if (!entries || entries.size === 0) continue;

        const list = Array.from(entries.entries())
          .sort((a, b) => new Date(b[1]) - new Date(a[1]))
          .map(([name, date]) => `• ${name}: ${getTimeAgo(date)}`);

        result.push(`🔹 ${cat.toUpperCase()} (${list.length})\n${list.join("\n")}`);
      }

      if (result.length === 0) {
        return sendMessage(senderId, { text: "⚠️ No last seen data found for the selected category." }, pageAccessToken);
      }

      return sendMessage(senderId, { text: `📦 Last Seen Items\n\n${result.join("\n\n")}` }, pageAccessToken);
    }

    if (subcmd === "off") {
      if (!activeSessions.has(senderId)) {
        return sendMessage(senderId, { text: "⚠️ You don't have an active gagstock session." }, pageAccessToken);
      }
      activeSessions.delete(senderId);
      lastSentCache.delete(senderId);
      return sendMessage(senderId, { text: "🛑 Gagstock tracking stopped." }, pageAccessToken);
    }

    if (subcmd === "predict") {
      const inputFilters = args.slice(1).join(" ").split("|").map(i => cleanText(i)).filter(Boolean);

      const allowedTypes = ["seed", "gear", "egg"];
      const filters = [];
      const items = [];

      for (const f of inputFilters) {
        if (allowedTypes.includes(f)) filters.push(f);
        else items.push(f);
      }

      let query = "";
      if (filters.length === 0 && items.length === 0) {
        query = "seed|gear|egg";
      } else {
        const parts = [];
        if (filters.length > 0) parts.push(filters.join("|"));
        if (items.length > 0) parts.push(items.join("|"));
        query = parts.join("|");
      }

      const data = await fetchPredict({ q: query });
      if (!data) return sendMessage(senderId, { text: "⚠️ Failed to fetch predictions from API." }, pageAccessToken);

      if (items.length > 0) {
        for (const cat of ["seed", "gear", "egg"]) {
          if (data[cat]) {
            data[cat] = data[cat].filter(i => items.includes(cleanText(i.name)));
          }
        }
      }

      if (filters.length > 0) {
        for (const cat of ["seed", "gear", "egg"]) {
          if (!filters.includes(cat)) data[cat] = [];
        }
      }

      const formatted = formatPredictData(data, filters.length > 0 ? filters : ["seed", "gear", "egg"]);
      return sendMessage(senderId, { text: formatted }, pageAccessToken);
    }

    if (subcmd !== "on") {
      return sendMessage(senderId, {
        text: "📌 Usage:\n• gagstock on\n• gagstock fav add Carrot | Watering Can\n• gagstock lastseen gear | seed\n• gagstock predict\n• gagstock off"
      }, pageAccessToken);
    }

    if (activeSessions.has(senderId)) {
      return sendMessage(senderId, { text: "📡 You're already tracking Gagstock. Use gagstock off to stop." }, pageAccessToken);
    }

    activeSessions.set(senderId, { pageAccessToken });
    await sendMessage(senderId, { text: "✅ Gagstock tracking started via WebSocket!" }, pageAccessToken);
    ensureWebSocketConnection();
  }
};
