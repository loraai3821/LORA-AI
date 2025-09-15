const axios = require('axios');

module.exports = {
  config: {
    name: "sim",
    version: "1.0",
    author: "Prince",
    description: "A simple SimSimi-like command",
    usage: "sim <message> or reply to a message",
  },
  async onStart({ api, args, event }) {
    const authorHex = Buffer.from(this.config.author).toString('hex');
    if (authorHex !== '5072696e6365') {
      api.sendMessage('Access Denied', event.threadID);
      return;
    }

    const ID = event.messageID;

    let input;
    if (event.type === "message_reply") {
      input = event.messageReply.body;
    } else if (args.length > 0) {
      input = args.join(" ");
    } else {
      api.sendMessage(`💬 | Usage: ${this.config.name} <message> or reply to a message`, event.threadID, ID);
      return;
    }

    if (!input || input.trim() === "") {
      api.sendMessage(`💬 | Please provide a message`, event.threadID, ID);
      return;
    }

    const loading = await api.sendMessage("⏳ | Loading...", event.threadID, ID);

    try {
      const encodedInput = encodeURIComponent(input);
      if (!encodedInput) {
        await api.unsendMessage(loading.messageID);
        api.sendMessage("😔 | Invalid input. Please try again.", event.threadID, ID);
        return;
      }

      const response = await axios.get(`https://daikyu-api.up.railway.app/api/sim-simi?talk=${encodedInput}`);
      if (response.data && response.data.response) {
        const message = response.data.response;
        await api.unsendMessage(loading.messageID);
        api.sendMessage(message, event.threadID, ID);
      } else {
        await api.unsendMessage(loading.messageID);
        api.sendMessage("😔 | An error occurred. Please try again later.", event.threadID, ID);
      }
    } catch (error) {
      await api.unsendMessage(loading.messageID);
      api.sendMessage("😔 | An error occurred. Please try again later.", event.threadID, ID);
      console.error(error);
    }
  }
};
