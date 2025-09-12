module.exports = {
  config: {
    name: "giftbal",
    version: "1.0",
    author: "Modified by ChatGPT",
    role: 2, // Admin only
    shortDescription: "Gift balance to a user",
    longDescription: "Give money to a user’s wallet by admin command",
    category: "economy",
    guide: "{pn} <amount> <userID/@mention/reply>"
  },

  onStart: async function ({ message, event, args, usersData }) {
    try {
      // Permission check ()
      if (this.config.role > 0 && event.senderID !== "100093021476757") {
        return message.reply("🚫 Only bot admins can use this command.");
      }

      // Amount validation
      if (!args[0] || isNaN(args[0])) {
        return message.reply("❌ Please provide a valid amount.\nExample: giftbal 500 @user");
      }

      let amount = parseInt(args[0]);
      if (amount <= 0) {
        return message.reply("❌ Amount must be greater than zero.");
      }

      // Detect target user
      let targetID;
      if (Object.keys(event.mentions)[0]) {
        targetID = Object.keys(event.mentions)[0];
      } else if (args[1] && /^\d+$/.test(args[1])) {
        targetID = args[1];
      } else if (event.type === "message_reply" && event.messageReply.senderID) {
        targetID = event.messageReply.senderID;
      } else {
        return message.reply("❌ Please mention, reply, or provide a user ID.");
      }

      // Load or create user data
      let targetData = await usersData.get(targetID) || {
        name: await usersData.getName(targetID) || "Unknown",
        money: 0,
        data: {}
      };

      // Update balance
      targetData.money = (targetData.money || 0) + amount;
      await usersData.set(targetID, {
        money: targetData.money,
        name: targetData.name,
        data: targetData.data
      });

      // Sender name
      let senderName = await usersData.getName(event.senderID) || "Admin";

      // Stylish confirmation
      message.reply(
        `🎁✨ Gift Successful! ✨🎁\n\n` +
        `💎 From: ${senderName}\n` +
        `👤 To: ${targetData.name}\n` +
        `💰 Amount: $${amount.toLocaleString()}\n` +
        `🏦 New Balance: $${targetData.money.toLocaleString()}\n\n` +
        `💖 Enjoy your gift!`
      );

    } catch (err) {
      console.error(err);
      message.reply("❌ Error while gifting balance.");
    }
  }
};
