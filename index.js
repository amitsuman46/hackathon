require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { processTranscript } = require('./services/nlpService');
const { sendSummaryEmail } = require('./services/emailService');
const { generateSpeech } = require('./services/ttsService');
const { joinGoogleMeet, joinGMeetStandup, joinGMeetMeeting } = require('./services/googleMeetWebSpeechService');

const app = express();

app.use(cors());


// Add middleware to parse JSON bodies
app.use(express.json()); // <-- This is the crucial missing piece

app.get('/meet/join', async (req, res) => {
  const { code } = req.query;
  console.log("Code", code);
  await joinGoogleMeet(code);
  res.send('Joining Google Meet...');
});

app.get('/summary/send', async (req, res) => {
  const transcript = "Dummy transcript for testing.";
  const summary = await processTranscript(transcript);
  await sendSummaryEmail(summary);
  res.send('Summary email sent!');
});

const activeMeetings = new Set();

app.post('/gmeet/standup', async (req, res) => {
  try {
    // Check if body exists first
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body is missing or empty' });
    }

    const { code, participantDetails, managerDetails } = req.body;

    // Validate required fields
    if (!code || !participantDetails || !managerDetails) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: {
          code: !code ? 'Missing' : 'Provided',
          participantDetails: !participantDetails ? 'Missing' : 'Provided',
          managerDetails: !managerDetails ? 'Missing' : 'Provided'
        }
      });
    }

    // Check if already processing this meeting
    if (activeMeetings.has(code)) {
      return res.status(429).json({
        message: 'Our Virtual Scrum Master is currently busy with different meeting. Please try again later.',
        status: 'busy'
      });
    }

    // Mark meeting as active
    activeMeetings.add(code);

    joinGMeetStandup({ code, participantDetails, managerDetails }).finally(() => {
      // Clean up when done
      activeMeetings.delete(code);
    });
    res.status(200).json({ message: 'Virtual Scrum Master will join your meeting shortly. Please wait.' });

  } catch (error) {
    console.error('Error in /gmeet/standup:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.post('/gmeet/meeting', async (req, res) => {
  try {
    // Check if body exists first
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body is missing or empty' });
    }

    const { code, managerDetails } = req.body;

    // Validate required fields
    if (!code || !managerDetails) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: {
          code: !code ? 'Missing' : 'Provided',
          managerDetails: !managerDetails ? 'Missing' : 'Provided'
        }
      });
    }

    // Check if already processing this meeting
    if (activeMeetings.has(code)) {
      return res.status(429).json({
        message: 'Our Virtual Scrum Master is currently busy with different meeting. Please try again later.',
        status: 'busy'
      });
    }

    // Mark meeting as active
    activeMeetings.add(code);

    joinGMeetMeeting({ code, managerDetails }).finally(() => {
      // Clean up when done
      activeMeetings.delete(code);
    });
    res.status(200).json({ message: 'Virtual Scrum Master will join your meeting shortly. Please wait.' });

  } catch (error) {
    console.error('Error in /gmeet/standup:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.listen(7700, () => {
  console.log('Server running on http://localhost:7700');
});