const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "sd35",
    aliases: [],
    version: "1.4",
    author: "OPUSENSEI",
    countDown: 10,
    role: 0,
    shortDescription: "Generate image from Stable Diffusion 3.5",
    longDescription: "Replicate API with all required input values",
    category: "ai",
    guide: "{pn} your image prompt"
  },

  onStart: async function ({ api, event, args }) {
    const prompt = args.join(" ").trim();
    if (!prompt) {
      return api.sendMessage("⚠️ Please provide a prompt.", event.threadID, event.messageID);
    }

    api.setMessageReaction("⚡", event.messageID, () => {}, true);

    try {
      const replicateToken = "r8_BT9J6IArlicxl3PXo6YxeXVnna5ei0T1YobYk";
      const modelVersion = "4e0f010500e7c6cf9b2c7cfb39e933b76edb6553e662717d7c2956d6d56e6381";

      const prediction = await axios.post(
        "https://api.replicate.com/v1/predictions",
        {
          version: modelVersion,
          input: {
            prompt,
            refine: "expert_ensemble_refiner",
            scheduler: "K_EULER",
            guidance_scale: 7,
            width: 1024,
            height: 1024,
            num_outputs: 1
          }
        },
        {
          headers: {
            Authorization: `Token ${replicateToken}`,
            "Content-Type": "application/json"
          }
        }
      );

      const statusUrl = prediction.data.urls.get;
      let imageUrl = null;

      while (true) {
        const res = await axios.get(statusUrl, {
          headers: { Authorization: `Token ${replicateToken}` }
        });

        if (res.data.status === "succeeded") {
          imageUrl = res.data.output[0];
          break;
        } else if (res.data.status === "failed") {
          throw new Error("❌ Image generation failed.");
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
      const filePath = path.join(__dirname, "cache", `${Date.now()}.png`);
      await fs.outputFile(filePath, imgRes.data);

      api.sendMessage({
        body: `✅ Image for: "${prompt}"`,
        attachment: fs.createReadStream(filePath)
      }, event.threadID, event.messageID);

      api.setMessageReaction("🚀", event.messageID, () => {}, true);

    } catch (err) {
      console.error(err);
      api.sendMessage("❌ Error: " + err.message, event.threadID, event.messageID);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
    }
  }
};
 
