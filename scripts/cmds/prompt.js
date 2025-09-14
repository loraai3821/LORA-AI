const axios = require('axios');

module.exports = {
    config: {
        name: "prompt",
        aliases: ['p'],
        version: "1.0",
        author: "opu sensei",
        countDown: 5,
        role: 0,
        shortDescription: "Generate an AI prompt",
        longDescription: "Generates a Midjourney prompt based on text or image input.",
        category: "ai",
        guide: {
            en: "{pn} <text>: Generate a prompt based on the text."
                + "\n{pn} (reply to an image): Generate a prompt based on the replied image."
        }
    },

    onStart: async function({ message, event, args }) {
        try {
            let imageUrl = null;
            let apiUrl = "https://nova-apis.onrender.com/prompt";

            // if replied to an image
            if (event.type === "message_reply" && event.messageReply.attachments?.[0]?.type === 'photo') {
                imageUrl = event.messageReply.attachments[0].url;
            }

            // if text input exists
            const promptText = args.join(" ");

            if (!promptText && !imageUrl) {
                return message.reply("Please provide text or reply to an image.");
            }

            let response;

            if (imageUrl) {
                response = await axios.get(`${apiUrl}?image=${encodeURIComponent(imageUrl)}`);
            } else {
                response = await axios.get(`${apiUrl}?prompt=${encodeURIComponent(promptText)}`);
            }

            if (response.status === 200) {
                if (response.data.prompt) {
                    return message.reply(response.data.prompt);
                } else {
                    return message.reply("No valid response from API.");
                }
            } else {
                return message.reply("API error: " + response.status);
            }

        } catch (error) {
            console.error("Error generating prompt:", error?.response?.data || error.message);
            message.reply("An error occurred, please try again later.");
        }
    }
};
