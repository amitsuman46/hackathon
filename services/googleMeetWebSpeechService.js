const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { processWithGeminiTaskUpdate,
    processWithGeminiFinalStatusUpdate } = require('./geminiAIService');
const { speak } = require('./audioService');
const sendEmail = require('./emailService');

const EventEmitter = require('events');
const eventEmitter = new EventEmitter();


// Configuration
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe'; // Adjust path as needed
const userDataDir = 'C:/Users/rajkumar.selvaraj/AppData/Local/Google/Chrome/User Data/Default'; // Change based on your profile

// Updated team members and tasks
const teamTasks = [
    { assignee: 'Rajkumar Selvaraj', task: 'Gather Requirements', status: 'In Progress' },
    { assignee: 'Amit Suman', task: 'UI/UX Design', status: 'In Progress' },
    { assignee: 'likitha', task: 'QA Automation', status: 'In Progress' },
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

        let page = await browser.newPage();
        await page.setViewport({ width: 1080, height: 720 });

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
                return participants || [];
            } catch (error) {
                console.error("Error extracting participants:", error);
                return [];
            }
        };

        // Extract participant list
        let participants = await extractParticipants(page);
        //keep checking after every min.
        let ClearParticipantsInt = null;
        ClearParticipantsInt = setInterval(async () => {
            let tempparticipants = await extractParticipants(page);
            let checkNewParticipants = participants.join() === tempparticipants.join();
            if (!checkNewParticipants) {
                participants = tempparticipants;
                //trigger the function to greet new participants..
            }
        }, 10000);
        console.log("Participants in the meeting:", participants);

        let currentRecognition = null;
        let lastSpeaker = '';
        let speakerSwitchTimeout = null;

        // let resolveSpeechResult; // Store resolver for dynamic response handling

        // await page.exposeFunction('onSpeechResult', (name, text) => {
        //     console.log(`${name} said: "${text}"`);
        //     if (resolveSpeechResult) {
        //         resolveSpeechResult({ name, text }); // Resolve the pending promise
        //         //resolveSpeechResult = null; // Reset after resolving
        //     }
        // });

        // const waitForSpeechResult = async (expectedName) => {
        //     let attempts = 0;
        //     return new Promise(async (resolve) => {
        //         const checkResponse = async () => {
        //             let responseReceived = false;

        //             resolveSpeechResult = (result) => {
        //                 if (result.name.toLowerCase() === expectedName.toLowerCase()) {
        //                     responseReceived = true;
        //                     resolve(result.text);
        //                     resolveSpeechResult = null; // Reset
        //                 } else {
        //                     console.warn(`⚠️ Ignoring response from ${result.name}, waiting for ${expectedName}`);
        //                 }
        //             };

        //             while (attempts < 2) {
        //                 await new Promise((r) => setTimeout(r, 7000)); // Wait 7s
        //                 if (responseReceived) return;

        //                 attempts++;
        //                 console.log(`🔄 No response from ${expectedName}. Attempt ${attempts}/2`);
        //                 await speak(`${expectedName}, if you were speaking while muted, please unmute and say it again.`);
        //             }

        //             // If still no response after 2 attempts
        //             console.log(`❌ Audio issue detected for ${expectedName}. Moving to the next member.`);
        //             await speak(`There is some audio issue for ${expectedName}. Moving to the next member.`);
        //             resolve(""); // Move on with an empty response
        //         };

        //         checkResponse();
        //     });
        // };

        let resolveSpeechResult; // Store resolver for dynamic response handling

        await page.exposeFunction('onSpeechResult', (name, text) => {
            console.log(`${name} said: "${text}"`);
            if (resolveSpeechResult) {
                resolveSpeechResult({ name, text }); // Resolve the pending promise
                //resolveSpeechResult = null; // Reset after resolving
            }
        });

        // Function to wait for response from speaker
        const waitForSpeechResult = (expectedName) => {
            return new Promise((resolve) => {
                let timeoutId, finalTimeoutId;

                // Start a 7-second timer to warn the user
                timeoutId = setTimeout(async () => {
                    console.warn("if you were speaking while muted, please unmute and say it again.");
                    await speak(`${expectedName} If you were muted, please repeat. or If your response was too short, please elaborate.`);
                }, 7000);

                finalTimeoutId = setTimeout(async () => {
                    console.warn("⚠️ No response received. Moving on...");
                    await speak(`${expectedName} might be experiencing audio issues. Let's move on to the next person.`);
                    resolve(null);
                }, 25000);


                // Listen for speech results
                resolveSpeechResult = (result) => {
                    if (result.name.toLowerCase() === expectedName.toLowerCase()) {
                        clearTimeout(timeoutId);
                        clearTimeout(finalTimeoutId);
                        resolve(result.text);
                        eventEmitter.removeListener('onSpeakerChangeResult', onSpeakerChangeResult); // Cleanup listener
                    } else {
                        console.warn(`⚠️ Ignoring response from ${result.name}, waiting for ${expectedName}`);
                    }
                };

                // Listen for speaker changes
                const onSpeakerChangeResult = (name) => {
                    if (name.toLowerCase() === expectedName.toLowerCase()) {
                        clearTimeout(timeoutId);
                        clearTimeout(finalTimeoutId);
                    }
                };
                eventEmitter.on('onSpeakerChangeResult', onSpeakerChangeResult);
            });
        };



        await page.exposeFunction('onSpeakerChange', async (name) => {
            if (name === lastSpeaker) return; // Ignore if same speaker
            lastSpeaker = name;

            // Emit event for waitForSpeechResult
            eventEmitter.emit('onSpeakerChangeResult', name);

            // Debounce to prevent rapid switching
            if (speakerSwitchTimeout) clearTimeout(speakerSwitchTimeout);

            speakerSwitchTimeout = setTimeout(async () => {
                console.log(`${name} is speaking...`);

                // Stop previous recognition before starting a new one
                if (currentRecognition) {
                    currentRecognition.stop();
                    console.log(`Stopped previous recognition for ${lastSpeaker}`);
                }

                await page.evaluate((speaker) => {
                    // Stop existing recognition (if any)
                    if (window['currentRecognition']) {
                        window['currentRecognition'].stop();
                    }

                    const recognition = new (window['SpeechRecognition'] || window['webkitSpeechRecognition'])();
                    recognition.lang = 'en-US';
                    recognition.interimResults = false;
                    recognition.continuous = true;

                    recognition.onresult = (event) => {
                        const transcript = event.results[event.results.length - 1][0].transcript;
                        console.log(`${speaker} said: "${transcript}"`);
                        window['onSpeechResult'](speaker, transcript);
                    };

                    recognition.onerror = (event) => {
                        console.error(`Error in recognition for ${speaker}:`, event.error);
                    };

                    recognition.start();
                    console.log(`Speech recognition started for ${speaker}`);

                    // Store recognition instance on window to manage conflicts
                    window['currentRecognition'] = recognition;
                }, name);
            }, 500); // 500ms debounce time
        });

        await page.evaluate(() => {
            let lastSpeaker = '';
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    const participants = document.querySelectorAll('.cxdMu.KV1GEc');
                    participants.forEach(participant => {
                        const name = participant.querySelector('.zWGUib')?.innerText;
                        const speakingIcon = participant.querySelector('.IisKdb.GF8M7d.OgVli');
                        // If a new speaker starts, trigger recognition
                        if (speakingIcon && name && name !== "Virtual Scrum Master" && name !== lastSpeaker) {
                            lastSpeaker = name;
                            window['onSpeakerChange'](name);
                        }
                    });
                });
            });

            const targetNode = document.querySelector('.AE8xFb.OrqRRb.GvcuGe.goTdfd');
            const config = { childList: true, subtree: true, attributes: true };

            if (targetNode) {
                observer.observe(targetNode, config);
                console.log('Observer started...');
            }
        });


        // Speak Welcome Message
        console.log('Bot is speaking...');

        await speak("Hello Team, Good Day! Let's start our Scrum meeting.");

        const moveToNextParticipant = (currentParticipant) => {
            const nextIndex = participants.findIndex((p) => p === currentParticipant) + 1;
            currentIndex = nextIndex < participants.length ? nextIndex : participants.length;
        };


        const finalStatusUpdates = async () => {
            try {
                const getTodayDate = () => `${String(new Date().getDate()).padStart(2, '0')}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${new Date().getFullYear()}`;
                const momPrompt = `As a Scrum Master, summarize the standup meeting based on the transcribed team updates. Create a structured Minutes of Meeting (MoM) dated ${getTodayDate()} that includes:

Individual Updates – Summarize the progress reported by each team member.
Team Progress – Outline the overall progress toward sprint goals.
Blockers & Challenges – List any identified blockers or dependencies.
Areas for Improvement – Recommend process improvements or action items.
Format the MoM as a clear and professional email, addressing it to 'Dear All' instead of the manager's name. Do not include a subject line. Ensure it is concise and easy to read. Conclude with next steps and any necessary follow-ups.

Note: Generate a Meeting Minutes (MoM) summary based on the Chat Session History. If no Chat Session History exists, indicate 'Either no participants joined today's stand-up meeting, or there were audio issues.' and provide a short elaboration without including a subject line or '[Your Name]'.`;
                const botMOMUpdate = await processWithGeminiFinalStatusUpdate(momPrompt);
                sendEmail(managerDetails?.email, '', 'Daily Scrum Meeting Minutes', botMOMUpdate)
                    .then(() => console.log('Email sent'))
                    .catch(err => console.error('Error:', err));
                console.log('botMOMUpdate ', botMOMUpdate);
                const finalStatusPrompt = `As a Scrum Master, summarize today's standup meeting with a brief and clear verbal update covering:

Overall Team Progress – Key milestones and achievements.
Individual Highlights – Important updates from team members.
Blockers & Challenges – Issues that need resolution or attention.
Next Steps – Immediate action items and priorities.
Keep the summary concise (3-5 sentences) and straightforward to ensure everyone on the call is aligned.

Note:

Base the summary strictly on the Chat Session History.
If no Chat Session History exists, respond with: 'Either no participants joined today's stand-up meeting, or there were audio issues..'
Do not generate or mention any team member names unless explicitly mentioned in the Chat Session History.
Avoid adding irrelevant or fabricated details`;
                const botFinalStatusUpdate = await processWithGeminiFinalStatusUpdate(finalStatusPrompt);
                console.log('botFinalStatusUpdate ', botFinalStatusUpdate);
                await speak(botFinalStatusUpdate + " Thank you all. Let's wrap up this call.");
            }
            catch (error) {
                console.error('Error during final status updates:', error);
            }

        };

        let currentIndex = 0;
        // Function to ask for team updates
        const askForUpdates = async () => {
            console.log('🚀 Starting to ask for team updates...');
            try {
                while (currentIndex < participants.length) {
                    const participant = participants[currentIndex];
                    console.log(`🗣️ Asking ${participant} for task update...`);

                    const taskDetail = teamTasks.find(
                        (task) => task.assignee.toLowerCase() === participant.toLowerCase()
                    );

                    try {
                        const taskMessage = taskDetail
                            ? `${participant}, please provide an update on your task: ${taskDetail.task}.`
                            : `${participant}, if you have any updates to share in this standup, please speak up and provide them.`;

                        await speak(taskMessage);

                        // console.log(`🎤 Waiting for ${participant}'s response...`);
                        // const transcription = await waitForSpeechResult(participant); // Wait until response is received
                        // console.log(`✅ Received response from ${participant}: "${transcription}"`);

                        console.log(`🎤 Waiting for ${participant}'s response...`);
                        const transcription = await waitForSpeechResult(participant); // Wait until response is received

                        if (!transcription) {
                            console.log(`⚠️ Skipping ${participant} due to no response.`);
                            moveToNextParticipant(participant);
                            continue;
                        }

                        console.log(`✅ Received response from ${participant}: "${transcription}"`);

                        const prompt = taskDetail
                            ? `You are a Scrum Master conducting a standup meeting. 
                            The team member ${taskDetail.assignee} is working on the task: "${taskDetail.task}".
                            Here is their update: "${transcription}". Acknowledge the update in a positive manner without asking follow-up questions.`
                            : `You are a Scrum Master conducting a standup meeting.
                            The team member ${participant} shared the following update: "${transcription}".
                            Acknowledge the update in a positive manner without asking follow-up questions.`;

                        const botResponse = await processWithGeminiTaskUpdate(prompt);
                        if (botResponse) {
                            await speak(botResponse);
                        } else {
                            console.warn(`⚠️ No response from Gemini AI for ${participant}`);
                        }
                    } catch (error) {
                        console.error(`❌ Error processing update for ${participant}:`, error);
                    }

                    moveToNextParticipant(participant);

                    console.log(`⏳ Waiting before asking the next member...`);
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }

                console.log('✅ All team updates collected.');
            }
            catch (err) {
                console.log(err, ' ask for update func');
            }
        };

        await askForUpdates();

        await finalStatusUpdates();

        await page.evaluate(() => {
            console.log('Speech recognition and observer.');
            if (window['currentRecognition']) {
                window['currentRecognition'].stop();
                console.log('Speech recognition stopped.');
            }
            if (window['observerInstance']) {
                window['observerInstance'].disconnect();
                console.log('MutationObserver disconnected.');
            }
        });
        if (currentRecognition) {
            currentRecognition.stop();
            console.log('✅ Speech recognition stopped.');
        }
        if (speakerSwitchTimeout) {
            clearTimeout(speakerSwitchTimeout);
            console.log('✅ Speaker switch timeout cleared.');
        }
        if (ClearParticipantsInt) {
            clearInterval(ClearParticipantsInt);
            console.log('✅ clear participant interval cleared.');
        }
        // Use page.evaluateHandle to safely stop observer inside the browser
        const observerHandle = await page.evaluateHandle(() => {
            if (window['observerInstance']) {
                window['observerInstance'].disconnect();
                console.log('✅ MutationObserver disconnected.');
            }
            return true;
        });
        // Dispose the handle
        await observerHandle.dispose();

        await new Promise((resolve) => setTimeout(resolve, 10000));
        console.log('✅ Closing browser...');
        await browser.close();
        console.log('🛑 Browser closed. Meeting left successfully.');

    } catch (error) {
        console.error('Error in Google Meet bot:', error);
    }
};

