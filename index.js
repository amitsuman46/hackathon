require('dotenv').config();
const express = require('express');
const { joinGoogleMeet } = require('./services/meetService');
const { processTranscript } = require('./services/nlpService');
const { sendSummaryEmail } = require('./services/emailService');
const { generateSpeech } = require('./services/ttsService');

const app = express();

const text = "Hello team, this is your Virtual Scrum Master. Let's discuss pending tasks. How are you today, Raj."
// generateSpeech(text);

app.get('/meet/join', async (req, res) => {
  const { code } = req.query;
  console.log("Code",code);
  await joinGoogleMeet(code);
  res.send('Joining Google Meet...',code);
});

app.get('/summary/send', async (req, res) => {
  const transcript = "Dummy transcript for testing.";
  const summary = await processTranscript(transcript);
  await sendSummaryEmail(summary);
  res.send('Summary email sent!');
});

app.listen(7700, () => {
  console.log('Server running on http://localhost:7700');
});
