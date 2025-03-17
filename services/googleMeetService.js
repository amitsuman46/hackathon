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
// const geminiModel = googleAI.getGenerativeModel({ model: 'gemini-1.5-flash', geminiConfig });
// const chatSession = geminiModel.startChat({
//     history: [], // Stores conversation history
//     generationConfig: geminiConfig,
// });

let chatSession;

const initializeChatSession = () => {
    chatSession = geminiModel.startChat({
        history: [], // Initialize history
        generationConfig: geminiConfig,
    });
};

const geminiModel = googleAI.getGenerativeModel({ model: 'gemini-1.5-flash', geminiConfig });
initializeChatSession(); // Initialize session on startup

// Updated team members and tasks
const teamTasks = [
    // { assignee: 'Rajkumar Selvaraj', task: 'Gather Requirements', status: 'In Progress' },
    { assignee: 'Amit Suman', task: 'UI/UX Design', status: 'In Progress' },
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
        await page.setViewport({ width: 1920, height: 1080 });

        // Join Google Meet using the provided meeting code
        await page.goto(`https://meet.google.com/${meetCode}`);
        await page.waitForTimeout(6000);

        // If prompted, fill in your name
        const isNameFieldPresent = await page.$('input[aria-label="Your name"]');
        if (isNameFieldPresent) {
            console.log("Name field detected, entering name...");
            await page.type('input[aria-label="Your name"]', 'Virtual Scrum Master');
            await page.keyboard.press('Enter');
            // await page.waitForTimeout(3000);
            await page.waitForSelector('button[aria-label="People"]', { timeout: 50000 }); //wait for people button to be available

            const peopleButton = await page.$('button[aria-label="People"]');
            if (peopleButton) {
                console.log("Clicking 'People' button...");
                await peopleButton.click();
                // Wait for the participants panel to appear after clicking
                await page.waitForSelector('[role="list"][aria-label="Participants"]', { timeout: 5000 });
            } else {
                console.log("'People' button not found, assuming participants are already visible.");
                await page.waitForSelector('[role="list"][aria-label="Participants"]', { timeout: 5000 });
            }
        }


        const extractParticipants = async (page) => {
            try {
                console.log("Extracting participant list...");
                async function evaluatePage() {
                    return await page.evaluate(() => {
                        const participantList = document.querySelectorAll('[role="list"][aria-label="Participants"] div[role="listitem"]');

                        return Array.from(participantList)
                            .map(item => {
                                const nameElement = item.querySelector('span.zWGUib'); // Specific name class
                                return nameElement ? nameElement.innerText.trim() : null;
                            })
                            .filter(name => name && name !== "" && name !== 'Virtual Scrum Master'); // Remove empty names
                    });
                }
                // Extract the participant names from the DOM
                let participants = evaluatePage();
                console.log(participants, ' ****** ');
                return participants || [];
            } catch (error) {
                console.error("Error extracting participants:", error);
                return [];
            }
        };

        // Extract participant list
        let participants = await extractParticipants(page);
        //keep checking after every min.
        setInterval(async () => {
            let tempparticipants = await extractParticipants(page);
            let checkNewParticipants = participants.join() === tempparticipants.join();
            if (!checkNewParticipants) {
                participants = tempparticipants;
                //trigger the function to greet new participants..
            }
            console.log("Updated participants", participants);
        }, 10000);
        console.log("Participants in the meeting:", participants);

        // Speak Welcome Message
        console.log('Bot is speaking...');
        say.speak("Hello Team, Good morning! Let's start our Scrum meeting.", null, 1.0, async () => {
            await askForUpdates();
            //await finalStatusUpdates();
        });



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
        let currentIndex = 0;
        // Function to ask for team updates
        // const askForUpdates = async () => {
        //     for (const memberDet of teamTasks) {
        //         const member = memberDet?.assignee;
        //         // Step 1: Speak to the member
        //         console.log(`Asking ${member} for task update...`);
        //         await speak(`${member}, please provide your task update.`);

        //         const audioFile = path.join(dataFolder, `${member}.mp3`);

        //         // Step 2: Record audio until silence
        //         console.log(`Recording response from ${member}...`);
        //         try {
        //             await recordAudioUntilSilence(audioFile, 3);
        //             console.log(`Audio recording complete for ${member}`);
        //         } catch (err) {
        //             console.error(`Error recording audio for ${member}:`, err);
        //             continue; // Skip to the next member if recording fails
        //         }

        //         // Step 3: Transcribe the audio
        //         console.log(`Transcribing audio for ${member}...`);
        //         let transcription;
        //         try {
        //             transcription = await transcribeAudio(audioFile, dataFolder);
        //             console.log(`${member}'s response: ${transcription}`);
        //         } catch (err) {
        //             console.error(`Error transcribing audio for ${member}:`, err);
        //             continue; // Skip to the next member if transcription fails
        //         }

        //         // Step 4: Process the response with Gemini AI
        //         console.log(`Processing response for ${member} with Gemini AI...`);
        //         try {
        //             const botResponse = await processWithGeminiTaskUpdate(transcription, memberDet);
        //             console.log(`Bot response for ${member}: ${botResponse}`);

        //             // Step 5: Speak the bot response
        //             await speak(botResponse);
        //         } catch (err) {
        //             console.error(`Error processing Gemini AI response for ${member}:`, err);
        //         }

        //         // ✅ Wait for a few seconds before moving to the next member
        //         console.log(`Waiting before asking the next member...`);
        //         await new Promise((resolve) => setTimeout(resolve, 2000));
        //     }
        //     console.log("All team updates collected.");
        //     await finalStatusUpdates();
        // };

        const askForUpdates = async () => {
            console.log('🚀 Starting to ask for team updates...');

            while (currentIndex < participants.length) {
                const participant = participants[currentIndex];
                console.log(`🗣️ Asking ${participant} for task update...`);

                const taskDetail = teamTasks.find(
                    (task) => task.assignee.toLowerCase() === participant.toLowerCase()
                );

                try {
                    // Step 1: Speak to the member
                    const taskMessage = taskDetail
                        ? `${participant}, please provide an update on your task: ${taskDetail.task}.`
                        : `${participant}, if you have any updates to share in this standup, please speak up and provide them.`;

                    console.log(`🎙️ Speaking to ${participant}...`);
                    await speak(taskMessage);

                    // Step 2: Record audio until silence (⚠️ Handle failure gracefully)
                    const audioFile = path.join(dataFolder, `${participant}.mp3`);
                    console.log(`🎧 Recording response from ${participant}...`);

                    try {
                        await recordAudioUntilSilence(audioFile, 3); // ❗ Fails → Skip participant
                        console.log(`✅ Audio recording complete for ${participant}`);
                    } catch (error) {
                        console.warn(`⚠️ Recording failed for ${participant}:`, error.message);
                        // 🏃‍♂️ Skip to next participant
                        moveToNextParticipant(participant);
                        continue;
                    }

                    // Step 3: Transcribe the audio
                    console.log(`🔎 Transcribing audio for ${participant}...`);
                    const transcription = await transcribeAudio(audioFile, dataFolder);
                    if (!transcription) {
                        console.warn(`⚠️ No transcription available for ${participant}`);
                        moveToNextParticipant(participant);
                        continue;
                    }
                    console.log(`${participant}'s response: ${transcription}`);

                    // Step 4: Process the response with Gemini AI
                    const prompt = taskDetail
                        ? `You are a Scrum Master conducting a standup meeting. 
        The team member ${taskDetail.assignee} is working on the task: "${taskDetail.task}".
        Here is their update: "${transcription}".
        Acknowledge the update positively and suggest improvements if necessary.`
                        : `You are a Scrum Master conducting a standup meeting.
        The team member ${participant} shared the following update: "${transcription}".
        Acknowledge the update positively and suggest improvements if necessary.`;

                    console.log(`🤖 Processing response for ${participant} with Gemini AI...`);
                    const botResponse = await processWithGeminiTaskUpdate(prompt);
                    if (botResponse) {
                        console.log(`💬 Bot response for ${participant}: ${botResponse}`);
                        await speak(botResponse);
                    } else {
                        console.warn(`⚠️ No response from Gemini AI for ${participant}`);
                    }
                } catch (error) {
                    console.error(`❌ Error processing update for ${participant}:`, error);
                }

                // ✅ Move to next participant
                moveToNextParticipant(participant);

                console.log('🔄 Updated participants list:', participants);

                // ✅ Wait before asking the next participant
                console.log(`⏳ Waiting before asking the next member...`);
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }

            console.log('✅ All team updates collected.');
            await finalStatusUpdates();
        };

        const moveToNextParticipant = (currentParticipant) => {
            const nextIndex = participants.findIndex((p) => p === currentParticipant) + 1;
            currentIndex = nextIndex < participants.length ? nextIndex : 0;
        };


        const finalStatusUpdates = async () => {
            const momPrompt = `You are a Scrum Master summarizing a standup meeting. Based on the transcribed updates from the team, generate a structured Minutes of Meeting (MoM), including:
Individual Updates – Summarize progress shared by each team member.
Team Progress – Highlight overall progress towards sprint goals.
Blockers & Challenges – List any reported blockers or dependencies.
Areas for Improvement – Suggest process enhancements or action items.
Format the response in a clear and concise email addressed to the manager, ensuring professionalism and readability. Conclude with next steps and any required follow-ups.`;
            const botMOMUpdate = await processWithGeminiFinalStatusUpdate(momPrompt);
            console.log('botMOMUpdate ', botMOMUpdate);
            const finalStatusPrompt = `You are a Scrum Master summarizing today's standup meeting. Provide a brief and clear verbal summary covering:
Overall Team Progress – Key milestones achieved.
Individual Highlights – Notable updates from team members.
Blockers & Challenges – Any issues requiring attention.
Next Steps – Immediate action items and priorities.
Keep it concise (within 3-5 sentences) and easy to understand so that everyone on the call is aligned.`;
            const botFinalStatusUpdate = await processWithGeminiFinalStatusUpdate(finalStatusPrompt);
            console.log('botFinalStatusUpdate ', botFinalStatusUpdate);
            say.speak(botFinalStatusUpdate);
        };

    } catch (error) {
        console.error('Error in Google Meet bot:', error);
    }
};