const joinGMeetStandup = async ({ code, participantDetails, managerDetails }) => {
    try {

        // Define folder path based on the meeting code
        const dataFolder = path.join(__dirname, 'data', code);

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

        let page = await browser.newPage();
        await page.setViewport({ width: 1080, height: 720 });

        // Join Google Meet using the provided meeting code
        await page.goto(`https://meet.google.com/${code}`);
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
                return participants || [];
            } catch (error) {
                console.error("Error extracting participants:", error);
                return [];
            }
        };

        // Extract participant list
        let participants = await extractParticipants(page);
        //keep checking after every min.
        let ClearParticipantsInt = null;
        ClearParticipantsInt = setInterval(async () => {
            let tempparticipants = await extractParticipants(page);
            let checkNewParticipants = participants.join() === tempparticipants.join();
            if (!checkNewParticipants) {
                participants = tempparticipants;
                //trigger the function to greet new participants..
            }
        }, 10000);
        console.log("Participants in the meeting:", participants);

        let currentRecognition = null;
        let lastSpeaker = '';
        let speakerSwitchTimeout = null;

        let resolveSpeechResult; // Store resolver for dynamic response handling

        await page.exposeFunction('onSpeechResult', (name, text) => {
            console.log(`${name} said: "${text}"`);
            if (resolveSpeechResult) {
                resolveSpeechResult({ name, text }); // Resolve the pending promise
                //resolveSpeechResult = null; // Reset after resolving
            }
        });

        // Function to wait for response from speaker
        const waitForSpeechResult = (expectedName) => {
            return new Promise((resolve) => {
                let timeoutId, finalTimeoutId;

                // Start a 7-second timer to warn the user
                timeoutId = setTimeout(async () => {
                    console.warn("if you were speaking while muted, please unmute and say it again.");
                    await speak(`${expectedName} If you were muted, please repeat. or If your response was too short, please elaborate.`);
                }, 7000);

                finalTimeoutId = setTimeout(async () => {
                    console.warn("⚠️ No response received. Moving on...");
                    await speak(`${expectedName} might be experiencing audio issues. Let's move on to the next person.`);
                    resolve(null);
                }, 25000);


                // Listen for speech results
                resolveSpeechResult = (result) => {
                    if (result.name.toLowerCase() === expectedName.toLowerCase()) {
                        clearTimeout(timeoutId);
                        clearTimeout(finalTimeoutId);
                        resolve(result.text);
                        eventEmitter.removeListener('onSpeakerChangeResult', onSpeakerChangeResult); // Cleanup listener
                    } else {
                        console.warn(`⚠️ Ignoring response from ${result.name}, waiting for ${expectedName}`);
                    }
                };

                // Listen for speaker changes
                const onSpeakerChangeResult = (name) => {
                    if (name.toLowerCase() === expectedName.toLowerCase()) {
                        clearTimeout(timeoutId);
                        clearTimeout(finalTimeoutId);
                    }
                };
                eventEmitter.on('onSpeakerChangeResult', onSpeakerChangeResult);
            });
        };



        await page.exposeFunction('onSpeakerChange', async (name) => {
            if (name === lastSpeaker) return; // Ignore if same speaker
            lastSpeaker = name;

            // Emit event for waitForSpeechResult
            eventEmitter.emit('onSpeakerChangeResult', name);

            // Debounce to prevent rapid switching
            if (speakerSwitchTimeout) clearTimeout(speakerSwitchTimeout);

            speakerSwitchTimeout = setTimeout(async () => {
                console.log(`${name} is speaking...`);

                // Stop previous recognition before starting a new one
                if (currentRecognition) {
                    currentRecognition.stop();
                    console.log(`Stopped previous recognition for ${lastSpeaker}`);
                }

                await page.evaluate((speaker) => {
                    // Stop existing recognition (if any)
                    if (window['currentRecognition']) {
                        window['currentRecognition'].stop();
                    }

                    const recognition = new (window['SpeechRecognition'] || window['webkitSpeechRecognition'])();
                    recognition.lang = 'en-US';
                    recognition.interimResults = false;
                    recognition.continuous = true;

                    recognition.onresult = (event) => {
                        const transcript = event.results[event.results.length - 1][0].transcript;
                        console.log(`${speaker} said: "${transcript}"`);
                        window['onSpeechResult'](speaker, transcript);
                    };

                    recognition.onerror = (event) => {
                        console.error(`Error in recognition for ${speaker}:`, event.error);
                    };

                    recognition.start();
                    console.log(`Speech recognition started for ${speaker}`);

                    // Store recognition instance on window to manage conflicts
                    window['currentRecognition'] = recognition;
                }, name);
            }, 500); // 500ms debounce time
        });

        await page.evaluate(() => {
            let lastSpeaker = '';
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    const participants = document.querySelectorAll('.cxdMu.KV1GEc');
                    participants.forEach(participant => {
                        const name = participant.querySelector('.zWGUib')?.innerText;
                        const speakingIcon = participant.querySelector('.IisKdb.GF8M7d.OgVli');
                        // If a new speaker starts, trigger recognition
                        if (speakingIcon && name && name !== "Virtual Scrum Master" && name !== lastSpeaker) {
                            lastSpeaker = name;
                            window['onSpeakerChange'](name);
                        }
                    });
                });
            });

            const targetNode = document.querySelector('.AE8xFb.OrqRRb.GvcuGe.goTdfd');
            const config = { childList: true, subtree: true, attributes: true };

            if (targetNode) {
                observer.observe(targetNode, config);
                console.log('Observer started...');
            }
        });


        // Speak Welcome Message
        console.log('Bot is speaking...');

        await speak("Hello Team, Good Day! Let's start our Scrum meeting.");

        const moveToNextParticipant = (currentParticipant) => {
            const nextIndex = participants.findIndex((p) => p === currentParticipant) + 1;
            currentIndex = nextIndex < participants.length ? nextIndex : participants.length;
        };


        const finalStatusUpdates = async () => {
            try {
                const getTodayDate = () => `${String(new Date().getDate()).padStart(2, '0')}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${new Date().getFullYear()}`;
                const momPrompt = `As a Scrum Master, summarize the standup meeting based on the transcribed team updates. Create a structured Minutes of Meeting (MoM) dated ${getTodayDate()} that includes:

Individual Updates – Summarize the progress reported by each team member.
Team Progress – Outline the overall progress toward sprint goals.
Blockers & Challenges – List any identified blockers or dependencies.
Areas for Improvement – Recommend process improvements or action items.
Format the MoM as a clear and professional email, addressing it to 'Dear ${managerDetails.name}'. Do not include a subject line. Ensure it is concise and easy to read. Conclude with next steps and any necessary follow-ups.

Note: Generate a Meeting Minutes (MoM) summary based on the Chat Session History. If no Chat Session History exists, indicate 'Either no participants joined today's stand-up meeting, or there were audio issues.' and provide a short elaboration without including a subject line or '[Your Name]'.`;
                const botMOMUpdate = await processWithGeminiFinalStatusUpdate(momPrompt);
                const participantEmailList = participantDetails?.map(item => item.email).join(', ');
                sendEmail(managerDetails?.email, participantEmailList, 'Daily Scrum Meeting Minutes', botMOMUpdate)
                    .then(() => console.log('Email sent'))
                    .catch(err => console.error('Error:', err));
                console.log('botMOMUpdate ', botMOMUpdate);
                const finalStatusPrompt = `As a Scrum Master, summarize today's standup meeting with a brief and clear verbal update covering:

Overall Team Progress – Key milestones and achievements.
Individual Highlights – Important updates from team members.
Blockers & Challenges – Issues that need resolution or attention.
Next Steps – Immediate action items and priorities.
Keep the summary concise (3-5 sentences) and straightforward to ensure everyone on the call is aligned.

Note:

Base the summary strictly on the Chat Session History.
If no Chat Session History exists, respond with: 'Either no participants joined today's stand-up meeting, or there were audio issues..'
Do not generate or mention any team member names unless explicitly mentioned in the Chat Session History.
Avoid adding irrelevant or fabricated details`;
                const botFinalStatusUpdate = await processWithGeminiFinalStatusUpdate(finalStatusPrompt);
                console.log('botFinalStatusUpdate ', botFinalStatusUpdate);
                await speak(botFinalStatusUpdate + " Thank you all. Let's wrap up this call.");
            }
            catch (error) {
                console.error('Error during final status updates:', error);
            }

        };

        let currentIndex = 0;
        // Function to ask for team updates
        const askForUpdates = async () => {
            console.log('🚀 Starting to ask for team updates...');
            try {
                while (currentIndex < participants.length) {
                    const participant = participants[currentIndex];
                    console.log(`🗣️ Asking ${participant} for task update...`);

                    const taskDetail = participantDetails.find(
                        (task) => task.assignee.toLowerCase() === participant.toLowerCase()
                    );

                    try {
                        const taskMessage = taskDetail
                            ? `${participant}, please provide an update on your task: ${taskDetail.task}.`
                            : `${participant}, if you have any updates to share in this standup, please speak up and provide them.`;

                        await speak(taskMessage);

                        // console.log(`🎤 Waiting for ${participant}'s response...`);
                        // const transcription = await waitForSpeechResult(participant); // Wait until response is received
                        // console.log(`✅ Received response from ${participant}: "${transcription}"`);

                        console.log(`🎤 Waiting for ${participant}'s response...`);
                        const transcription = await waitForSpeechResult(participant); // Wait until response is received

                        if (!transcription) {
                            console.log(`⚠️ Skipping ${participant} due to no response.`);
                            moveToNextParticipant(participant);
                            continue;
                        }

                        console.log(`✅ Received response from ${participant}: "${transcription}"`);

                        const prompt = taskDetail
                            ? `You are a Scrum Master conducting a standup meeting. 
                            The team member ${taskDetail.assignee} is working on the task: "${taskDetail.task}".
                            Here is their update: "${transcription}". Acknowledge the update in a positive manner without asking follow-up questions.`
                            : `You are a Scrum Master conducting a standup meeting.
                            The team member ${participant} shared the following update: "${transcription}".
                            Acknowledge the update in a positive manner without asking follow-up questions.`;

                        const botResponse = await processWithGeminiTaskUpdate(prompt);
                        if (botResponse) {
                            await speak(botResponse);
                        } else {
                            console.warn(`⚠️ No response from Gemini AI for ${participant}`);
                        }
                    } catch (error) {
                        console.error(`❌ Error processing update for ${participant}:`, error);
                    }

                    moveToNextParticipant(participant);

                    console.log(`⏳ Waiting before asking the next member...`);
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }

                console.log('✅ All team updates collected.');
            }
            catch (err) {
                console.log(err, ' ask for update func');
            }
        };

        await askForUpdates();

        await finalStatusUpdates();

        await page.evaluate(() => {
            console.log('Speech recognition and observer.');
            if (window['currentRecognition']) {
                window['currentRecognition'].stop();
                console.log('Speech recognition stopped.');
            }
            if (window['observerInstance']) {
                window['observerInstance'].disconnect();
                console.log('MutationObserver disconnected.');
            }
        });
        if (currentRecognition) {
            currentRecognition.stop();
            console.log('✅ Speech recognition stopped.');
        }
        if (speakerSwitchTimeout) {
            clearTimeout(speakerSwitchTimeout);
            console.log('✅ Speaker switch timeout cleared.');
        }
        if (ClearParticipantsInt) {
            clearInterval(ClearParticipantsInt);
            console.log('✅ clear participant interval cleared.');
        }
        // Use page.evaluateHandle to safely stop observer inside the browser
        const observerHandle = await page.evaluateHandle(() => {
            if (window['observerInstance']) {
                window['observerInstance'].disconnect();
                console.log('✅ MutationObserver disconnected.');
            }
            return true;
        });
        // Dispose the handle
        await observerHandle.dispose();

        await new Promise((resolve) => setTimeout(resolve, 10000));
        console.log('✅ Closing browser...');
        await browser.close();
        console.log('🛑 Browser closed. Meeting left successfully.');

    } catch (error) {
        console.error('Error in Google Meet bot:', error);
    }
};


