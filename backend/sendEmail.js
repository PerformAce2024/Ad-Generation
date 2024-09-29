import { Resend } from 'resend';
import 'dotenv/config';

// Use environment variable for the API key
const resend = new Resend(process.env.RESEND_API_KEY);

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, number, message } = req.body;

  // Simple validation
  if (!email || !number || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Send the email using Resend
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'srishti@growthz.ai',
      subject: 'New Contact Form Submission',
      html: `
        <h1>New Message</h1>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Contact Number:</strong> ${number}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    });

    console.log('Email sent successfully:', data);
    res.status(200).json({ message: 'Email sent successfully', data });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
};
