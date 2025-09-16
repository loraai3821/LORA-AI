const axios = require("axios");

module.exports = {
  config: {
    name: "gpt5",
    aliases: ["gpt"],
    version: "1.0",
    author: "Aryan Chauhan",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Chat with GPT-5" },
    longDescription: { en: "Talk with GPT-5 AI without conversation memory." },
    category: "ai",
    guide: { en: "Use: !gpt5 <message>\nExample: !gpt5 hello" }
  },

  onStart: async function ({ api, event, args }) {
    const prompt = args.join(" ");
    if (!prompt) {
      return api.sendMessage(
        "⚠️ Please provide a message to start chatting.\nExample: !gpt5 hello",
        event.threadID,
        event.messageID
      );
    }

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      const response = await axios.get("https://arychauhann.onrender.com/api/gpt5", {
        params: { prompt }
      });

      if (!response.data || !response.data.result) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return api.sendMessage("❌ GPT-5 did not return a response.", event.threadID, event.messageID);
      }

      const answer = response.data.result.trim();

      api.sendMessage(`${answer}`, event.threadID, (err, info) => {
        if (err) return;
        api.setMessageReaction("✅", event.messageID, () => {}, true);

        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          author: event.senderID
        });
      }, event.messageID);

    } catch (err) {
      console.error(err);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      api.sendMessage("❌ An error occurred while contacting GPT-5 AI.", event.threadID, event.messageID);
    }
  },

  onReply: async function ({ api, event, Reply }) {
    if (event.senderID !== Reply.author) return;

    const prompt = event.body;
    if (!prompt) return;

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      const response = await axios.get("https://arychauhann.onrender.com/api/gpt5", {
        params: { prompt }
      });

      if (!response.data || !response.data.result) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return api.sendMessage("❌ GPT-5 did not return a response.", event.threadID, event.messageID);
      }

      const answer = response.data.result.trim();

      api.sendMessage(`${answer}`, event.threadID, (err, info) => {
        if (err) return;
        api.setMessageReaction("✅", event.messageID, () => {}, true);

        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          author: event.senderID
        });
      }, event.messageID);

    } catch (err) {
      console.error(err);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      api.sendMessage("❌ An error occurred while chatting with GPT-5 AI.", event.threadID, event.messageID);
    }
  }
};
