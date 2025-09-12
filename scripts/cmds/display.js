module.exports = {
  config: {
    name: "display",
    version: "1.0",
    author: "opu",
role: 2,
category: "owner",
    shortDescription: {
      vi: "Display the list of groups in message requests",
      en: "Display the list of groups in message requests"
    }
  },

  onStart: async function ({ args, api, message, role, event, getLang }) {
    const type = args[0];

    switch (type) {
      case "groups":
      case "-g": {
        if (role < 2) {
          return message.reply(getLang("noPermission"));
        }

        try {
          const messageRequests = await api.getThreadList(20, null, ["PENDING"]);
          const groups = messageRequests.filter(request => request.isGroup);

          if (groups.length > 0) {
            let replyMessage = "Groups in message requests:\n";
            groups.forEach((group, index) => {
              replyMessage += `${index + 1}. ${group.name} (${group.threadID})\n`;
            });
            message.reply(replyMessage);
          } else {
            message.reply("There are no groups in message requests.");
          }
        } catch (error) {
          console.error("An error occurred while retrieving message requests:", error);
          message.reply("An error occurred while retrieving message requests. Please try again.");
        }
        break;
      }

      case "approve":
      case "-a": {
        try {
          const index = parseInt(args[1]) - 1;
          const groups = await api.getThreadList(20, null, ["PENDING"]);
          const group = groups.filter(request => request.isGroup)[index];

          if (group) {
            await api.acceptThreadInvitation(group.threadID);
            message.reply(`Group approved successfully (${group.name}).`);
          } else {
            message.reply("The specified group could not be found.");
          }
        } catch (error) {
          console.error("An error occurred while approving the group:", error);
          message.reply("An error occurred while approving the group. Please try again.");
        }
        break;
      }

      case "reject":
      case "-r": {
        try {
          const index = parseInt(args[1]) - 1;
          const groups = await api.getThreadList(20, null, ["PENDING"]);
          const group = groups.filter(request => request.isGroup)[index];

          if (group) {
            await api.rejectThreadInvitation(group.threadID);
            message.reply(`Group rejected successfully (${group.name}).`);
          } else {
            message.reply("The specified group could not be found.");
          }
        } catch (error) {
          console.error("An error occurred while rejecting the group:", error);
          message.reply("An error occurred while rejecting the group. Please try again.");
        }
        break;
      }

      case "ban":
      case "-b": {
        try {
          const index = parseInt(args[1]) - 1;
          const groups = await api.getThreadList(20, null, ["PENDING"]);
          const group = groups.filter(request => request.isGroup)[index];

          if (group) {
            await api.blockUser(group.threadID);
            message.reply(`Group banned successfully (${group.name}).`);
          } else {
            message.reply("The specified group could not be found.");
          }
        } catch (error) {
          console.error("An error occurred while banning the group:", error);
          message.reply("An error occurred while banning the group. Please try again.");
        }
        break;
      }

            case "leave":
      case "-l": {
        try {
          const index = parseInt(args[1]) - 1;
          const groups = await api.getThreadList(20, null, ["PENDING"]);
          const group = groups.filter(request => request.isGroup)[index];

          if (group) {
            await api.leaveGroup(group.threadID);
            message.reply(`Successfully left the group (${group.name}).`);
          } else {
            message.reply("The specified group could not be found.");
          }
        } catch (error) {
          console.error("An error occurred while leaving the group:", error);
          message.reply("An error occurred while leaving the group. Please try again.");
        }
        break;
      }

      default:
        message.SyntaxError();
    }
  }
};
