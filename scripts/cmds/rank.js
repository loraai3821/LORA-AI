const Canvas = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const { randomString } = global.utils;

const FONT_PATH_BOLD = path.join(__dirname, "assets", "font", "BeVietnamPro-Bold.ttf");
const FONT_PATH_SEMI = path.join(__dirname, "assets", "font", "BeVietnamPro-SemiBold.ttf");

Canvas.registerFont(FONT_PATH_BOLD, { family: "BeVietnamPro-Bold" });
Canvas.registerFont(FONT_PATH_SEMI, { family: "BeVietnamPro-SemiBold" });

const deltaNext = 5;

function expToLevel(exp) {
	return Math.floor((1 + Math.sqrt(1 + 8 * exp / deltaNext)) / 2);
}

function levelToExp(level) {
	return Math.floor(((level ** 2 - level) * deltaNext) / 2);
}

function getRankBadge(rank) {
	switch (rank) {
		case 1: return "🥇";
		case 2: return "🥈";
		case 3: return "🥉";
		default: return `#${rank}`;
	}
}

async function makeRankCard(userData, level, exp, requiredExp, rank, total, usersData) {
	const canvas = Canvas.createCanvas(920, 310);
	const ctx = canvas.getContext("2d");

	// 🌌 Neon Background
	const gradient = ctx.createLinearGradient(0, 0, 920, 0);
	gradient.addColorStop(0, "#000428");
	gradient.addColorStop(1, "#004e92");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// 🖼️ Avatar with Neon Glow
	const avatarUrl = await usersData.getAvatarUrl(userData.userID);
	const avatar = await Canvas.loadImage(avatarUrl);

	ctx.save();
	ctx.beginPath();
	ctx.arc(155, 155, 100, 0, Math.PI * 2);
	ctx.closePath();
	ctx.clip();
	ctx.drawImage(avatar, 55, 55, 200, 200);
	ctx.restore();

	// 🔵 Neon Glow Ring
	ctx.beginPath();
	ctx.arc(155, 155, 102, 0, Math.PI * 2);
	ctx.lineWidth = 8;
	ctx.shadowColor = "#00ffe0";
	ctx.shadowBlur = 20;
	ctx.strokeStyle = "#00ffe0";
	ctx.stroke();

	// 👑 Neon Title
	ctx.font = "bold 36px BeVietnamPro-Bold";
	ctx.fillStyle = "#ffffff";
	ctx.shadowColor = "#00ffff";
	ctx.shadowBlur = 15;
	ctx.fillText(userData.name, 280, 85);

	// 🏅 Neon Stats
	ctx.font = "24px BeVietnamPro-SemiBold";
	ctx.fillStyle = "#00ffc3";
	ctx.shadowColor = "#00ffc3";
	ctx.fillText(`🏅 Level ${level}`, 280, 130);
	ctx.fillText(`🎖️ Rank: ${getRankBadge(rank)} of ${total}`, 280, 170);
	ctx.fillText(`📈 EXP: ${exp} / ${requiredExp}`, 280, 210);

	// 📊 Neon Progress Bar
	const percent = Math.min(exp / requiredExp, 1);
	const barX = 280, barY = 230, barWidth = 580, barHeight = 25;

	// Background
	ctx.shadowBlur = 0;
	ctx.fillStyle = "#1a1a1a";
	ctx.fillRect(barX, barY, barWidth, barHeight);

	// Fill
	ctx.fillStyle = "#00ffc3";
	ctx.shadowColor = "#00ffc3";
	ctx.shadowBlur = 10;
	ctx.fillRect(barX, barY, barWidth * percent, barHeight);

	// Text %
	ctx.font = "20px BeVietnamPro-SemiBold";
	ctx.fillStyle = "#ffffff";
	ctx.shadowColor = "#ffffff";
	ctx.shadowBlur = 12;
	ctx.fillText(`${Math.floor(percent * 100)}%`, barX + barWidth + 10, barY + 20);

	return canvas.toBuffer("image/png");
}

module.exports = {
	config: {
		name: "rank",
		version: "3.0",
		author: "NTKhang + Fahad",
		countDown: 5,
		role: 0,
		shortDescription: { en: "View your glowing neon rank card" },
		description: {
			en: "Show rank, EXP, level, and position in a stunning neon style card."
		},
		category: "rank",
		guide: {
			en: `{pn} → Your rank\n{pn} @user\n{pn} uid\n(Reply) {pn}`
		}
	},

	onStart: async function ({ api, event, args, message, usersData }) {
		let targetID;
		if (event.type === "message_reply") {
			targetID = event.messageReply.senderID;
		} else if (Object.keys(event.mentions || {}).length > 0) {
			targetID = Object.keys(event.mentions)[0];
		} else if (!isNaN(args[0])) {
			targetID = args[0];
		} else {
			targetID = event.senderID;
		}

		const allUsers = await usersData.getAll();
		const sortedUsers = allUsers
			.map(u => ({ id: u.userID, exp: u.exp || 0 }))
			.sort((a, b) => b.exp - a.exp);

		const rankPosition = sortedUsers.findIndex(u => u.id === targetID) + 1;
		const totalUsers = sortedUsers.length;

		const userData = await usersData.get(targetID);
		if (!userData) return message.reply("❌ User data not found.");

		const exp = userData.exp || 0;
		const level = expToLevel(exp);
		const nextExp = levelToExp(level + 1);
		const currentExp = levelToExp(level);
		const requiredExp = nextExp - currentExp;
		const progressExp = exp - currentExp;

		const imageBuffer = await makeRankCard(
			{ name: userData.name, userID: targetID },
			level,
			progressExp,
			requiredExp,
			rankPosition,
			totalUsers,
			usersData
		);

		const imgName = `rank_${randomString(6)}.png`;
		const filePath = path.join(__dirname, "cache", imgName);
		await fs.ensureDir(path.dirname(filePath));
		await fs.writeFile(filePath, imageBuffer);

		return message.reply({
			body: `🌟  Rank Card for ${userData.name}`,
			attachment: fs.createReadStream(filePath)
		});
	}
};
