const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "nanobanana",
    aliases: ["nanobanana", "nb",],
    version: "1.0",
    author: "opu ",
    countDown: 15,
    role: 0,
    description: "Generate images using Google's 'nano banana' model.",
    category: "ai",
    guide: { en: "{pn} prompt" }
  },

  onStart: async ({ api, event, args }) => {
    const prompt = (event.messageReply?.body.split("dalle")[1] || args.join(" ")).trim();
    if (!prompt) {
      return api.sendMessage("❌| ভুল ফরম্যাট। ✅| সঠিক ব্যবহার: 17/18 years old boy/girl watching football match on TV with 'Dipto' and '69' written on the back of their dress, 4k", event.threadID, event.messageID);
    }

    // এখানে আপনার Google AI API Key দিন
    const API_KEY = "AIzaSyCqx_34K1xV_R_4aoGxcEaEpYXiRKq2vfw"; 

    if (API_KEY === "AIzaSyCqx_34K1xV_R_4aoGxcEaEpYXiRKq2vfw") {
      return api.sendMessage("❌| ত্রুটি: অনুগ্রহ করে কোডে 'YOUR_API_KEY' এর জায়গায় আপনার আসল API key বসান।", event.threadID, event.messageID);
    }
    
    // 'nano banana' মডেলের জন্য API URL
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${API_KEY}`;
    
    try {
      const waitMsg = await api.sendMessage("Wait koro baby 😽", event.threadID);
      
      const payload = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseModalities: ["IMAGE"]
        }
      };

      const response = await axios.post(apiUrl, payload);
      
      const base64Data = response.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (!base64Data) {
        api.unsendMessage(waitMsg.messageID);
        return api.sendMessage("কোনো ছবি তৈরি হয়নি অথবা খালি রেসপন্স এসেছে।", event.threadID, event.messageID);
      }
      
      // Base64 ডেটা থেকে ছবি তৈরি করে অস্থায়ী ফাইল হিসেবে সেভ করা
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const imagePath = path.join(__dirname, 'generated_image.png');
      fs.writeFileSync(imagePath, imageBuffer);
      
      api.unsendMessage(waitMsg.messageID);
      
      const attachment = fs.createReadStream(imagePath);
      await api.sendMessage({
        body: `✅ | এই নাও তোমার তৈরি করা ছবি 😘`,
        attachment: attachment
      }, event.threadID, () => {
        fs.unlinkSync(imagePath); // ছবি পাঠানোর পর ফাইলটি মুছে ফেলা হবে
      });

    } catch (error) {
      console.error(error);
      api.unsendMessage(waitMsg.messageID);
      api.sendMessage(`ছবি তৈরি করা যায়নি!\nError: ${error.message}`, event.threadID, event.messageID);
    }
  }
};
