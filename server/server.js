const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: "gmail",
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
  try {
    const { name, email, subject, message } = req.body;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: subject || "New Portfolio Contact Message",
      text: `
Name: ${name}
Email: ${email}

Message:
${message}
      `,
    });

    res.json({ message: "Email sent successfully!" });
  } catch (error) {
    console.error("Email Error:", error.message);
    res.status(500).json({ message: "Email failed!" , error: error.message });
  }
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});