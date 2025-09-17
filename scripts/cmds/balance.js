module.exports = {
  config: {
    name: "balance",
    aliases: ["bal"],
    version: "1.9",
    author: "OPU SENSEI",
    countDown: 5,
    role: 0,
    description: {
      en: "📊 | View your money or the money of the tagged person. And send or request for money. Claim free coins, shop for protections, rob, and stalk."
    },
    category: "economy",
    guide: {
      en:
        " {pn}: view your money 💰" +
        "\n {pn} <@tag>: view the money of the tagged person 💵" +
        "\n {pn} send [amount] @mention: send money to someone 💸" +
        "\n {pn} request [amount] @mention: request money from someone 💵" +
        "\n {pn} claim [code]: claim free coins with code 🎁" +
        "\n {pn} shop: view protection shop 🛒" +
        "\n {pn} buy [number]: buy protection 🛡️" +
        "\n {pn} status: check your protection status 🛡️" +
        "\n {pn} rob @mention or reply to message: rob someone 💰" +
        "\n {pn} stalk (reply to message): stalk user info 🔍" +
        "\n {pn} help: view all commands 📋"
    }
  },

  formatMoney: function (amount) {
    if (!amount) return "0";
    if (amount >= 1e33) return (amount / 1e33).toFixed(1) + "Dc";
    if (amount >= 1e30) return (amount / 1e30).toFixed(1) + "No";
    if (amount >= 1e27) return (amount / 1e27).toFixed(1) + "Oc";
    if (amount >= 1e24) return (amount / 1e24).toFixed(1) + "Sp";
    if (amount >= 1e21) return (amount / 1e21).toFixed(1) + "Sx";
    if (amount >= 1e18) return (amount / 1e18).toFixed(1) + "Qn";
    if (amount >= 1e15) return (amount / 1e15).toFixed(1) + "Q";
    if (amount >= 1e12) return (amount / 1e12).toFixed(1) + "T";
    if (amount >= 1e9) return (amount / 1e9).toFixed(1) + "B";
    if (amount >= 1e6) return (amount / 1e6).toFixed(1) + "M";
    if (amount >= 1e5) return (amount / 1e5).toFixed(1) + "Lakh";
    if (amount >= 1e3) return (amount / 1e3).toFixed(1) + "K";
    return amount.toString();
  },

  protections: [
    { name: "🛡️ Basic Shield", price: 500 },
    { name: "🔒 Anti-Theft Lock", price: 1000 },
    { name: "🚫 Robbery Blocker", price: 1500 },
    { name: "💰 Balance Guard", price: 2000 },
    { name: "🏰 Vault Protector", price: 2500 }
  ],

  onStart: async function ({ message, usersData, event, args, api }) {
    let targetUserID = event.senderID;
    let isSelfCheck = true;

    if (event.messageReply) {
      targetUserID = event.messageReply.senderID;
      isSelfCheck = false;
    } else if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetUserID = Object.keys(event.mentions)[0];
      isSelfCheck = false;
    }

    // Send/Request
    if (args.length > 0 && (args[0] === "send" || args[0] === "request")) {
      return await this.handleTransaction({ message, usersData, event, args, api });
    }

    // Claim Coins
    if (args.length > 0 && args[0].toLowerCase() === "claim") {
      const code = args[1];
      if (!code) return api.sendMessage("❌ | Please provide a claim code.", event.threadID);

      if (code.toUpperCase() === "3SQ48") {
        const userData = await usersData.get(event.senderID) || {};
        const now = Date.now();
        const lastClaim = userData.lastClaimCodeTime || 0;
        const cooldown = 24 * 60 * 60 * 1000;

        if (userData.claimedCodes?.includes("3SQ48") && (now - lastClaim) < cooldown) {
          const remainingMs = cooldown - (now - lastClaim);
          const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
          const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
          return api.sendMessage(
            `❌ | Already claimed. Wait ${remainingHours}h ${remainingMinutes}m.`,
            event.threadID
          );
        }

        const freeCoins = 66000000;
        const newMoney = (userData.money || 0) + freeCoins;
        const claimedCodes = userData.claimedCodes || [];
        if (!claimedCodes.includes("3SQ48")) claimedCodes.push("3SQ48");

        await usersData.set(event.senderID, {
          ...userData,
          money: newMoney,
          claimedCodes,
          lastClaimCodeTime: now
        });

        return api.sendMessage(
          `🎉 | Claimed ${this.formatMoney(freeCoins)}! New balance: ${this.formatMoney(newMoney)} $ 🤑`,
          event.threadID
        );
      } else {
        return api.sendMessage("❌ | Invalid claim code.", event.threadID);
      }
    }

    // Stalk Command
    if (args.length > 0 && args[0].toLowerCase() === "stalk") {
      if (!event.messageReply) {
        return api.sendMessage("❌ | Reply to a message to stalk.", event.threadID);
      }
      const stalkUserID = event.messageReply.senderID;
      const userInfo = await usersData.get(stalkUserID) || {};
      return api.sendMessage(
        `🔍 | Stalked User Info:\n` +
        `👤 ID: ${stalkUserID}\n` +
        `💰 Balance: ${this.formatMoney(userInfo.money || 0)}\n` +
        `🛡️ Protections: ${userInfo.protections ? userInfo.protections.join(", ") : "None"}`,
        event.threadID
      );
    }

    // Default: Show Balance
    const userData = await usersData.get(targetUserID) || {};
    const balance = this.formatMoney(userData.money || 0);
    return api.sendMessage(
      `${isSelfCheck ? "💰 | Your balance" : "💰 | User balance"}: ${balance} $`,
      event.threadID,
      event.messageID
    );
  }
};
