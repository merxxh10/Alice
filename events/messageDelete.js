module.exports.run = (client, message, messageLog) => {
    // Message delete logging
	client.subevents.get("messagedeletelog").run(message, messageLog)
};

module.exports.config = {
    name: "messageDelete"
};