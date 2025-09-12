const axios = require('axios');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function createImageGrid(urls) {
  const images = await Promise.all(urls.map(url => loadImage(url)));
  const maxWidth = Math.max(...images.map(img => img.width));
  const maxHeight = Math.max(...images.map(img => img.height));

  const canvas = createCanvas(maxWidth * 2, maxHeight * 2);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(images[0], 0, 0, maxWidth, maxHeight);
  ctx.drawImage(images[1], maxWidth, 0, maxWidth, maxHeight);
  ctx.drawImage(images[2], 0, maxHeight, maxWidth, maxHeight);
  ctx.drawImage(images[3], maxWidth, maxHeight, maxWidth, maxHeight);

  return canvas.toBuffer('image/jpeg');
}

const baseApiUrl = async () => {
  const base = await axios.get(`https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json`);
  return base.data.api;
};

module.exports = {
  config: {
    name: "dalle2",
    aliases: ["bing2", "create2", "imagine2"],
    version: "2.1",
    author: "dipto | mod by Opu",
    countDown: 15,
    role: 0,
    description: "Génère une image DALL·E combinée avec sélection 1 à 4",
    category: "ai",
    guide: { en: "{pn} [prompt]" }
  },

  onStart: async function ({ api, event, args }) {
    const prompt = (event.messageReply?.body.split("dalle")[1] || args.join(" ")).trim();
    if (!prompt) return api.sendMessage("❌ Fournis un prompt.\n✅ Exemple: /dalle a futuristic robot cat DJ in Tokyo", event.threadID, event.messageID);

    const wait = await api.sendMessage("⏳ Génération des images...", event.threadID);

    try {
      const response = await axios.get(`${await baseApiUrl()}/dalle?prompt=${encodeURIComponent(prompt)}&key=dipto008`);
      const imageUrls = response.data.imgUrls || [];

      if (imageUrls.length < 4) {
        await api.unsendMessage(wait.messageID);
        return api.sendMessage("❌ Pas assez d'images générées (minimum 4 requises).", event.threadID);
      }

      const gridBuffer = await createImageGrid(imageUrls.slice(0, 4));
      const gridPath = `dalle_grid_${event.threadID}.jpg`;
      fs.writeFileSync(gridPath, gridBuffer);

      const msg = await api.sendMessage({
        body: "✅ Voici les 4 variantes.\nRéponds avec 1, 2, 3 ou 4 pour choisir une version.",
        attachment: fs.createReadStream(gridPath)
      }, event.threadID);

      global.GoatBot.onReply.set(msg.messageID, {
        commandName: "dalle",
        author: event.senderID,
        imageUrls
      });

      setTimeout(() => fs.unlink(gridPath, () => {}), 60000);
      await api.unsendMessage(wait.messageID);

    } catch (error) {
      console.error(error);
      await api.unsendMessage(wait.messageID);
      api.sendMessage(`❌ Erreur : ${error.message}`, event.threadID);
    }
  },

  onReply: async function ({ api, event, Reply }) {
    const { author, imageUrls } = Reply;
    if (event.senderID !== author) return;

    const choice = event.body.trim();
    if (!["1", "2", "3", "4"].includes(choice)) {
      return api.sendMessage("❌ Choix invalide. Réponds avec 1, 2, 3 ou 4.", event.threadID);
    }

    const index = parseInt(choice) - 1;
    const url = imageUrls[index];
    const path = `dalle_selected_${choice}_${event.threadID}.jpg`;

    try {
      const res = await axios.get(url, { responseType: 'stream' });
      const writer = fs.createWriteStream(path);

      res.data.pipe(writer);
      writer.on('finish', () => {
        api.sendMessage({
          body: `🖼 Voici la version ${choice}`,
          attachment: fs.createReadStream(path)
        }, event.threadID, () => {
          fs.unlink(path, () => {});
        });
      });

    } catch (err) {
      console.error(err);
      api.sendMessage("❌ Impossible de récupérer l'image.", event.threadID);
    }
  }
};
