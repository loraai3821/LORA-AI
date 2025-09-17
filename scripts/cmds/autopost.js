module.exports.config = {
  name: "autopost",
  version: "3.0.0",
  description: "Autopost garden tracker with user scores, claim, shop, premium, trial and leaderboard system",
  usage: "autopost on/off/score/claim/status/buy [number]/trial [number]/shop",
  role: 0,
  author: 'Prince | Fixed by OPU',
  category: "utility"
};

let autoPostInterval = null;
let activeUsers = new Set();
let userScores = {};
let userNames = {};
let userPremiumStatus = {};

const freeTrialUsers = new Set();

const freeTrialShop = [
  { id: 1, name: "Basic Seed Pack", emoji: "🌱", price: 0 },
  { id: 2, name: "Simple Tool", emoji: "🛠️", price: 0 },
  { id: 3, name: "Common Egg", emoji: "🥚", price: 0 },
  { id: 4, name: "Starter Honey", emoji: "🍯", price: 0 },
  { id: 5, name: "Free Cosmetic", emoji: "🎨", price: 0 }
];

const premiumShop = [
  { id: 1, name: "Golden Trowel", emoji: "🛠️", price: 1500 },
  { id: 2, name: "Diamond Watering Can", emoji: "🚿", price: 2000 },
  { id: 3, name: "Platinum Seed Pack", emoji: "🌱", price: 2500 },
  { id: 4, name: "Exclusive Compost Bin", emoji: "🗑️", price: 1800 },
  { id: 5, name: "Rare Honey Jar", emoji: "🍯", price: 2200 },
  { id: 6, name: "Premium Garden Statue", emoji: "🗿", price: 3000 }
];

module.exports.onStart = async function ({ api, event, usersData }) {
  const args = event.body.split(" ").slice(1);
  const action = args[0];
  const userId = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;

  async function getUserName(id) {
    if (!userNames[id]) {
      try {
        const userInfo = await api.getUserInfo(id);
        userNames[id] = userInfo[id].name;
      } catch {
        userNames[id] = "Unknown";
      }
    }
    return userNames[id];
  }

  // ON command
  if (action === "on") {
    if (autoPostInterval) return api.sendMessage("⚠️ Autopost already running!", threadID, messageID);

    await getUserName(userId);
    activeUsers.add(userId);
    if (!userScores[userId]) userScores[userId] = 0;

    autoPostInterval = setInterval(async () => {
      const baseSeeds = [
        "- 🥕 Carrot: x14",
        "- 🍇 Grape: x1",
        "- 🍓 Strawberry: x5",
        "- 🌷 Orange Tulip: x24",
        "- 🍅 Tomato: x3",
        "- 🫐 Blueberry: x5",
        "- 🍎 Apple: x10",
        "- 🍌 Banana: x20"
      ];
      const selectedSeeds = baseSeeds.sort(() => 0.5 - Math.random()).slice(0, 5);

      let topUser = null;
      let maxScore = 0;
      for (const id of activeUsers) {
        if ((userScores[id] || 0) > maxScore) {
          maxScore = userScores[id];
          topUser = await getUserName(id);
        }
      }

      api.sendMessage(
        `🌱 Garden Update 🌱\n${selectedSeeds.join("\n")}\n\n👑 Top User: ${topUser || "None"} (${maxScore})`,
        threadID
      );
    }, 60000);

    return api.sendMessage("✅ Autopost started!", threadID, messageID);
  }

  // OFF command
  if (action === "off") {
    if (autoPostInterval) {
      clearInterval(autoPostInterval);
      autoPostInterval = null;
      return api.sendMessage("❌ Autopost stopped!", threadID, messageID);
    } else return api.sendMessage("⚠️ Autopost not running!", threadID, messageID);
  }

  // SCORE command
  if (action === "score") {
    const score = userScores[userId] || 0;
    return api.sendMessage(`📊 Your Score: ${score}`, threadID, messageID);
  }

  // CLAIM command
  if (action === "claim") {
    const reward = Math.floor(Math.random() * 500) + 100;
    userScores[userId] = (userScores[userId] || 0) + reward;

    const userData = await usersData.get(userId) || { money: 0 };
    const newMoney = (userData.money || 0) + reward;
    await usersData.set(userId, { money: newMoney });

    return api.sendMessage(`🎁 You claimed ${reward} coins!\n💰 Balance updated.`, threadID, messageID);
  }

  // STATUS command
  if (action === "status") {
    const score = userScores[userId] || 0;
    const premium = userPremiumStatus[userId] ? "✅ Yes" : "❌ No";
    return api.sendMessage(`📊 Status:\n⭐ Score: ${score}\n👑 Premium: ${premium}`, threadID, messageID);
  }

  // SHOP command
  if (action === "shop") {
    let shopMsg = "🛒 Premium Shop:\n";
    premiumShop.forEach(item => {
      shopMsg += `${item.id}. ${item.emoji} ${item.name} - ${item.price} coins\n`;
    });
    return api.sendMessage(shopMsg, threadID, messageID);
  }

  // BUY command
  if (action === "buy") {
    const itemId = parseInt(args[1]);
    if (!itemId || !premiumShop.find(i => i.id === itemId))
      return api.sendMessage("⚠️ Invalid item ID!", threadID, messageID);

    const item = premiumShop.find(i => i.id === itemId);
    const userData = await usersData.get(userId) || { money: 0 };
    if ((userData.money || 0) < item.price)
      return api.sendMessage("❌ Not enough coins!", threadID, messageID);

    await usersData.set(userId, { money: (userData.money || 0) - item.price });
    return api.sendMessage(`✅ You bought ${item.emoji} ${item.name}!`, threadID, messageID);
  }

  // TRIAL command
  if (action === "trial") {
    if (freeTrialUsers.has(userId))
      return api.sendMessage("⚠️ You already used free trial!", threadID, messageID);

    freeTrialUsers.add(userId);
    return api.sendMessage("🎉 Free trial activated! Enjoy premium benefits for 24h.", threadID, messageID);
  }
};
