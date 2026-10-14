const express = require("express");
const cors = require("cors");
const Resend = require("resend");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const resend= new resend(process.env.RESEND_API_KEY)({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  family: 4,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Home
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// Test email
app.get("/test-email", async (req, res) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "SMTP Test",
      text: "Gmail SMTP is working successfully!",
    });

    res.send("Email sent successfully!");
  } catch (error) {
    console.error("Email Error:", error.message);
    res.status(500).json({ message: "Email failed!" , error: error.message });
  }
});

// Contact form email
app.post("/send-email", async (req, res) => {
     console.log("Contact form request received:", req.body); // Log the request body for debugging
  try {
    const { name, email, subject, message } = req.body;

    const { data, error } = await resend.emails.send({
  from: "Portfolio Contact <onboarding@resend.dev>",
  to: [process.env.EMAIL_USER],
  replyTo: email,
  subject: subject || "New Portfolio Contact Message",
  text: `Name: ${name}
Email: ${email}

Message:
${message}
      `,
    });

    if (error) {
  console.error("Resend Error:", error);
  return res.status(500).json({
    message: "Email failed!",
    error: error.message,
  });
}

res.json({ message: "Email sent successfully!", id: data?.id });
} catch (error) {
    console.error("Resend Error:", error.message);
    res.status(500).json({ message: "Email failed!" , error: error.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});