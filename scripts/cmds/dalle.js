const axios = require('axios');

const baseApiUrl = async () => {
  const base = await axios.get(
    `https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json`
  );
  return base.data.api;
};

module.exports = {
  config: {
    name: "dalle",
    aliases: ["bing", "create", "imagine"],
    version: "1.0",
    author: "Dipto",
    countDown: 15,
    role: 0,
    description: "Generate images by Unofficial Dalle3",
    category: "ai",
    guide: { en: "{pn} prompt" }
  },

  onStart: async ({ api, event, args }) => {
    const prompt = (
      event.messageReply?.body.split("dalle")[1] || args.join(" ")
    ).trim();

    if (!prompt) {
      return api.sendMessage(
        "❌ | Wrong Format.\n✅ Example: 17/18 years old boy/girl watching football match on TV with 'Dipto' and '69' written on the back of their dress, 4k",
        event.threadID,
        event.messageID
      );
    }

    try {
      // Send waiting message and hold the messageID
      const waitMsg = await api.sendMessage(
        "⏳ Wait koro baby 😽, generating image...",
        event.threadID
      );

      // Call API
      const response = await axios.get(
        `${await baseApiUrl()}/dalle?prompt=${encodeURIComponent(prompt)}&key=dipto008`
      );

      const imageUrls = response.data.imgUrls || [];
      if (!imageUrls.length) {
        return api.sendMessage(
          "❌ Empty response or no images generated.",
          event.threadID,
          event.messageID
        );
      }

      // Download images
      const images = await Promise.all(
        imageUrls.map(url =>
          axios
            .get(url, { responseType: "stream" })
            .then(res => res.data)
        )
      );

      // Delete "wait" message
      if (waitMsg && waitMsg.messageID) {
        api.unsendMessage(waitMsg.messageID);
      }

      // Send final message with images
      api.sendMessage(
        {
          body: `✅ | Here's Your Generated Photo 😘\n📝 Prompt: ${prompt}`,
          attachment: images
        },
        event.threadID,
        event.messageID
      );
    } catch (error) {
      console.error("Dalle Error:", error);
      api.sendMessage(
        `❌ Generation failed!\nError: ${error.message}`,
        event.threadID,
        event.messageID
      );
    }
  }
};
