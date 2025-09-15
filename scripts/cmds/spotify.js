const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { shorten } = require("tinyurl");

function formatSize(bytes) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Byte";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
}

module.exports = {
  config: {
    name: "spotify",
    aliases: ["sing", "chante"],
    version: "2.1",
    author: "opu",
    countDown: 10,
    role: 0,
    longDescription: "Télécharger des chansons Spotify avec la nouvelle API.",
    category: "media",
    guide: { en: "{pn} <nom_de_la_chanson>" },
  },

  onStart: async function ({ api, event, args, message }) {
    const query = args.join(" ");
    if (!query) {
      return message.reply("Veuillez entrer le nom d'une chanson !");
    }

    const apiUrl = `https://zetbot-page.onrender.com/api/spotify?search=${encodeURIComponent(query)}`;

    try {
      const response = await axios.get(apiUrl);

      if (!response.data.status || response.data.tracks.length === 0) {
        return message.reply("Aucune chanson trouvée pour cette recherche.");
      }

      const tracksData = response.data.tracks;
      const trackInfo = tracksData
        .map(
          (track, index) =>
            `${index + 1}. ${track.track.name}\nAlbum : ${track.track.album}\nArtistes : ${track.track.artists.join(", ")}\nDurée : ${track.track.duration_ms}`
        )
        .join("\n\n");

      const thumbnails = tracksData.map((track) => track.track.album_image);
      const attachments = await Promise.all(
        thumbnails.map((thumbnail) =>
          global.utils.getStreamFromURL(thumbnail)
        )
      );

      const replyMessage = await message.reply({
        body: `${trackInfo}\n\nRépondez avec le numéro de votre choix pour télécharger.`,
        attachment: attachments,
      });

      const data = {
        commandName: this.config.name,
        messageID: replyMessage.messageID,
        tracks: tracksData,
      };
      global.GoatBot.onReply.set(replyMessage.messageID, data);
    } catch (error) {
      console.error(error);
      message.reply("Une erreur est survenue lors de la recherche.");
    }
  },

  onReply: async function ({ api, event, Reply, args, message }) {
    const userInput = args[0].toLowerCase();
    const { tracks } = Reply;

    if (!isNaN(userInput) && userInput >= 1 && userInput <= tracks.length) {
      const selectedTrack = tracks[userInput - 1];
      message.unsend(Reply.messageID);

      const downloadingMessage = await message.reply("🎵 Téléchargement de la chanson en cours...");

      try {
        const downloadUrl = selectedTrack.download.download_url;

        // Générer un lien TinyURL pour le téléchargement
        const shortenedUrl = await shorten(downloadUrl);

        const audioResponse = await axios.get(downloadUrl, { responseType: "arraybuffer" });

        const cacheDir = path.join(__dirname, "cache");
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir);
        }

        const filePath = path.join(cacheDir, "spotify.mp3");
        fs.writeFileSync(filePath, Buffer.from(audioResponse.data));

        const fileSize = fs.statSync(filePath).size;
        const sizeFormatted = formatSize(fileSize);
        const attachment = fs.createReadStream(filePath);

        const form = {
          body: `🎵 Titre : ${selectedTrack.track.name}\n📀 Album : ${selectedTrack.track.album}\n👤 Artistes : ${selectedTrack.track.artists.join(", ")}\n📅 Date de sortie : ${selectedTrack.track.release_date}\n📦 Taille : ${sizeFormatted}`,
          attachment: attachment,
        };

        await message.reply(form);

        // Envoyer le lien de téléchargement TinyURL
        await message.reply(`🔗 Lien de téléchargement direct : ${shortenedUrl}`);
      } catch (error) {
        console.error(error);
        message.reply("Une erreur est survenue lors du téléchargement.");
      }

      message.unsend(downloadingMessage.messageID);
    } else {
      message.reply("Veuillez entrer un numéro valide.");
    }
  },
};
