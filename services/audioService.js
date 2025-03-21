const { exec, spawn } = require('child_process');
const fs = require('fs');
const say = require('say');

const recordAudioUntilSilence = (filePath, silenceDuration = 2, retryCount = 0) => {
    return new Promise((resolve) => {
        console.log(`🎙️ Attempt ${retryCount + 1}/3: Recording audio to ${filePath}...`);
        const command = [
            "ffmpeg",
            "-f", "dshow",
            "-i", 'audio="CABLE Output (VB-Audio Virtual Cable)"',
            "-rtbufsize", "256M",
            "-af", `silencedetect=noise=-30dB:d=${silenceDuration}`,
            "-t", "300",
            "-preset", "ultrafast",
            "-acodec", "libmp3lame",
            "-b:a", "192k",
            "-ar", "44100",
            "-ac", "2",
            filePath
        ];
        const process = spawn(command[0], command.slice(1), { shell: true });
        process.stderr.on("data", (data) => {
            const output = data.toString();
            //console.log(output);
            if (output.includes("silence_start")) {
                console.log("🔇 Silence detected! Stopping recording...");
                if (process.pid) {
                    exec(`taskkill /PID ${process.pid} /T /F`, async (err) => {
                        if (err) {
                            console.error("❌ Error killing process:", err);
                            resolve(null); // ✅ Resolve null instead of rejecting
                        } else {
                            console.log("✅ Recording stopped successfully.");
                            try {
                                await validateAudioFile(filePath);
                                resolve(filePath);
                            } catch (err) {
                                console.warn(`⚠️ Audio validation failed: ${err?.message || 'Unknown error'}`);
                                resolve(null); // ✅ Resolve with null instead of rejecting
                            }
                        }
                    });
                }
            }
        });
        process.on("close", async (code) => {
            console.log(`FFmpeg process exited with code ${code}`);
            try {
                await validateAudioFile(filePath);
                resolve(filePath);
            } catch (err) {
                console.warn(`⚠️ Audio validation failed: ${err?.message || 'Unknown error'}`);
                resolve(null); // ✅ Resolve with null instead of rejecting
            }
        });
        process.on("error", (err) => {
            console.error("❌ Recording error:", err);
            resolve(null); // ✅ Resolve with null instead of rejecting
        });
    });
};

const validateAudioFile = (filePath) => {
    return new Promise((resolve, reject) => {
        const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
        if (fileSize < 1024) {
            console.warn(`⚠️ Audio file is too small (${fileSize} bytes). Possibly no input.`);
            reject(null); // ✅ Return `null` to signal empty input
        } else {
            resolve(filePath);
        }
    });
};


// Function to transcribe audio using Whisper
const transcribeAudio = (audioFile, dataFolder) => {
    return new Promise((resolve, reject) => {

        const command = `whisper "${audioFile}" --model tiny.en --output_dir "${dataFolder}" --language English --fp16 False --output_format txt`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${error.message}`);
            } else if (stderr) {
                console.log(`Warning: ${stderr}`);
            }
            resolve(stdout);
        });
    });
};

// Function to convert say.speak into a Promise
const speak = (text) => {
    return new Promise((resolve, reject) => {
        say.speak(text, null, 1.0, (err) => {
            if (err) {
                console.error("Error speaking:", err);
                reject(err);
            } else {
                console.log("Finished speaking");
                resolve();
            }
        });
    });
};

// Export functions for external use
module.exports = {
    speak,
    recordAudioUntilSilence,
    transcribeAudio,
};