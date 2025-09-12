const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const baseApiUrl = async () => {
    try {
        const base = await axios.get(
            `https://raw.githubusercontent.com/Mostakim0978/D1PT0/main/baseApiUrl.json`
        );
        return base.data.api;
    } catch (e) {
        console.error("Base API URL fetch failed:", e.message);
        return null;
    }
};

module.exports = {
    config: {
        name: "pin",
        aliases: ["pinterest"],
        version: "1.1",
        author: "Dipto [Updated] by opu",
        countDown: 10,
        role: 0,
        shortDescription: "Pinterest Image Search",
        longDescription: "Search and download images from Pinterest",
        category: "image",
        guide: {
            en: "{pn} cat - 5",
        },
    },

    onStart: async function ({ api, event, args }) {
        const input = args.join(" ").split("-");
        const q = input[0]?.trim();
        const length = parseInt(input[1]?.trim());

        if (!q || isNaN(length)) {
            return api.sendMessage("❌ | Format: query - count\n📌 Example: pin cat - 5", event.threadID, event.messageID);
        }

        const apiUrl = await baseApiUrl();
        if (!apiUrl) {
            return api.sendMessage("❌ | Failed to fetch base API URL.", event.threadID, event.messageID);
        }

        try {
            const waitMsg = await api.sendMessage("⏳ | Fetching images, please wait...", event.threadID);

            const res = await axios.get(`${apiUrl}/pinterest?search=${encodeURIComponent(q)}&limit=${length}`);
            const data = res.data?.data || [];

            if (data.length === 0) {
                return api.sendMessage("❌ | No images found.", event.threadID, event.messageID);
            }

            const attachments = [];
            for (let i = 0; i < Math.min(data.length, length); i++) {
                const imgUrl = data[i];
                const response = await axios.get(imgUrl, { responseType: "arraybuffer" });

                const imgPath = path.join(__dirname, "dvassests", `${i + 1}.jpg`);
                await fs.outputFile(imgPath, response.data);
                attachments.push(fs.createReadStream(imgPath));
            }

            await api.unsendMessage(waitMsg.messageID);
            await api.sendMessage(
                {
                    body: `✅ | Found ${attachments.length} image(s) for "${q}"`,
                    attachment: attachments,
                },
                event.threadID,
                event.messageID
            );
        } catch (err) {
            console.error("Pinterest Error:", err.message);
            api.sendMessage(`❌ | Error occurred: ${err.message}`, event.threadID, event.messageID);
        }
    },
};
