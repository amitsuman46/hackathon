const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const dataFolder = path.join(__dirname, "../data");

// Ensure the data folder exists
if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

function transcribeAudio(audioFile) {
    return new Promise((resolve, reject) => {
        const command = `whisper "${audioFile}" --model small --output_dir "${dataFolder}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${error.message}`);
            } else if (stderr) {
                console.log(`Warning: ${stderr}`);
            }
            resolve(stdout);
        });
    });
}

// Example usage
const audioFile = path.join(__dirname, "../output.mp3");  // Replace with your actual file

transcribeAudio(audioFile)
    .then((transcription) => {
        console.log("Transcription completed. All files saved in:", dataFolder);
    })
    .catch((err) => console.error(err));
