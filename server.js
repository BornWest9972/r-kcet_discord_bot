const express = require('express');
const app = express();

const PORT =  8000;

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.listen(PORT, () => {
  console.log(`Health check server listening on port ${PORT}`);
});