const joinGMeetMeeting = async ({ code, managerDetails }) => {
    try {
        const dataFolder = path.join(__dirname, 'data', code);
        if (fs.existsSync(dataFolder)) {
            fs.rmSync(dataFolder, { recursive: true, force: true });
            console.log(`Deleted existing folder: ${dataFolder}`);
        }
        fs.mkdirSync(dataFolder, { recursive: true });
        console.log(`Created new folder: ${dataFolder}`);

        console.log('Launching browser...');
        const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
        const userDataDir = 'C:/Users/rajkumar.selvaraj/AppData/Local/Google/Chrome/User Data/Default';

        const browser = await puppeteer.launch({
            executablePath: chromePath,
            headless: false,
            userDataDir: userDataDir,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-extensions',
                '--disable-infobars',
                '--start-maximized',
                '--use-fake-ui-for-media-stream',
                '--disable-blink-features=AutomationControlled',
            ]
        });

        let page = await browser.newPage();
        await page.setViewport({ width: 1080, height: 720 });

        await page.goto(`https://meet.google.com/${code}`);
        await page.waitForTimeout(6000);

        // Check if name field exists and enter bot name
        const isNameFieldPresent = await page.$('input[aria-label="Your name"]');
        if (isNameFieldPresent) {
            console.log("Name field detected, entering name...");
            await page.type('input[aria-label="Your name"]', 'Virtual Scrum Master');
            await page.keyboard.press('Enter');
            await page.waitForSelector('button[aria-label="People"]', { timeout: 50000 });

            const peopleButton = await page.$('button[aria-label="People"]');
            if (peopleButton) {
                console.log("Clicking 'People' button...");
                await peopleButton.click();
                await page.waitForSelector('[role="list"][aria-label="Participants"]', { timeout: 5000 });
            }
        }

        const extractParticipants = async (page) => {
            try {
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
                return participants || [];
            } catch (error) {
                console.error("Error extracting participants:", error);
                return [];
            }
        };

        // Extract participant list
        let participants = await extractParticipants(page);
        //keep checking after every min.
        let ClearParticipantsInt = null;
        ClearParticipantsInt = setInterval(async () => {
            let tempparticipants = await extractParticipants(page);
            let checkNewParticipants = participants.join() === tempparticipants.join();
            if (!checkNewParticipants) {
                participants = tempparticipants;
                //trigger the function to greet new participants..
            }
            if (tempparticipants.length === 0) {
                console.log("No participants in the meeting. Closing browser...");
                const getTodayDate = () => `${String(new Date().getDate()).padStart(2, '0')}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${new Date().getFullYear()}`;

                const transcriptFilePath = path.join(__dirname, 'data', code, `${code}.txt`);
                let transcriptContent = '';

                if (fs.existsSync(transcriptFilePath)) {
                    transcriptContent = fs.readFileSync(transcriptFilePath, 'utf-8').trim();
                }

                let momPrompt = '';

                if (transcriptContent) {
                    momPrompt = `As a Scrum Master, summarize the standup meeting based on the following transcribed team updates. Create a structured Minutes of Meeting (MoM) dated ${getTodayDate()}:
            
            **Meeting Transcript:**
            ${transcriptContent}
            
            **Structure the MoM as follows:**
            1. **Individual Updates** – Summarize the progress reported by each team member.
            2. **Team Progress** – Outline the overall progress toward sprint goals.
            3. **Blockers & Challenges** – List any identified blockers or dependencies.
            4. **Areas for Improvement** – Recommend process improvements or action items.
            
            Format the MoM as a professional email, addressing it to 'Dear ${managerDetails.name}'. Ensure clarity, conciseness, and readability. Conclude with next steps and any necessary follow-ups.`;
                } else {
                    momPrompt = `Either no participants joined today's stand-up meeting, or there were audio issues. As a Scrum Master, summarize the meeting with an appropriate note indicating the lack of transcript. Address the MoM to 'Dear ${managerDetails.name}' in a concise and structured format.`;
                }
                const botMOMUpdate = await processWithGeminiFinalStatusUpdate(momPrompt);
                sendEmail(managerDetails?.email, '', 'Daily Scrum Meeting Minutes', botMOMUpdate)
                    .then(() => console.log('Email sent'))
                    .catch(err => console.error('Error:', err));
                await page.evaluate(() => {
                    console.log('Speech recognition and observer.');
                    if (window['currentRecognition']) {
                        window['currentRecognition'].stop();
                        console.log('Speech recognition stopped.');
                    }
                    if (window['observerInstance']) {
                        window['observerInstance'].disconnect();
                        console.log('MutationObserver disconnected.');
                    }
                });
                if (ClearParticipantsInt) {
                    clearInterval(ClearParticipantsInt);
                    console.log('✅ clear participant interval cleared.');
                }
                // Use page.evaluateHandle to safely stop observer inside the browser
                const observerHandle = await page.evaluateHandle(() => {
                    if (window['observerInstance']) {
                        window['observerInstance'].disconnect();
                        console.log('✅ MutationObserver disconnected.');
                    }
                    return true;
                });
                // Dispose the handle
                await observerHandle.dispose();

                await new Promise((resolve) => setTimeout(resolve, 10000));
                console.log('✅ Closing browser...');
                await browser.close();
                console.log('🛑 Browser closed. Meeting left successfully.');
                await browser.close();
            }
        }, 10000);
        console.log("Participants in the meeting:", participants);


        let lastSpeaker = '';

        // Create file for logging speech
        const logFilePath = path.join(dataFolder, `${code}.txt`);
        fs.writeFileSync(logFilePath, "Meeting Transcript:\n", { flag: 'w' });

        await page.exposeFunction('onSpeechResult', (name, text) => {
            console.log(`${name} said: "${text}"`);
            fs.appendFileSync(logFilePath, `${name} said: "${text}"\n`);
        });

        await page.exposeFunction('onSpeakerChange', async (name) => {
            if (name !== lastSpeaker) {
                lastSpeaker = name;
                console.log(`${name} is speaking...`);
            }

            await page.evaluate((speaker) => {
                if (window['currentRecognition']) {
                    window['currentRecognition'].stop();
                }

                const recognition = new (window['SpeechRecognition'] || window['webkitSpeechRecognition'])();
                recognition.lang = 'en-US';
                recognition.interimResults = false;
                recognition.continuous = true;

                recognition.onresult = (event) => {
                    const transcript = event.results[event.results.length - 1][0].transcript;
                    console.log(`${speaker} said: "${transcript}"`);
                    window['onSpeechResult'](speaker, transcript);
                };

                recognition.onerror = (event) => {
                    console.error(`Error in recognition for ${speaker}:`, event.error);
                };

                recognition.start();
                console.log(`Speech recognition started for ${speaker}`);
                window['currentRecognition'] = recognition;
            }, name);
        });

        // Monitor speaker activity
        await page.evaluate(() => {
            let lastSpeaker = '';
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    const participants = document.querySelectorAll('.cxdMu.KV1GEc');
                    participants.forEach(participant => {
                        const name = participant.querySelector('.zWGUib')?.innerText;
                        const speakingIcon = participant.querySelector('.IisKdb.GF8M7d.OgVli');
                        if (speakingIcon && name && name !== "Virtual Scrum Master" && name !== lastSpeaker) {
                            lastSpeaker = name;
                            window['onSpeakerChange'](name);
                        }
                    });
                });
            });

            const targetNode = document.querySelector('.AE8xFb.OrqRRb.GvcuGe.goTdfd');
            const config = { childList: true, subtree: true, attributes: true };

            if (targetNode) {
                observer.observe(targetNode, config);
                console.log('Observer started...');
            }

            window['observerInstance'] = observer;
        });

    } catch (error) {
        console.error('Error in Google Meet bot:', error);
    }
};

// Export function
module.exports = { joinGoogleMeet, joinGMeetStandup, joinGMeetMeeting };