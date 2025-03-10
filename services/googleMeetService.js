const puppeteer = require('puppeteer');
const say = require('say');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuration
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe'; // Adjust path as needed
const userDataDir = 'C:/Users/rajkumar.selvaraj/AppData/Local/Google/Chrome/User Data/Default'; // Change based on your profile
// const dataFolder = path.join(__dirname, 'data');
// if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });

// Load API Key
const API_KEY = process.env.GEMINI_API_KEY || '';
// Initialize Gemini API
const googleAI = new GoogleGenerativeAI(API_KEY);
const geminiConfig = {
    temperature: 0.9,
    topP: 1,
    topK: 1,
    maxOutputTokens: 4096,
};
const geminiModel = googleAI.getGenerativeModel({ model: 'gemini-1.5-flash', geminiConfig });

// Updated team members and tasks
const teamTasks = [
    // { assignee: 'Rajkumar', task: 'Gather Requirements', status: 'Completed' },
    { assignee: 'Amit', task: 'UI/UX Design', status: 'In Progress' },
];

// Conversation state
let conversationState = {
    currentIndex: 0,
    responses: {},
};

// Function to join Google Meet
const joinGoogleMeet = async (meetCode) => {
    try {
        // Define folder path based on the meeting code
        const dataFolder = path.join(__dirname, 'data', meetCode);

        // If the folder exists, delete it and recreate
        if (fs.existsSync(dataFolder)) {
            fs.rmSync(dataFolder, { recursive: true, force: true });
            console.log(`Deleted existing folder: ${dataFolder}`);
        }

        // Create a new folder
        fs.mkdirSync(dataFolder, { recursive: true });
        console.log(`Created new folder: ${dataFolder}`);
        
        console.log('Launching browser...');
        // Path to local Chrome installation
        const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
        const userDataDir = 'C:/Users/rajkumar.selvaraj/AppData/Local/Google/Chrome/User Data/Default';

        const browser = await puppeteer.launch({
            executablePath: chromePath,  // Use local Chrome
            headless: false,             // Show the browser
            userDataDir: userDataDir,    // Use real user profile
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-extensions',
                '--disable-infobars',
                '--start-maximized',
                '--use-fake-ui-for-media-stream',  // Auto-allow camera and microphone
                '--disable-blink-features=AutomationControlled', // Avoid detection
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });

        // Join Google Meet using the provided meeting code
        await page.goto(`https://meet.google.com/${meetCode}`);
        await page.waitForTimeout(6000);

        // If prompted, fill in your name
        const isNameFieldPresent = await page.$('input[aria-label="Your name"]');
        if (isNameFieldPresent) {
            console.log("Name field detected, entering name...");
            await page.type('input[aria-label="Your name"]', 'Virtual Scrum Master');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(3000);
        }

        // Speak Welcome Message
        console.log('Bot is speaking...');
        say.speak("Hello Team, Good morning! Let's start our Scrum meeting.", null, 1.0, async () => {
            await askForUpdates();
        });

        // Function to ask for team updates
        const askForUpdates = async () => {
            for (const memberDet of teamTasks) {
                const member = memberDet?.assignee;
                say.speak(`${member}, please provide your task update.`, null, 1.0, async () => {
                    const audioFile = path.join(dataFolder, `${member}.mp3`);
                    //await recordAudio(audioFile, 15); // Record for 15 seconds
                    await recordAudioUntilSilence(audioFile, 3)
                        .then(() => console.log('Audio recording complete'))
                        .catch((err) => console.error(err));
                    // Transcribe the response
                    const transcription = await transcribeAudio(audioFile, dataFolder)
                        .then((transcription) => {
                            console.log('Transcription completed. All files saved in: ***** ', dataFolder, transcription);
                            return transcription;
                        })
                        .catch((err) => console.error(err));

                    // Process response with Gemini AI (optional)
                    const botResponse = await processWithGemini(transcription, memberDet);
                    say.speak(botResponse);
                });

                await new Promise((resolve) => setTimeout(resolve, 20000)); // Wait for 20 sec before asking the next member
            }
        };
    } catch (error) {
        console.error('Error in Google Meet bot:', error);
    }
};

const recordAudioUntilSilence = (filePath, silenceDuration = 3) => {
    return new Promise((resolve, reject) => {
        console.log(`Recording audio to ${filePath}...`);

        const command = [
            "ffmpeg",
            "-f", "dshow",
            "-i", 'audio="CABLE Output (VB-Audio Virtual Cable)"', // Adjust your input source
            "-rtbufsize", "100M",
            "-af", `silencedetect=noise=-30dB:d=${silenceDuration}`,
            "-t", "300", // Max recording time of 5 minutes
            "-preset", "ultrafast",
            "-acodec", "libmp3lame",
            filePath
        ];

        const process = spawn(command[0], command.slice(1), { shell: true });

        process.stderr.on("data", (data) => {
            const output = data.toString();

            if (output.includes("silence_start")) {
                console.log("Silence detected! Stopping recording...");

                // Kill process properly
                if (process.pid) {
                    console.log(`Killing process PID: ${process.pid}`);
                    exec(`taskkill /PID ${process.pid} /T /F`, (err) => {
                        if (err) {
                            console.error("Error killing process:", err);
                            reject(err);
                        } else {
                            console.log("Recording stopped successfully.");
                            resolve(filePath);
                        }
                    });
                }
            }
        });

        process.on("close", (code) => {
            console.log(`FFmpeg process exited with code ${code}`);
            resolve(filePath);
        });

        process.on("error", (err) => {
            console.error("Recording error:", err);
            reject(err);
        });
    });
};


// Function to transcribe audio using Whisper
const transcribeAudio = (audioFile, dataFolder) => {
    return new Promise((resolve, reject) => {
        //const command = `whisper "${audioFile}" --model small --output_dir "${dataFolder}"`;
        //const command = `whisper "${audioFile}" --model tiny.en --output_dir "${dataFolder}" --language English --fp16 False`;
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

// Function to process response with Gemini AI (Placeholder)
const processWithGemini = async (text, memberDetail) => {
    // Call Gemini AI API here and return response (currently returns dummy text)
    // return `Got it, thank you! Your update has been noted.`;
    // Generate a task-specific follow-up based on the response
    const prompt = `You are a Scrum Master conducting a standup meeting. 
The team member ${memberDetail.assignee} is working on the task: "${memberDetail.task}".
Here is their update: "${text}".
1. If the response is **average**, acknowledge it positively and shortly.`;

    try {
        const result = await geminiModel.generateContent(prompt);
        const geminiResponse = result.response.text();
        // let nextQuestion = '';
        // const followUpQuestionRegex = /(\?|could you|can you|would you|please clarify|elaborate|provide more details)/i;
        // if (!followUpQuestionRegex.test(geminiResponse)) {
        //     conversationState.currentIndex++;
        //     // Ask the next team member or conclude standup
        //     nextQuestion = await askTeamMember();
        // }
        //res.json({ message: geminiResponse + " " + nextQuestion });
        return geminiResponse;
    } catch (error) {
        console.error('Error fetching response from Gemini API:', error);
        //res.status(500).json({ error: "Error processing the response." });
    }
};

// Export function
module.exports = { joinGoogleMeet };
