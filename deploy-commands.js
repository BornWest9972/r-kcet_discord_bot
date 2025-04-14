const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

require('dotenv').config();

const token = process.env.Token;
const clientId = process.env.clientId;
const guildId = process.env.guildId;







// Loading commands 
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON()); // Slash commands covert to JSON for discord rest api
}

// Deploy them to the guild
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
