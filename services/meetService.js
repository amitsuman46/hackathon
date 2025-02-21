const puppeteer = require('puppeteer');

const joinGoogleMeet = async (meetCode) => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Go to Google Meet
    await page.goto(`https://meet.google.com/${meetCode}`);

    // Wait for input and enter the code
    await page.waitForSelector('input[type="text"]');
    await page.type('input[type="text"]', meetCode);

    // Click on Join Button
    await page.click('button[aria-label="Join"]');

    console.log('Successfully joined the meeting!');
  } catch (error) {
    console.error('Error joining Google Meet:', error);
  }
};

module.exports = { joinGoogleMeet };
