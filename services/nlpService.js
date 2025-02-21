const axios = require('axios');

const processTranscript = async (transcript) => {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Extract task updates from the meeting transcript.',
          },
          {
            role: 'user',
            content: transcript,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error processing transcript:', error);
  }
};

module.exports = { processTranscript };
