const axios = require('axios');
const { GoatWrapper } = require('fca-liane-utils');

module.exports = {
  config: {
    name: "flux",
    aliases: ["ff"],
    version: "1.6",
    author: "Samir Œ || Fixed By Opu",
    countDown: 5,
    role: 0,
    shortDescription: "Generate image using Fluxpro API",
    longDescription: "Generate high quality images via Fluxpro API",
    category: "ai",
    guide: {
      en: "{pn} <prompt> --ar 1:1"
    }
  },

  onStart: async function ({ message, args, event }) {
    const waitingMessage = await message.reply("⏳ Generating image with FluxPro...");

    let prompt = args.join(" ");
    let aspectRatio = "1:1";

    const arIndex = args.indexOf("--ar");
    if (arIndex !== -1 && args[arIndex + 1]) {
      aspectRatio = args[arIndex + 1];
      args.splice(arIndex, 2);
      prompt = args.join(" ");
    }

    try {
      // API কল
      const apiUrl = `https://www.samirxpikachu.run.place/fluxpro?prompt=${encodeURIComponent(prompt)}&ratio=${aspectRatio}`;
      const response = await axios.get(apiUrl);

      // যদি API সরাসরি image URL ফেরত দেয়
      let imageUrl;
      if (response.data?.url) {
        imageUrl = response.data.url;
      } else if (typeof response.data === "string" && response.data.startsWith("http")) {
        imageUrl = response.data;
      } else {
        throw new Error("Invalid API response, no image found.");
      }

      // Stream এ কনভার্ট
      const imageStream = await global.utils.getStreamFromURL(imageUrl);

      await message.unsend(waitingMessage.messageID);

      return message.reply({
        body: `✅ Generated Image for: "${prompt}"`,
        attachment: imageStream
      });
    } catch (error) {
      console.error("Flux Error:", error);
      await message.unsend(waitingMessage.messageID);
      return message.reply("❌ Failed to generate image. The API might be down.");
    }
  }
};

const wrapper = new GoatWrapper(module.exports);
wrapper.applyNoPrefix({ allowPrefix: true });
