const axios = require('axios');
const { GoatWrapper } = require('fca-liane-utils');

module.exports = {
  config: {
    name: "flux",
    aliases: ["ff"],
    version: "1.5",
    author: "Samir Œ || Modified By Mariancross",
    countDown: 5,
    role: 0,
    shortDescription: "Générateur d'images via l'API Fluxpro",
    longDescription: "",
    category: "ai",
    guide: {
      fr: "{pn} <prompt> --ar 1:1"
    }
  },

  onStart: async function ({ message, args, event }) {
    // Envoyer le message d'attente initial
    const waitingMessage = await message.reply("flux pro génère ⏳");
    
    // Démarrer le chrono
    const startTime = Date.now();

    let prompt = args.join(" ");
    let aspectRatio = "1:1";

    // Extraction du ratio d'aspect si fourni
    const arIndex = args.indexOf("--ar");
    if (arIndex !== -1 && args[arIndex + 1]) {
      aspectRatio = args[arIndex + 1];
      // Suppression de --ar et de sa valeur du prompt
      args.splice(arIndex, 2);
      prompt = args.join(" ");
    }

    try {
      const apiUrl = `https://www.samirxpikachu.run.place/fluxpro?prompt=${encodeURIComponent(prompt)}&ratio=${aspectRatio}`;
      const imageStream = await global.utils.getStreamFromURL(apiUrl);

      if (!imageStream) {
        return message.reply("❌ Oups ! L'image n'a pas pu être générée. Pour le support, contactez https://m.me/mariancrosss ❤️");
      }
      
      // Calculer le temps écoulé
      const endTime = Date.now();
      const generationTime = Math.floor((endTime - startTime) / 1000);
      
      // Supprimer le message d'attente
      await message.unsend(waitingMessage.messageID);
      
      // Envoyer l'image avec le temps de génération
      return message.reply({
        body: `✨ Voici votre image (générée en ${generationTime}s)`,
        attachment: imageStream
      });
    } catch (error) {
      console.error(error);
      return message.reply("💔 Oh non ! Quelque chose s'est mal passé.");
    }
  }
};

const wrapper = new GoatWrapper(module.exports);
wrapper.applyNoPrefix({ allowPrefix: true });
