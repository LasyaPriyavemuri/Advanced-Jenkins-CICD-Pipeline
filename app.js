const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello from Jenkins CI/CD Pipeline! Version 1.0');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
});
