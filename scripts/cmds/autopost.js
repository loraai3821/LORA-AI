odule.exports.config = {
  name: "autopost",
  version: "2.7.0",
  description: "Autopost garden tracker with user scores, bonuses, free trial shop, premium shop, and on/off/claim/status/buy commands",
  usage: "autopost on/off/score/claim [code]/status/buy [number]/trial [number]",
  role: 0,
  author: 'Prince',
  category: "utility"
};

let autoPostInterval = null;
let activeUsers = new Set(); // Set of active user IDs
let userScores = {}; // Simple in-memory storage for user scores
let userNames = {}; // Cache for user names
let userPremiumStatus = {}; // Tracks if user is premium

// Sample free trial users (simulate 5 users)
const freeTrialUsers = new Set(); // will store userIds of free trial users

// Free trial shop items (5 items)
const freeTrialShop = [
  { id: 1, name: "Basic Seed Pack", emoji: "🌱", price: 0 },
  { id: 2, name: "Simple Tool", emoji: "🛠️", price: 0 },
  { id: 3, name: "Common Egg", emoji: "🥚", price: 0 },
  { id: 4, name: "Starter Honey", emoji: "🍯", price: 0 },
  { id: 5, name: "Free Cosmetic", emoji: "🎨", price: 0 }
];

// Sample premium shop items (6 items with emojis)
const premiumShop = [
  { id: 1, name: "Golden Trowel", emoji: "🛠️", price: 1500 },
  { id: 2, name: "Diamond Watering Can", emoji: "🚿", price: 2000 },
  { id: 3, name: "Platinum Seed Pack", emoji: "🌱", price: 2500 },
  { id: 4, name: "Exclusive Compost Bin", emoji: "🗑️", price: 1800 },
  { id: 5, name: "Rare Honey Jar", emoji: "🍯", price: 2200 },
  { id: 6, name: "Premium Garden Statue", emoji: "🗿", price: 3000 }
];

module.exports.onStart = async function({ api, event, usersData }) {
  const args = event.body.slice(9).trim().split(' ');
  const action = args[0];
  const replyToId = event.messageID;
  const userId = event.senderID;

  // Helper to get user name
  async function getUserName(id) {
    if (!userNames[id]) {
      try {
        const userInfo = await api.getUserInfo(id);
        userNames[id] = userInfo[id].name;
      } catch {
        userNames[id] = 'Unknown';
      }
    }
    return userNames[id];
  }

  if (action === 'on') {
    if (autoPostInterval) {
      api.sendMessage('Autopost is already running!', event.threadID, replyToId);
      return;
    }
    // Add user to active if not already
    if (!activeUsers.has(userId)) {
      await getUserName(userId);
      activeUsers.add(userId);
      if (!userScores[userId]) userScores[userId] = 0;
    }

    autoPostInterval = setInterval(async () => {
      // Sample gear
      const gear = [
        '- Trading Ticket: x1',
        '- 🧴 Cleaning Spray: x1',
        '- 🛠️ Trowel: x3',
        '- 🔧 Recall Wrench: x3',
        '- 🚿 Watering Can: x3',
        '- ❤️ Favorite Tool: x2',
        '- 💧 Basic Sprinkler: x3',
        '- 🌾 Harvest Tool: x1'
      ];

      // Base seeds (random selection)
      const baseSeeds = [
        '- 🥕 Carrot: x14',
        '- 🍇 Grape: x1',
        '- 🍓 Strawberry: x5',
        '- 🌷 Orange Tulip: x24',
        '- 🍅 Tomato: x3',
        '- 🫐 Blueberry: x5',
        '- 🍎 Apple: x10',
        '- 🍌 Banana: x20'
      ];
      const shuffledSeeds = baseSeeds.sort(() => 0.5 - Math.random());
      const selectedSeeds = shuffledSeeds.slice(0, 6);

      // Eggs
      const eggs = [
        '- 🥚 Common Egg: x1',
        '- 🥚 Common Egg: x1',
        '- 🥚 Common Egg: x1'
      ];

      // Cosmetics
      const cosmetics = [
        '- Beach Crate: x2',
        '- Cabana: x1',
        '- Compost Bin: x1',
        '- Torch: x1',
        '- Long Stone Table: x1',
        '- Rock Pile: x1',
        '- Small Circle Tile: x5',
        '- Large Wood Table: x1',
        '- Bookshelf: x1'
      ];

      // Honey
      const honey = [
        '- Corrupt Radar: x1',
        '- Zen Seed Pack: x1',
        '- Sakura Bush: x1',
        '- Zenflare: x2',
        '- Tranquil Radar: x2'
      ];

      // Weather
      const weather = '⚡ Thunderstorm\n📋 Thunderstorm - Ends: 14:42 - Duration: 3 minutes\n+50% Grow Speed! Higher SHOCKED Fruit Chance!\n🎯 +50% growth; same Wet chance';

      // Calculate top user and average
      let topUser = null;
      let maxScore = 0;
      let totalScore = 0;
      let count = 0;
      let winnerAnnouncement = '';
      for (const id of activeUsers) {
        const score = userScores[id] || 0;
        totalScore += score;
        count++;
        if (score > maxScore) {
          maxScore = score;
          topUser = userNames[id] || 'Unknown';
        }
      }
      const averageScore = count > 0 ? (totalScore / count).toFixed(2) : 0;
      const averagePercent = count > 0 ? ((totalScore / (count * 100)) * 100).toFixed(2) + '%' : '0%'; // Assuming max score is 100 for percent

      // Check for winner award
      if (maxScore >= 23000) {
        const topUserId = Array.from(activeUsers).find(id => userNames[id] === topUser);
        if (topUserId) {
          const userData = await usersData.get(topUserId) || { money: 0 };
          const newMoney = (userD
