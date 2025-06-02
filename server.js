const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
const https = require('https');

setInterval(() => {
  https.get('https://r-kcet-discord-bot.onrender.com/health', (res) => {
    console.log(`Self-ping status code: ${res.statusCode}`);
  }).on('error', (e) => {
    console.error(`Self-ping error: ${e.message}`);
  });
}, 5 * 60 * 1000); // Every 5 minutes


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Health check server listening on port ${PORT}`);
});
