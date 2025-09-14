const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

/**
 * Creates a 2x2 image grid from an array of 4 image URLs.
 * @param {string[]} urls - An array of 4 image URLs.
 * @returns {Promise<Buffer>} A Promise that resolves with the image buffer (JPEG).
 */
async function createImageGrid(urls) {
  const images = await Promise.all(urls.map(url => loadImage(url)));
  const maxWidth = Math.max(...images.map(img => img.width));
  const maxHeight = Math.max(...images.map(img => img.height));
  const canvas = createCanvas(maxWidth * 2, maxHeight * 2);
  const ctx = canvas.getContext('2d');

  // Draw images in a 2x2 grid
  ctx.drawImage(images[0], 0, 0, maxWidth, maxHeight);
  ctx.drawImage(images[1], maxWidth, 0, maxWidth, maxHeight);
  ctx.drawImage(images[2], 0, maxHeight, maxWidth, maxHeight);
  ctx.drawImage(images[3], maxWidth, maxHeight, maxWidth, maxHeight);

  return canvas.toBuffer('image/jpeg');
}

module.exports = {
  config: {
    name: "dalle",
    aliases: ["bing", "create", "imagine"],
    version: "2.2",
    author: "dipto | mod by Opu & Gemini",
    countDown: 25, // Increased countdown as AI generation can be slow
    role: 0,
    description: "Create 4 images using DALL·E and choose one.",
    category: "ai",
    guide: {
      en: "{pn} a futuristic robot cat DJ in Tokyo"
    }
  },

  onStart: async function ({ api, event, args }) {
    const prompt = (event.messageReply?.body.split("dalle")[1] || args.join(" ")).trim();
    if (!prompt) {
      return api.sendMessage("❌ Please provide a prompt.\n✅ Example: /dalle a cat wearing sunglasses", event.threadID, event.messageID);
    }

    let waitMessage;
    try {
      waitMessage = await api.sendMessage("⏳ Your image is being created, please wait...", event.threadID);

      // API URL is used directly for stability
      const apiUrl = `https://www.noobs-api.000.pe/dalle?prompt=${encodeURIComponent(prompt)}&key=dipto008`;
      
      const response = await axios.get(apiUrl, { timeout: 60000 }); // 60-second timeout

      if (!response.data || !Array.isArray(response.data.imgUrls) || response.data.imgUrls.length === 0) {
        await api.unsendMessage(waitMessage.messageID);
        return api.sendMessage("❌ Sorry, no images were received from the API. Please try again later.", event.threadID);
      }

      const imageUrls = response.data.imgUrls;
      if (imageUrls.length < 4) {
        await api.unsendMessage(waitMessage.messageID);
        return api.sendMessage(`❌ Sorry, only ${imageUrls.length} image(s) could be created. 4 are needed to create a grid.`, event.threadID);
      }

      const gridBuffer = await createImageGrid(imageUrls.slice(0, 4));

      // Save the file in the cache folder
      const cacheDir = path.join(__dirname, 'cache');
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir);
      }
      const gridPath = path.join(cacheDir, `dalle_grid_${Date.now()}.jpg`);
      fs.writeFileSync(gridPath, gridBuffer);

      const msg = await api.sendMessage({
        body: "✅ Here are the 4 images.\nReply with 1, 2, 3, or 4 to get your chosen image.",
        attachment: fs.createReadStream(gridPath)
      }, event.threadID);

      await api.unsendMessage(waitMessage.messageID);

      global.GoatBot.onReply.set(msg.messageID, {
        commandName: this.config.name,
        author: event.senderID,
        messageID: msg.messageID,
        imageUrls
      });

      // Timer to delete the file
      setTimeout(() => {
        if (fs.existsSync(gridPath)) {
          fs.unlink(gridPath, (err) => {
            if (err) console.error("Error deleting grid file:", err);
          });
        }
      }, 60000); // Deletes after 60 seconds

    } catch (error) {
      if (waitMessage) await api.unsendMessage(waitMessage.messageID);
      console.error("DALL-E Command Error:", error);
      let errorMessage = "❌ An unknown error occurred while creating the image.";
      if (error.response) {
        errorMessage = "❌ An error occurred from the image generation service. Please try again later.";
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "❌ Connection to the image generation server timed out. Please try again later.";
      }
      api.sendMessage(errorMessage, event.threadID);
    }
  },

  onReply: async function ({ api, event, Reply }) {
    if (event.senderID !== Reply.author) return;

    const choice = event.body.trim();
    if (!["1", "2", "3", "4"].includes(choice)) {
      return api.sendMessage("❌ Invalid input. Please reply with 1, 2, 3, or 4.", event.threadID);
    }

    // Deactivate the reply handler after one use
    global.GoatBot.onReply.delete(Reply.messageID);
    let waitReply;
    try {
      waitReply = await api.sendMessage("⏳ Downloading your selected image...", event.threadID);
      const index = parseInt(choice) - 1;
      const url = Reply.imageUrls[index];

      const imageResponse = await axios.get(url, { responseType: 'arraybuffer' });
      const cacheDir = path.join(__dirname, 'cache');
      const selectedPath = path.join(cacheDir, `dalle_selected_${Date.now()}.jpg`);
      fs.writeFileSync(selectedPath, imageResponse.data);

      await api.sendMessage({
        body: `🖼️ Here is your selected version ${choice}.`,
        attachment: fs.createReadStream(selectedPath)
      }, event.threadID);

      await api.unsendMessage(waitReply.messageID);
      
      // Delete the file after use
      if (fs.existsSync(selectedPath)) {
        fs.unlink(selectedPath, (err) => {
          if (err) console.error("Error deleting selected image file:", err);
        });
      }
    } catch (err) {
      if (waitReply) await api.unsendMessage(waitReply.messageID);
      console.error("DALL-E Reply Error:", err);
      api.sendMessage("❌ Failed to download the selected image.", event.threadID);
    }
  }
};
