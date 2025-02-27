// const puppeteer = require('puppeteer');

// const joinGoogleMeet = async (meetCode) => {
//   try {
//     const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();

//     // Go to Google Meet
//     await page.goto(`https://meet.google.com/${meetCode}`);

//     // Wait for input and enter the code
//     await page.waitForSelector('input[type="text"]');
//     await page.type('input[type="text"]', meetCode);

//     // Click on Join Button
//     await page.click('button[aria-label="Join"]');

//     console.log('Successfully joined the meeting!');
//   } catch (error) {
//     console.error('Error joining Google Meet:', error);
//   }
// };

// module.exports = { joinGoogleMeet };


// const puppeteer = require('puppeteer');

// const joinGoogleMeet = async (meetCode) => {
//   try {
//     // Path to local Chrome installation
//     const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

//     const browser = await puppeteer.launch({
//       executablePath: chromePath,  // Use local Chrome
//       headless: false,             // Show the browser
//       args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--use-fake-ui-for-media-stream',  // Auto-allow camera and microphone
//         '--use-fake-device-for-media-stream',
//         '--disable-audio-output',          // Disable audio to avoid echo issues
//       ]
//     });

//     const page = await browser.newPage();

//     // Go to Google Meet
//     await page.goto(`https://meet.google.com/${meetCode}`);

//     // Wait for input and enter the code
//     await page.waitForSelector('input[type="text"]', { timeout: 60000 });
//     await page.type('input[type="text"]', meetCode);

//     // Click on Join Button
//     await page.click('button[aria-label="Join"]');

//     console.log('Successfully joined the meeting!');
//   } catch (error) {
//     console.error('Error joining Google Meet:', error);
//   }
// };

// module.exports = { joinGoogleMeet };



//"C:\Users\amit.suman\AppData\Local\Google\Chrome\User Data\Default"
// const puppeteer = require('puppeteer');

// const joinGoogleMeet = async (meetCode) => {
//   try {
//     // Path to local Chrome installation
//     const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
//     const userDataDir = 'C:/Users/amit.suman/AppData/Local/Google/Chrome/User Data';

//     const browser = await puppeteer.launch({
//       executablePath: chromePath,  // Use local Chrome
//       headless: false,             // Show the browser
//       userDataDir: userDataDir,    // Use real user profile
//       args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--disable-extensions',
//         '--disable-infobars',
//         '--start-maximized',
//         '--use-fake-ui-for-media-stream',  // Auto-allow camera and microphone
//         '--use-fake-device-for-media-stream',
//         '--disable-blink-features=AutomationControlled' // Avoid detection
//       ]
//     });

//     const page = await browser.newPage();
//     await page.setViewport({ width: 1366, height: 768 });

//     // Go to Google Meet with the meeting code
//     await page.goto(`https://meet.google.com/${meetCode}`);
//     await page.waitForTimeout(3000);

//     // Check if "What's Your Name" field is present
//     const isNameFieldPresent = await page.$('input[aria-label="Your name"]');
//     if (isNameFieldPresent) {
//       console.log("Name field detected, entering name...");

//       // Enter name and press Enter
//       await page.type('input[aria-label="Your name"]', 'Virtual Scrum Master');
//       await page.keyboard.press('Enter');
//       await page.waitForTimeout(1000); // Wait for the input to be processed
//     }

//     // Wait for the 'Ask to Join' button and click it
//     const askToJoinButton = await page.waitForSelector('button[jsname="Qx7uuf"]', { timeout: 60000 });
//     await askToJoinButton.click();

//     console.log('Successfully requested to join the meeting!');
//   } catch (error) {
//     console.error('Error joining Google Meet:', error);
//   }
// };

// module.exports = { joinGoogleMeet };

//------------------------------------------------------------

// const puppeteer = require('puppeteer');

// const joinGoogleMeet = async (meetCode) => {
//   try {
//     // Path to local Chrome installation
//     const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
//     const userDataDir = 'C:\Users\amit.suman\AppData\Local\Google\Chrome\User Data\Default';

//     const fakeAudioFile = 'C:\Users\amit.suman\Downloads\hackathon\output.wav';

//     const browser = await puppeteer.launch({
//       executablePath: chromePath,  // Use local Chrome
//       headless: false,             // Show the browser
//       userDataDir: userDataDir,    // Use real user profile
//       args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--disable-extensions',
//         '--disable-infobars',
//         '--start-maximized',
//         '--use-fake-ui-for-media-stream',  // Auto-allow camera and microphone
//         '--use-fake-device-for-media-stream',
//         '--disable-blink-features=AutomationControlled', // Avoid detection
//          '--use-fake-device-for-media-stream',
//         `--use-file-for-fake-audio-capture=${fakeAudioFile}`
//       ]
//     });

//     const page = await browser.newPage();
//     await page.setViewport({ width: 1366, height: 768 });

//     // Go to Google Meet with the meeting code
//     await page.goto(`https://meet.google.com/${meetCode}`);
//     await page.waitForTimeout(6000);

//     // Check if "What's Your Name" field is present
//     const isNameFieldPresent = await page.$('input[aria-label="Your name"]');
//     if (isNameFieldPresent) {
//       console.log("Name field detected, entering name...");

//       // Enter name and press Enter
//       await page.type('input[aria-label="Your name"]', 'Virtual Scrum Master');
//       await page.keyboard.press('Enter');
//       await page.waitForTimeout(3000); // Wait for the input to be processed
//     }

//     // Wait for the 'Ask to Join' button and click it
//     const askToJoinButton = await page.waitForSelector('button[jsname="Qx7uuf"]', { timeout: 60000 });
//     await askToJoinButton.click();

//     console.log('Successfully requested to join the meeting!');
//   } catch (error) {
//     console.error('Error joining Google Meet:', error);
//   }
// };

// module.exports = { joinGoogleMeet };


//------------------------------------------------------------
const puppeteer = require('puppeteer');
const path = require('path');

const joinGoogleMeet = async (meetCode) => {
  try {
    // Path to local Chrome installation
    const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    const userDataDir = 'C:/Users/amit.suman/AppData/Local/Google/Chrome/User Data/Default';
    
    // Use path.resolve() for cross-platform compatibility
    const fakeAudioFile = path.resolve(__dirname, '../output-chrome.wav');
    console.log('Fake audio file path:', fakeAudioFile);
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
        `--use-file-for-fake-audio-capture=${fakeAudioFile}`
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

    // Click the 'Ask to Join' button
    const askToJoinButton = await page.waitForSelector('button[jsname="Qx7uuf"]', { timeout: 60000 });
    await askToJoinButton.click();

    console.log('Successfully requested to join the meeting!');
    console.log('The bot is now speaking in the Google Meet call.');
  } catch (error) {
    console.error('Error joining Google Meet:', error);
  }
};

module.exports = { joinGoogleMeet };
