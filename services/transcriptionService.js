const fs = require('fs');
const { speechClient } = require('../config/googleConfig');

const transcribeAudio = async (audioStream) => {
  const request = {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
    },
    interimResults: true,
  };

  const recognizeStream = speechClient
    .streamingRecognize(request)
    .on('data', (data) => {
      const transcript = data.results[0].alternatives[0].transcript;
      console.log(`Transcript: ${transcript}`);

      // Save transcript to file
      fs.appendFileSync('data/transcripts/transcript.txt', `${transcript}\n`);
    })
    .on('error', (error) => console.error('Transcription Error:', error))
    .on('end', () => console.log('Transcription ended.'));

  audioStream.pipe(recognizeStream);
};

module.exports = { transcribeAudio };
