const Discord = require('discord.js');
const osudroid = require('osu-droid');
const config = require('../../config.json');
const { Db } = require('mongodb');

/**
 * @param {Discord.Client} client 
 * @param {Discord.Message} message 
 * @param {string[]} args 
 * @param {Db} maindb 
 */
module.exports.run = (client, message, args, maindb) => {
    if (!message.isOwner) {
        return message.channel.send("❎ **| I'm sorry, you do not have the permission to use this command.**");
    }
    if (!args[0]) {
        return message.channel.send("❎ **| Hey, please enter a beatmap link or ID!**");
    }

    const a = args[0].split("/");
    const beatmapID = parseInt(a[a.length - 1]);
    if (isNaN(beatmapID)) {
        return message.channel.send("❎ **| Hey, please enter a valid beatmap link or ID!**");
    }

    const blacklistDb = maindb.collection("mapblacklist");
    blacklistDb.findOne({beatmapID: beatmapID}, async (err, res) => {
        if (err) {
            console.log(err);
            return message.channel.send("❎ **| I'm sorry, I'm having trouble receiving response from database. Please try again!**");
        }
        if (!res) {
            return message.channel.send(`❎ **| I'm sorry, this beatmap has not been blacklisted previously!**`);
        }

        const mapinfo = await new osudroid.MapInfo().getInformation({beatmapID: beatmapID, file: false});
        if (mapinfo.error) {
            return message.channel.send("❎ **| I'm sorry, I cannot fetch beatmap info from osu! API! Perhaps it is down?**");
        }
        if (!mapinfo.title) {
            return message.channel.send("❎ **| I'm sorry, I cannot find the beatmap that you are looking for! Please make sure that you have entered the full beatmap link or the beatmap ID instead of beatmap set ID!**");
        }
        if (!mapinfo.objects) {
            return message.channel.send("❎ **| I'm sorry, it seems like the map has 0 objects!**");
        }

        const footer = config.avatar_list;
        const index = Math.floor(Math.random() * footer.length);
        const embed = new Discord.MessageEmbed()
            .setFooter("Alice Synthesis Thirty", footer[index])
            .setColor(mapinfo.statusColor())
            .setAuthor("Map Found", "https://image.frl/p/aoeh1ejvz3zmv5p1.jpg")
            .setTitle(mapinfo.showStatistics("", 0))
            .setDescription(mapinfo.showStatistics("", 1))
            .setURL(`https://osu.ppy.sh/b/${mapinfo.beatmapID}`)
            .addField(mapinfo.showStatistics("", 2), `${mapinfo.showStatistics("", 4)}\n${mapinfo.showStatistics("", 5)}`);

        blacklistDb.deleteOne({beatmapID: beatmapID}, err => {
            if (err) {
                console.log(err);
                return message.channel.send("❎ **| I'm sorry, I'm having trouble receiving response from database. Please try again!**");
            }

            message.channel.send({embed: embed});
            message.channel.send(`✅ **| Successfully unblacklisted \`${mapinfo.fullTItle}\`.**`);
        });
    });
};

module.exports.config = {
    name: "unblacklist",
    description: "Unblacklists a beatmap.",
    usage: "unblacklist <beatmap link/ID>",
    detail: "`beatmap link/ID`: The beatmap link or ID to unblacklist [Integer/String]",
    permission: "Specific person (<@132783516176875520> and <@386742340968120321>)"
};