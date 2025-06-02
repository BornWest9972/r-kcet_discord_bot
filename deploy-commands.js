const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

require('dotenv').config();

const token = process.env.Token;
const clientId = process.env.clientId;
const guildIds = process.env.guildIds.split(','); // multiple guilds

// Loading commands 
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

// Deploy to each guild
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    for (const guildId of guildIds) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId.trim()),
        { body: commands }
      );
      console.log(`Successfully reloaded commands for guild ${guildId.trim()}`);
    }

    console.log('All guilds updated.');
  } catch (error) {
    console.error(error);
  }
})();