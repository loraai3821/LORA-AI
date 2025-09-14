const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;

module.exports = {
  config: {
    name: "help",
    version: "1.0",
    author: "Opu sensei",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Show all command list" },
    longDescription: { en: "Display categorized commands with usage" },
    category: "info",
    guide: { en: "{pn} [category or command name]" }
  },

  onStart: async function ({ message, args, event, role }) {
    const prefix = getPrefix(event.threadID);
    const rawInput = args.join(" ").trim().toLowerCase();
    const categories = {};

    // Organize commands into categories
    for (const [name, value] of commands) {
      if (!value?.config || typeof value.onStart !== "function") continue;
      if (value.config.role > 1 && role < value.config.role) continue;

      const category = (value.config.category || "Uncategorized").toUpperCase();
      if (!categories[category]) categories[category] = [];
      categories[category].push(name);
    }

    // 📚 Help for all categories
    if (!rawInput) {
      let msg = "";
      for (const category of Object.keys(categories).sort()) {
        msg += `◉━━━━「 ${category} 」━━━━◉\n`;
        const cmds = categories[category].sort();
        const cmdPrefix = "◍"; 
        
        // Join all commands with a space for a continuous line
        const cmdList = cmds.map(cmd => `${cmdPrefix}${cmd}`).join(" ");
        msg += cmdList + "\n\n";
      }

      msg += `
┏─━─━─━─━─━─━─━─━─━─━─━─━─━─━─━─━─▢
┃ ⬤ Total cmds: [ ${commands.size} ].
┃ ⬤ Type [ ${prefix}help <cmd> ]
┃ to learn the usage.
┃ ⬤ Owner: 𝗢𝗣𝗨-𝗦𝗘𝗡𝗦𝗘𝗶 🤭
┗─━─━─━─━─━─━─━─━─━─━─━─━─━─━─━─━─▢
           [LORA AI]`;

      const sent = await message.reply(msg);
      setTimeout(() => message.unsend(sent.messageID), 120000);
      return;
    }

    // 🔍 Help for category
    if (rawInput.startsWith("[") && rawInput.endsWith("]")) {
      const categoryName = rawInput.slice(1, -1).toUpperCase();
      const list = categories[categoryName];

      if (!list) {
        return message.reply(`❌ Category "${categoryName}" not found.\nAvailable: ${Object.keys(categories).map(c => `[${c}]`).join(", ")}`);
      }

      let msg = `◉━━━━「 ${categoryName} 」━━━━◉\n`;
      const cmdPrefix = "◍"; 
      const cmdList = list.map(cmd => `${cmdPrefix}${cmd}`).join(" ");
      msg += cmdList + "\n\n";

      const sent = await message.reply(msg);
      setTimeout(() => message.unsend(sent.messageID), 120000);
      return;
    }

    // 🧾 Help for specific command
    const commandName = rawInput;
    const cmd = commands.get(commandName) || commands.get(aliases.get(commandName));
    if (!cmd || !cmd.config) {
      return message.reply(`❌ Command "${commandName}" not found.\nTry: /help`);
    }

    const config = cmd.config;
    const usage = (config.guide?.en || "No usage").replace(/{pn}/g, `${prefix}${config.name}`);
    const desc = config.longDescription?.en || config.shortDescription?.en || "No description";
    const roleText = roleTextToString(config.role);

    const info = `
╭───⊙
│ 🔶 ${stylizeSmallCaps(config.name)}
├── INFO
│ 📝 Description: ${desc}
│ 👑 Author: ${config.author || "Unknown"}
│ ⚙ Guide: ${usage}
├── USAGE
│ 🔯 Version: ${config.version || "1.0"}
│ ♻ Role: ${roleText}
╰────────────⊙`;

    const sent = await message.reply(info);
    setTimeout(() => message.unsend(sent.messageID), 120000);
  }
};

// 🔠 Font: Small Caps
function stylizeSmallCaps(text) {
  const map = {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ',
    j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ',
    s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
  };
  return text.split('').map(c => map[c.toLowerCase()] || c).join('');
}

// 🔓 Role text
function roleTextToString(role) {
  switch (role) {
    case 0: return "Everyone";
    case 1: return "Group Admin";
    case 2: return "Bot Admin";
    case 3: return "Super Admin";
    default: return `${role}`;
  }
                            }
