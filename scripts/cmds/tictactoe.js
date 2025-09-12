const { createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "tictactoe",
    aliases: ["ttt2"],
    version: "1.0",
    author: "OPU SENSEI",
    countDown: 5,
    role: 0,
    shortDescription: "🎮 Play Tic Tac Toe vs Bot",
    longDescription: "Canvas-based neon style Tic Tac Toe game against bot",
    category: "game",
    guide: "{pn}"
  },

  onStart: async function ({ message, event }) {
    const board = Array(3).fill(null).map(() => Array(3).fill(null));

    const checkWinner = (b) => {
      const lines = [
        // Rows
        [b[0][0], b[0][1], b[0][2]],
        [b[1][0], b[1][1], b[1][2]],
        [b[2][0], b[2][1], b[2][2]],
        // Cols
        [b[0][0], b[1][0], b[2][0]],
        [b[0][1], b[1][1], b[2][1]],
        [b[0][2], b[1][2], b[2][2]],
        // Diags
        [b[0][0], b[1][1], b[2][2]],
        [b[0][2], b[1][1], b[2][0]]
      ];
      for (const line of lines) {
        if (line[0] && line[0] === line[1] && line[1] === line[2]) return line[0];
      }
      return null;
    };

    const drawBoard = (b) => {
      const size = 600;
      const cell = size / 3;
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#0f001f";
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = "#ffffff20";
      ctx.lineWidth = 5;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cell, 0);
        ctx.lineTo(i * cell, size);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * cell);
        ctx.lineTo(size, i * cell);
        ctx.stroke();
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "120px Arial";
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          if (b[y][x]) {
            ctx.fillStyle = b[y][x] === 'X' ? "#00ffff" : "#ff3366";
            ctx.fillText(b[y][x], x * cell + cell / 2, y * cell + cell / 2);
          }
        }
      }

      return canvas.toBuffer();
    };

    const getEmptyCells = (b) => {
      const moves = [];
      for (let y = 0; y < 3; y++)
        for (let x = 0; x < 3; x++)
          if (!b[y][x]) moves.push({ x, y });
      return moves;
    };

    const botMove = (b) => {
      const moves = getEmptyCells(b);
      if (moves.length === 0) return null;
      return moves[Math.floor(Math.random() * moves.length)];
    };

    board[1][1] = 'O';

    const buffer = drawBoard(board);
    const filePath = path.join(__dirname, 'ttt.png');
    fs.writeFileSync(filePath, buffer);

    return message.reply({
      body: "🎮 Let's play Tic Tac Toe! You are ❌. Reply with row,col (e.g. 1,2)",
      attachment: fs.createReadStream(filePath)
    }, (err, info) => {
      global.GoatBot.onReply.set(info.messageID, {
        name: "tictactoe",
        messageID: info.messageID,
        board,
        author: event.senderID
      });
    });
  },

  onReply: async function ({ message, event, Reply }) {
    const { board, messageID, author } = Reply;
    if (event.senderID !== author) return;

    const [row, col] = event.body.split(",").map(Number);
    if (isNaN(row) || isNaN(col) || row < 1 || row > 3 || col < 1 || col > 3 || board[row - 1][col - 1])
      return message.reply("❌ Invalid move. Try again like 1,2");

    board[row - 1][col - 1] = 'X';

    let winner = checkWinner(board);
    if (winner) return sendEnd(message, board, winner);

    const bot = botMove(board);
    if (bot) board[bot.y][bot.x] = 'O';

    winner = checkWinner(board);
    if (winner) return sendEnd(message, board, winner);

    const buffer = drawBoard(board);
    const filePath = path.join(__dirname, 'ttt.png');
    fs.writeFileSync(filePath, buffer);

    return message.reply({
      body: "✅ Your move updated. Reply again like row,col",
      attachment: fs.createReadStream(filePath)
    });
  }
};

async function sendEnd(message, board, winner) {
  const { createCanvas } = require("canvas");
  const fs = require("fs-extra");
  const path = require("path");
  const canvas = createCanvas(600, 600);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 600, 600);
  ctx.font = "50px Arial";
  ctx.fillStyle = winner === 'X' ? "#00ffff" : "#ff3366";
  ctx.textAlign = "center";
  ctx.fillText(`${winner === 'X' ? 'You Win!' : 'Bot Wins!'}`, 300, 300);

  const filePath = path.join(__dirname, 'ttt-end.png');
  fs.writeFileSync(filePath, canvas.toBuffer());

  return message.reply({
    body: `🎮 Game over: ${winner === 'X' ? 'You win! 🎉' : 'Bot wins! 🤖'}`,
    attachment: fs.createReadStream(filePath)
  });
}
