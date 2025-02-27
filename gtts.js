const gTTS = require('gtts');
const fs = require('fs');

// Function to convert text to speech
function convertTextToMp3(text) {
    const gtts = new gTTS(text, 'en'); // 'en' is the language code for English

    // Save the audio file
    gtts.save('output.mp3', function (err, result) {
        if (err) {
            console.log('Error:', err);
        } else {
            console.log('Audio content written to file: output.mp3');
        }
    });
}

// Example text to convert
const inputText = "Hello! This is a free text-to-speech conversion example using gTTS.";
convertTextToMp3(inputText);
