const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "imagen",
    version: "1.0",
    author: "Amit Max ⚡",
    countDown: 5,
    role: 0,
    shortDescription: "Generate AI image using Oculux Imagen3 API",
    longDescription: "Generate an AI image using Oculux Imagen3 API.",
    category: "ai",
    guide: {
      en: "{pn} <prompt>",
    },
  },

  onStart: async function ({ api, event, args }) {
    const prompt = args.join(" ").trim();
    if (!prompt) {
      return api.sendMessage(
        "⚠️ Please provide a prompt.\nExample: imagen beautiful nature sunset",
        event.threadID,
        event.messageID
      );
    }

    
    api.setMessageReaction("🙎🏻", event.messageID, () => {}, true);

    
    api.sendMessage(
      "Generating your image, please wait... 🖌️",
      event.threadID,
      async (info) => {
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `https://api.oculux.xyz/api/imagen3?prompt=${encodedPrompt}`;
        const imgPath = path.join(__dirname, "cache", `imagen3_${event.senderID}.jpg`);

        try {
          const res = await axios.get(url, { responseType: "arraybuffer" });
          await fs.ensureDir(path.dirname(imgPath));
          await fs.writeFile(imgPath, res.data);

          api.sendMessage(
            {
              body: "Here is your image:",
              attachment: fs.createReadStream(imgPath),
            },
            event.threadID,
            () => {
              fs.unlinkSync(imgPath);
              api.unsendMessage(info.messageID);
            },
            event.messageID
          );
        } catch (err) {
          console.error("Image generation failed:", err);
          api.sendMessage(
            "❌ Failed to generate the image. Please try again later.",
            event.threadID,
            event.messageID
          );
        }
      }
    );
  },
};
