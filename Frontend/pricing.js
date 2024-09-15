// api/send-email.js

const { Resend } = require('resend');

const resend = new Resend('re_GLyUkRLZ_FV82gaZHC9M2Tk3JWM6evjKL');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, number, message } = req.body;

  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'hvs8380@gmail.com', // Replace with the site owner's email
      subject: 'New Contact Form Submission',
      html: `
        <h1>New Message</h1>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Contact Number:</strong> ${number}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `
    });

    res.status(200).json({ message: 'Email sent successfully', data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email' });
  }
};