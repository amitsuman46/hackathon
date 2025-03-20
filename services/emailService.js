const nodemailer = require('nodemailer');

// Create a transporter object using SMTP transport

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // true for port 465, false for other ports
  auth: {
    user: "8879c0001@smtp-brevo.com",
    pass: "",
  },
});


// Function to send an email with async/await and error handling
const sendEmail = async (to, subject, text) => {
  // Define email options
  const mailOptions = {
    from: '"Virtual Scrum Master" <scrummaster456@outlook.com>', // sender address
    to: to, // list of receivers
    subject: subject, // Subject line
    text: text, // plain text body
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error; // Throw error to be handled by the caller
  }
};

module.exports = sendEmail;



