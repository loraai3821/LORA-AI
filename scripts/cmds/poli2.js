const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "poli2",
    aliases: ["poligen"],
    version: "2.0",
    author: "opu-sense ",
    countDown: 10,
    role: 0,
    shortDescription: "Generate images using poli",
    longDescription: "Create AI-generated images with Pollination (ploi). Supports multiple images, negative prompts, and custom sizes.",
    category: "ai",
    guide: "{pn} <prompt> | --n <count> | --size <WxH> | --neg <negative prompt>"
  },

  onStart: async function ({ api, event, args }) {
    if (!args.length) {
      return api.sendMessage("⚠️ Please provide a prompt.\n\nExample:\n" +
        "sdxlgen futuristic cyberpunk city --n 2 --size 1024x1024 --neg blurry, low quality", 
        event.threadID, event.messageID);
    }

    // Default settings
    let prompt = args.join(" ");
    let count = 1;
    let size = "512x512";
    let negative = "";

    // Extract flags (--n, --size, --neg)
    const nMatch = prompt.match(/--n\s+(\d+)/);
    if (nMatch) {
      count = Math.min(parseInt(nMatch[1]), 4); // Max 4 images
      prompt = prompt.replace(nMatch[0], "");
    }

    const sizeMatch = prompt.match(/--size\s+(\d+x\d+)/);
    if (sizeMatch) {
      size = sizeMatch[1];
      prompt = prompt.replace(sizeMatch[0], "");
    }

    const negMatch = prompt.match(/--neg\s+([^|]+)/);
    if (negMatch) {
      negative = negMatch[1].trim();
      prompt = prompt.replace(negMatch[0], "");
    }

    prompt = prompt.trim();

    api.sendMessage(`🎨 Generating *${count}* SDXL image(s)...\n📝 Prompt: ${prompt}\n📐 Size: ${size}${negative ? `\n❌ Negative: ${negative}` : ""}`, event.threadID, event.messageID);

    try {
      const attachments = [];

      for (let i = 0; i < count; i++) {
        const apiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=sdxl&size=${size}${negative ? `&negative_prompt=${encodeURIComponent(negative)}` : ""}`;
        const imgPath = path.join(__dirname, "cache", `sdxl_${Date.now()}_${i}.png`);

        const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
        fs.writeFileSync(imgPath, Buffer.from(response.data, "binary"));
        attachments.push(fs.createReadStream(imgPath));
      }

      api.sendMessage({
        body: `✅ POLI Image(s) Generated!\n📝 Prompt: ${prompt}`,
        attachment: attachments
      }, event.threadID, () => {
        // Cleanup files
        attachments.forEach(att => fs.unlinkSync(att.path));
      }, event.messageID);

    } catch (error) {
      console.error(error);
      api.sendMessage("❌ Failed to generate image. Try again later.", event.threadID, event.messageID);
    }
  }
};
