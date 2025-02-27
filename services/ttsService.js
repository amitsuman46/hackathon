// require('dotenv').config();
// const axios = require('axios');
// const fs = require('fs');

// const generateSpeech = async (text) => {
//   try {
//     // Replace this with the voice_id you got from Step 1
//     const voiceId = 'IKne3meq5aSn9XLyUdCD';
    
//     const response = await axios.post(
//       `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
//       {
//         text: text,
//         model_id: 'eleven_v2_flash',  // Recommended model for English
//         voice_settings: {
//           stability: 0.75,
//           similarity_boost: 0.75
//         }
//       },
//       {
//         headers: {
//           'Content-Type': 'application/json',
//           'xi-api-key': process.env.ELEVEN_LABS_API_KEY,
//         },
//         responseType: 'arraybuffer',
//       }
//     );

//     fs.writeFileSync('output.mp3', response.data);
//     console.log('Audio saved as output.mp3');
//   } catch (error) {
//     console.error('Error generating speech:', error.response?.data);
//   }
// };

// module.exports = { generateSpeech };


require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');

const generateSpeech = async (text) => {
  try {
    // Replace this with the voice_id you got from Step 1
    const voiceId = 'IKne3meq5aSn9XLyUdCD';
    
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        text: text,
        model_id: 'eleven_v2_flash',  // Recommended model for English
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVEN_LABS_API_KEY,
        },
        responseType: 'arraybuffer',
      }
    );

    // Save as MP3 first
    fs.writeFileSync('output.mp3', response.data);
    console.log('Audio saved as output.mp3');

    // Convert MP3 to WAV using FFmpeg
    const outputWav = 'output.wav';
    const ffmpegCommand = `ffmpeg -i output.mp3 -acodec pcm_s16le -ar 44100 -ac 2 ${outputWav}`;
    exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('Error converting MP3 to WAV:', error);
      } else {
        console.log(`Audio converted and saved as ${outputWav}`);
      }
    });

  } catch (error) {
    console.error('Error generating speech:', error.response ? error.response.data : error.message);
  }
};

module.exports = { generateSpeech };
