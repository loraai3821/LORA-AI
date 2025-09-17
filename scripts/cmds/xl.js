const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: 'xl',
    version: '1.0',
    author: "O P U",
    countDown: 10,
    role: 0,
    longDescription: { en: 'Generate an image from text using SDXL.' },
    category: 'ai',
    guide: { en: '{pn} prompt [--ar=<ratio>] or [--ar <ratio>]' }
  },

  onStart: async function ({ message, api, args, event, usersData }) {
    const cost = 50;

    if (!args[0]) {
      return message.reply(`😡 Please enter a text prompt\nExample: \n+xl a cat\n+xl a girl --ar 2:3`);
    }

    // Balance check
    const userData = await usersData.get(event.senderID);
    const balance = userData.money || 0;
    if (balance < cost) {
      return message.reply(`❌ | You need at least ${cost} coins.\n💰 Your balance: ${balance}`);
    }
    await usersData.set(event.senderID, { money: balance - cost });

    message.reply("💸 This cost 50 coins\n⏳ Generating image...");

    // Aspect ratio
    let ratio = "1:1";
    const ratioIndex = args.findIndex(arg => arg.startsWith("--ar="));
    if (ratioIndex !== -1) {
      ratio = args[ratioIndex].split("=")[1];
      args.splice(ratioIndex, 1);
    } else {
      const flagIndex = args.findIndex(arg => arg === "--ar");
      if (flagIndex !== -1 && args[flagIndex + 1]) {
        ratio = args[flagIndex + 1];
        args.splice(flagIndex, 2);
      }
    }

    const prompt = args.join(" ");
    const apiURL = `https://smfahim.xyz/xl31?prompt=${encodeURIComponent(prompt)}&ratio=${ratio}`;
    const startTime = Date.now();

    try {
      // Step 1: Call API
      const apiRes = await axios.get(apiURL);
      let imageUrl;

      if (apiRes.data.image) {
        // যদি JSON এর ভেতর image url থাকে
        imageUrl = apiRes.data.image;
      } else if (typeof apiRes.data === "string" && apiRes.data.startsWith("http")) {
        // যদি সরাসরি string link দেয়
        imageUrl = apiRes.data;
      } else {
        throw new Error("API did not return image link.");
      }

      // Step 2: Download image
      const res = await axios.get(imageUrl, { responseType: "arraybuffer" });

      const folder = path.join(__dirname, "cache");
      if (!fs.existsSync(folder)) fs.mkdirSync(folder);

      const filePath = path.join(folder, `${Date.now()}_xl.png`);
      fs.writeFileSync(filePath, res.data);

      const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

      await message.reply({
        body: `🖼️ Here is your image\n⏱️ Time taken: ${timeTaken} sec`,
        attachment: fs.createReadStream(filePath)
      });

      api.setMessageReaction("✅", event.messageID, () => {}, true);
    } catch (err) {
      console.error("XL gen error:", err.message || err);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply("❌ | Failed to generate image.");
    }
  }
};