const recordAudioUntilSilence = (filePath, silenceDuration = 3, retryCount = 0) => {
    const MAX_RETRIES = 2;

    return new Promise((resolve, reject) => {
        console.log(`🎙️ Attempt ${retryCount + 1}/${MAX_RETRIES}: Recording audio to ${filePath}...`);

        const command = [
            "ffmpeg",
            "-f", "dshow",
            "-i", 'audio="CABLE Output (VB-Audio Virtual Cable)"', // Audio input source
            "-rtbufsize", "256M",
            "-af", `silencedetect=noise=-30dB:d=${silenceDuration}`,
            "-t", "300",
            "-preset", "veryfast",
            "-acodec", "libmp3lame",
            "-b:a", "192k",
            "-ar", "44100",
            "-ac", "2",
            filePath
        ];

        const process = spawn(command[0], command.slice(1), { shell: true });

        process.stderr.on("data", (data) => {
            const output = data.toString();

            if (output.includes("silence_start")) {
                console.log("🔇 Silence detected! Stopping recording...");

                if (process.pid) {
                    console.log(`Killing process PID: ${process.pid}`);
                    exec(`taskkill /PID ${process.pid} /T /F`, async (err) => {
                        if (err) {
                            console.error("❌ Error killing process:", err);
                            reject(err);
                        } else {
                            console.log("✅ Recording stopped successfully.");
                            try {
                                await validateAudioFile(filePath);
                                resolve(filePath);
                            } catch (err) {
                                if (retryCount < MAX_RETRIES - 1) {
                                    console.warn(`⚠️ Retrying recording (${retryCount + 2}/${MAX_RETRIES})...`);
                                    await speak("If you were speaking while muted, please unmute and say it again.");
                                    // 🔁 Retry recording
                                    const newPath = await recordAudioUntilSilence(filePath, silenceDuration, retryCount + 1);
                                    resolve(newPath);
                                } else {
                                    console.warn(`🚨 Max retry attempts reached for ${filePath}. Moving on...`);
                                    resolve(null); // Resolve with null to gracefully handle failure
                                }
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
                if (retryCount < MAX_RETRIES - 1) {
                    console.warn(`⚠️ Retrying recording (${retryCount + 2}/${MAX_RETRIES})...`);
                    await speak("If you were speaking while muted, please unmute and say it again.");
                    // 🔁 Retry recording
                    const newPath = await recordAudioUntilSilence(filePath, silenceDuration, retryCount + 1);
                    resolve(newPath);
                } else {
                    console.warn(`🚨 Max retry attempts reached for ${filePath}. Moving on...`);
                    resolve(null); // Resolve with null to gracefully handle failure
                }
            }
        });

        process.on("error", (err) => {
            console.error("❌ Recording error:", err);
            reject(err);
        });
    });
};

const validateAudioFile = (filePath) => {
    return new Promise((resolve, reject) => {
        const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
        if (fileSize < 1024) { // If size is < 1KB, consider it invalid
            console.warn(`⚠️ Audio file is too small (${fileSize} bytes). Possibly no input.`);
            reject(new Error("Audio file is empty or invalid."));
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

// Function to process response with Gemini AI (Placeholder)
const processWithGeminiTaskUpdate = async (prompt) => {
    try {
        if (!chatSession) {
            console.error("Chat session not initialized. Re-initializing...");
            initializeChatSession();
        }
        const result = await chatSession.sendMessage(prompt);
        //const result = await geminiModel.generateContent(prompt);
        const geminiResponse = result.response.text();
        if (chatSession.history) {
            chatSession.history.push({
                role: memberDetail.assignee,
                parts: [{ text: prompt }],
            });
            chatSession.history.push({
                role: 'model',
                parts: [{ text: geminiResponse }],
            });
        } else {
            console.warn('Chat session history is undefined');
        }
        // let nextQuestion = '';
        // const followUpQuestionRegex = /(\?|could you|can you|would you|please clarify|elaborate|provide more details)/i;
        // if (!followUpQuestionRegex.test(geminiResponse)) {
        //     conversationState.currentIndex++;
        //     // Ask the next team member or conclude standup
        //     nextQuestion = await askTeamMember();
        // }
        console.log('gemini Response ' + geminiResponse)
        return geminiResponse;
    } catch (error) {
        console.error('Error fetching response from Gemini API:', error);
    }
};

const processWithGeminiFinalStatusUpdate = async (prompt) => {
    try {
        const result = await chatSession.sendMessage(prompt);
        //const result = await geminiModel.generateContent(prompt);
        const geminiResponse = result.response.text();
        console.log('gemini Response final status update & MOM ' + geminiResponse)
        return geminiResponse;
    } catch (error) {
        console.error('Error fetching response from Gemini API:', error);
    }
};

// Export function
module.exports = { joinGoogleMeet };
