let Discord = require('discord.js');
let config = require('../config.json');

module.exports.run = async (client, message, args) => {
    if (message.channel instanceof Discord.DMChannel) return message.channel.send("This command is not available in DMs");
    if (!message.member.roles.find(r => r.name === 'Owner')) return message.channel.send("You don't have permission to do this");

    let logchannel = message.guild.channels.find(c => c.name === config.management_channel);
    if (!logchannel) return message.channel.send(`Please create ${config.management_channel} first!`);

    let userid = args[0];
    if (!userid) return message.channel.send("Please specify the correct user to ban!");
    userid = userid.replace('<@!','');
    userid = userid.replace('<@','');
    userid = userid.replace('>','');

    if (isNaN(userid)) return message.channel.send("Please specify the correct user to ban!");
    if (userid == message.author.id) return message.channel.send("You cannot ban yourself!");

    let banlist = await message.guild.fetchBans();
    let banned = banlist.get(userid);
    if (banned) return message.channel.send("This user is already banned!");

    let toban = await client.fetchUser(userid);
    if (!toban) return message.channel.send("User not found!");
    let reason = args.slice(1).join(" ");
    if (!reason) return message.channel.send("Please enter your reason.");

    message.guild.ban(toban, {reason: reason}).then (() => {
        message.author.lastMessage.delete();

        let footer = config.avatar_list;
        const index = Math.floor(Math.random() * (footer.length - 1) + 1);

        const embed = new Discord.RichEmbed()
            .setAuthor(message.author.tag, message.author.avatarURL)
            .setFooter("Alice Synthesis Thirty", footer[index])
            .setTimestamp(new Date())
            .setColor(message.member.highestRole.hexColor)
            .setTitle("Ban executed")
            .addField("Banned user: " + toban.username, "User ID: " + userid)
            .addField("=========================", "Reason:\n" + reason);

        logchannel.send({embed})
    }).catch(e => console.log(e))
};

module.exports.help = {
    name: "ban"
};
