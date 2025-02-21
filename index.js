require('dotenv').config();
const express = require('express');
const { joinGoogleMeet } = require('./services/meetService');
const { processTranscript } = require('./services/nlpService');
const { sendSummaryEmail } = require('./services/emailService');

const app = express();

app.get('/meet/join', async (req, res) => {
  const { code } = req.query;
  await joinGoogleMeet(code);
  res.send('Joining Google Meet...');
});

app.get('/summary/send', async (req, res) => {
  const transcript = "Dummy transcript for testing.";
  const summary = await processTranscript(transcript);
  await sendSummaryEmail(summary);
  res.send('Summary email sent!');
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
