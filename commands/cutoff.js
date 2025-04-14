const { SlashCommandBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../cutoffs.db');
const db = new sqlite3.Database(dbPath);

// setting the queries needed
module.exports = {
  data: new SlashCommandBuilder()
    .setName('cutoff')
    .setDescription('Get cutoff rank for a college, branch, category, and round.')
    .addStringOption(option =>
      option.setName('college_code')
        .setDescription('Enter the college code')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('year')
        .setDescription('Enter the year')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('branch_code')
        .setDescription('Enter the branch short name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Enter the category')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('round')
        .setDescription('Enter the counseling round')
        .setRequired(true)),
  // retriveing the queries from user
  async execute(interaction) {
    const collegeCode = interaction.options.getString('college_code');
    const year = interaction.options.getInteger('year');
    const branchCode = interaction.options.getString('branch_code');
    const category = interaction.options.getString('category');
    const round = interaction.options.getInteger('round');

    const query = `
      SELECT *
      FROM cutoff_ranks
      WHERE College_code = ? AND Year = ? AND Round = ?
      ORDER BY Round ASC;
    `;

    db.all(query, [collegeCode, year, round], (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        return interaction.reply({ content: 'An error occurred while fetching the data.', ephemeral: true });
      }

      if (rows.length === 0) {
        return interaction.reply({ content: `No cutoff data found for ${collegeCode} in ${year}, round ${round}.`, ephemeral: true });
      }

      const lowerBranchCode = branchCode.toLowerCase();

      let matchingRow = rows.find(row =>
        row.Unknown_0.toLowerCase() === lowerBranchCode
      );

      if (!matchingRow) {
        matchingRow = rows.find(row =>
          row.Unknown_0.toLowerCase().split(/[\s-/]+/).some(word => word.startsWith(lowerBranchCode))
        );
      }

      if (!matchingRow) {
        return interaction.reply({ content: `Branch "${branchCode}" not found for ${collegeCode} in ${year}.`, ephemeral: true });
      }

      const cutoffValue = matchingRow[category];
      const collegeName = matchingRow.College;

      if (typeof cutoffValue === 'undefined' || cutoffValue === null) {
        return interaction.reply({ content: `Category "${category}" not found for ${collegeCode} in ${year}, round ${round}.`, ephemeral: true });
      }

      const response = `Cutoff for ${collegeName} (${collegeCode}) - ${matchingRow.Unknown_0} (${category}) in ${year}, Round ${round}:\nValue: ${cutoffValue}`;
      interaction.reply(response);
    });
  },
};
