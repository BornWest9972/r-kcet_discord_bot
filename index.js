const { default: axios } = require('axios');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { response } = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const { url } = require('inspector');
const path = require('path');
const { text } = require('stream/consumers');
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
const sdb = new sqlite3.Database('./kcet24r1.db');




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

    const [, collegeCode, year, branchCode, category, round] = args
    // Query the SQLite database for the cutoff data
    const query = `
      SELECT *
      FROM cutoff_ranks
      WHERE College_code = ? AND Year = ? AND Round = ?
      ORDER BY Round ASC;
    `;

    db.all(query, [collegeCode, parseInt(year), parseInt(round)], (err, rows) => {
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
  else if (message.content.startsWith('?scutoff')) {
    const params = message.content.split(' ');

    // Validate the number of parameters
    if (params.length !== 4) {
      return message.reply('Invalid format. Please enter in format `?scutoff <Category> <Stream> <CollegeCode>`.');
    }

    const [, category_allotted, stream, courseCode] = params;

    // Special case for SNQ quota
    /*if (category_allotted === 'SNQ') {
      return message.reply("Darling, wait! Your messiah is working on the SNQ quota problem. Till then, see other categories.");
    }*/

    // Query the database
    const queries = `
      SELECT * 
      FROM data 
      WHERE category_allotted = ? AND stream = ? AND course_code LIKE ?
      ORDER BY rank ASC;
    `;

    sdb.all(queries, [category_allotted, stream, `${courseCode}%`], (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        return message.reply(`An error occurred while fetching the data: ${err.message}`);
      }

      // Handle empty results
      if (!rows || rows.length === 0) {
        return message.reply(`No data found for ${category_allotted} in ${stream} with course code ${courseCode}.`);
      }

      // Process and format the results
      const answer = rows.map(row => {
        return `College: ${row.college_name}, Branch: ${row.course_name}, Cutoff: ${row.rank}`;
      });

      // Combine all results into a single string
      const response = `Results for ${category_allotted} in ${stream} with course code ${courseCode}:\n${answer.join('\n')}`;

      // Debugging: Log the total rows and response length
      console.log(`Total rows fetched: ${rows.length}`);
      console.log(`Response length: ${response.length}`);

      // Check if the response exceeds Discord's message length limit
      if (response.length > 4000) {
        return message.reply('The response is too large to send in a single message. Please refine your query.');
      }

      // Send the response
      message.reply(response);
    });
  }
  else if (message.content.startsWith('?SNQ')) {
    parame = message.content.split(' ')
    if (parame.length !== 3) {
      return message.reply('Invalid format please write as  <stream> <Coursecode> ')
    }
    const [, stream, course_code] = parame;
    const quers = `
    SELECT * FROM Data WHERE  category_allotted='SNQ' AND stream = ?  AND course_code = ? 
    ORDER BY rank DESC
    LIMIT 1;`
    sdb.all(quers, [stream, course_code], (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        return message.reply(`An error occurred while fetching the data: ${err.message}`);
      }

      // Handle empty results
      if (!rows || rows.length === 0) {
        return message.reply(`No data found for SNQ in ${stream} with course code ${course_code}.`);
      }
      const row = rows[0];

      // Format the result
      const response = `Results for SNQ in ${stream} with course code ${course_code}:\n` +
        `College: ${row.college_name}, Cutoff: ${row.rank}`;

      message.reply(response)

    })
  }
  else if (message.content.startsWith("?Shinobu")) {
    const data = async () => {
      
      a=message.content.split(' ')
     
      const str =["waifu","neko","shinobu","megumin","kiss","pat","blush","smile","wave","happy","dance"]
      const category = str[Math.floor(Math.random()*str.length)]
      console.log(category)
      const url = `https://api.waifu.pics/sfw/${category}`
      try {
        const response = await axios.get(url);
        const imageUrl = response.data.url;
        const image = await axios({
          url: imageUrl,
          method: 'GET',
          responseType: 'stream', // Use stream for large images
        });

        // Send the image as an attachment
        message.channel.send({
          files: [{
            attachment: image.data,
            name: 'waifu.jpg', // Optional: Customize the file name
          }]
        });

      } catch (err) {
        console.log(`${err}`)
      }
      
    }
    data()
  }
  else if(message.content.startsWith("$placement")){
    
      const text = message.content.split(' ')
      
      if(text[1]==="bit"){
        message.reply("https://drive.google.com/drive/folders/1dLRDVS1Dlx1jnlN6GcmMc-mFYTclSCxM?usp=drive_link")
      }
      if(text[1]==="msrit"){
        message.reply("https://drive.google.com/drive/folders/1i3Ne5Bqp5zuPmFd491xyx_Uz8RdwQfRE?usp=drive_link")
      }
      if(text[1]==="bmsce"){
        message.reply("https://drive.google.com/drive/folders/1YaZvCXDyAyMUQ8IJ46cJeqkjK8EiqezS?usp=drive_link")
      }
      if(text[1]==="cmrit"){
        message.reply("https://drive.google.com/drive/folders/1zC8GJ33bxBepIOLUxygl9x_R-Ppp9OLt?usp=drive_link")
      }
      if(text[1]==="dsce"){
        message.reply("https://drive.google.com/drive/folders/1W2fXKaGaT6sF8m9563_GMB2EvR5fQbUk?usp=drive_link")
      }
      if(text[1]==="nmit"){
        message.reply("https://drive.google.com/drive/folders/1tK69cw64MK4dAx_QY-8a4C4eEbE_Cfz5?usp=drive_link")
      }
      if(text[1]==="rvce"){
        message.reply("https://drive.google.com/drive/folders/1wja83jnFkm3KVEodz11uKpWdXF9TJRLX?usp=drive_link")
      }
      if(text[1]==="pes"){
        message.reply("https://docs.google.com/spreadsheets/d/1SnSNM_GnuTwIJ0oI3bHt9nAnDQXfqwIhT8JHEwq727g/edit?gid=0#gid=0")
      }

      
      

    
  }
}

);

// Log in the bot using the token
client.login(token);
