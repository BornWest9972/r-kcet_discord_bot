const { Client, GatewayIntentBits, Collection } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('dotenv').config(); 
const token = process.env.Token;
require('./server'); 



const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, 
  ],
});

client.commands = new Collection();
//slash command handle
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}


client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
  
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
  
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Error executing command.', ephemeral: true });
    }
  });
  

// Connection to the SQLite database
const db = new sqlite3.Database('./cutoffs.db');




// login message when ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Event listener for handling messages
client.on('messageCreate', async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Check if the message starts with the command prefix
  if (message.content.startsWith('?cutoff')) {
    // Extract arguments from the message
    const args = message.content.split(' ');
    if (args.length !== 6) {
      return message.reply(
        'Invalid format. Use `?cutoff <college_code> <year> <branch_code> <category> <round>`.'
      );
    }

    const [, collegeCode, year, branchCode, category,round] = args
    // Query the SQLite database for the cutoff data
    const query = `
      SELECT *
      FROM cutoff_ranks
      WHERE College_code = ? AND Year = ? AND Round = ?
      ORDER BY Round ASC;
    `;

    db.all(query, [collegeCode, parseInt(year),parseInt(round)], (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        return message.reply('An error occurred while fetching the data.');
      }

      if (rows.length === 0) {
        return message.reply(`No cutoff data found for ${collegeCode} in ${year}.`);
      }

      const lowerBranchCode = branchCode.toLowerCase();


      
      let matchingRow = rows.find(row =>
        row.Unknown_0.toLowerCase() === lowerBranchCode
      );
      if (!matchingRow) {
        // Regex for matching branchcode
        matchingRow = rows.find(row =>
          row.Unknown_0.toLowerCase().split(/[\s-/]+/).some(word => word.startsWith(lowerBranchCode))
        );
      }

      if (!matchingRow) {
        return message.reply(
          `Branch code "${branchCode}" not found for ${collegeCode} in ${year}.`
        );
      }

      // Retrieve the cutoff value from the specified category column
      const cutoffValue = matchingRow[category];
      const collegeName = matchingRow.College;

      if (typeof cutoffValue === 'undefined' || cutoffValue === null) {
        return message.reply(
          `Category "${category}" not found for ${collegeCode} in ${year} round ${round}.`
        );
      }

      // response
      let response = `Cutoff for ${collegeName} (${collegeCode}) - ${matchingRow.Unknown_0} (${category}) in ${year}, Round ${round} Value: ${cutoffValue}`;


      // Sending the response
      message.reply(response);
    });
  }
});

// Log in the bot using the token
client.login(token);