const nodemailer = require('nodemailer');

const sendSummaryEmail = async (summary) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'recipient@example.com',
      subject: 'Daily Scrum Meeting Summary',
      text: summary,
    };

    await transporter.sendMail(mailOptions);
    console.log('Summary email sent successfully!');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = { sendSummaryEmail };
