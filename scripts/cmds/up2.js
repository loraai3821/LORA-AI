const os = require("os");

module.exports = {
  config: {
    name: "up2",
    version: "4.0-up7",
    author: "Amit⚡Max | Mod by Opu",
    role: 0,
    shortDescription: { en: "Stylish uptime with loading animation" },
    longDescription: {
      en: "Displays stylish uptime with current time/date and animated loading."
    },
    category: "info",
    guide: { en: "{p}uptime" }
  },

  onStart: async function ({ api, event }) {
    const delay = ms => new Promise(res => setTimeout(res, ms));
    const loadStages = [
      "[ █░░░░░░░░░░░░░░ ]",
      "[ █████░░░░░░░░░░ ]",
      "[ █████████░░░░░░ ]",
      "[ █████████████░░ ]",
      "[ ███████████████ ]"
    ];

    try {
      const loading = await api.sendMessage("🪐 𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐁𝐨𝐭 𝐔𝐩𝐭𝐢𝐦𝐞...\n" + loadStages[0], event.threadID);

      for (let i = 1; i < loadStages.length; i++) {
        await delay(250);
        await api.editMessage(`🪐 𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐁𝐨𝐭 𝐔𝐩𝐭𝐢𝐦𝐞...\n${loadStages[i]}`, loading.messageID, event.threadID);
      }

      const memoryUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      const uptimeFormatted = `${days}d ${hours}h ${minutes}m ${seconds}s`;

      const now = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Dhaka",
        hour12: true
      });
      const [date, time] = now.split(", ");

      const finalMessage = `
🪐 𝐁𝐎𝐓 𝐔𝐏𝐓𝐈𝐌𝐄 𝐒𝐓𝐀𝐓𝐒 🪐

🕰️ ᴜᴘᴛɪᴍᴇ: ${uptimeFormatted}
🕓 ᴛɪᴍᴇ: ${time}
📆 ᴅᴀᴛᴇ: ${date}

💾 ʀᴀᴍ ᴜꜱᴀɢᴇ: ${memoryUsage} MB
🖥️ ᴏꜱ: ${os.platform()} (${os.arch()})
🛠️ ɴᴏᴅᴇ: ${process.version}
      `.trim();

      await delay(300);
      await api.editMessage(finalMessage, loading.messageID, event.threadID);

    } catch (err) {
      console.error("Uptime error:", err);
      api.sendMessage("❌ Ping problem, wait a moment and try again.", event.threadID);
    }
  }
};
