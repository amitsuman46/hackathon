const { SpeechClient } = require('@google-cloud/speech');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

const googleConfig = {
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
};

const speechClient = new SpeechClient(googleConfig);
const ttsClient = new TextToSpeechClient(googleConfig);

module.exports = { speechClient, ttsClient };
