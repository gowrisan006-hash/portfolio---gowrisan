const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
require("dotenv").config();

const app = express();

// Trust reverse proxy (Render load balancer)
app.set("trust proxy", 1);

// --- CORS Configuration ---
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(",").map((o) => o.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // If explicit ALLOWED_ORIGIN is specified
      if (allowedOrigins.length > 0) {
        if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
          return callback(null, true);
        }
      }

      // Permissive matching for Vercel deployments and local development
      const isVercel = /^https:\/\/[a-zA-Z0-9_.-]+\.vercel\.app$/.test(origin);
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if (isVercel || isLocalhost) {
        return callback(null, true);
      }

      // Default to allowing if no restrictive origin list is explicitly set
      if (allowedOrigins.length === 0) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin not allowed: " + origin), false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);


// Parse JSON request body with safe size limit
app.use(express.json({ limit: "50kb" }));

// Handle malformed JSON syntax errors safely
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Malformed JSON payload provided.",
    });
  }
  next(err);
});

// Initialize Resend Client
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Validation helpers
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Escape HTML special characters for email templates
function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- Routes ---

// Health check / Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "portfolio-backend",
    message: "Server is running successfully!",
    provider: "resend",
    isEmailConfigured: Boolean(process.env.RESEND_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Dedicated health-check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Contact form email endpoint
app.post("/send-email", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};

    // 1. Validate required fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Your name is required.",
      });
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Your email is required.",
      });
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required.",
      });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    // Sanitize and trim lengths
    const cleanName = name.trim().slice(0, 100);
    const cleanEmail = email.trim().slice(0, 120);
    const cleanSubject = subject.trim().slice(0, 200);
    const cleanMessage = message.trim().slice(0, 5000);

    // 2. Validate API key presence
    const activeApiKey = process.env.RESEND_API_KEY;
    if (!activeApiKey) {
      console.error("[Email Config Error] RESEND_API_KEY is not defined in environment variables.");
      return res.status(500).json({
        success: false,
        message: "Email service is temporarily unavailable (API key not configured).",
      });
    }

    // Lazy load or reuse Resend instance
    const client = resend || new Resend(activeApiKey);

    // Destination email
    const recipientEmail = process.env.EMAIL_USER || "gowrisan006@gmail.com";
    const senderEmail = process.env.RESEND_FROM_EMAIL || "Portfolio Contact <onboarding@resend.dev>";

    // 3. Send email through Resend HTTPS API (Port 443)
    const { data, error } = await client.emails.send({
      from: senderEmail,
      to: [recipientEmail],
      replyTo: cleanEmail,
      subject: `[Portfolio] ${cleanSubject}`,
      text: `New Portfolio Message received:

From: ${cleanName}
Email: ${cleanEmail}
Subject: ${cleanSubject}

Message:
${cleanMessage}
`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937; background-color: #ffffff;">
          <h2 style="color: #4f46e5; margin-top: 0; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb;">New Portfolio Contact Message</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; width: 90px; color: #4b5563;">Name:</td>
              <td style="padding: 8px 0; color: #111827;">${escapeHtml(cleanName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #4b5563;">Email:</td>
              <td style="padding: 8px 0;"><a href="mailto:${escapeHtml(cleanEmail)}" style="color: #4f46e5; text-decoration: none;">${escapeHtml(cleanEmail)}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #4b5563;">Subject:</td>
              <td style="padding: 8px 0; color: #111827;">${escapeHtml(cleanSubject)}</td>
            </tr>
          </table>
          <div style="margin-top: 20px;">
            <p style="font-weight: 600; margin-bottom: 8px; color: #4b5563;">Message:</p>
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #1f2937;">${escapeHtml(cleanMessage)}</div>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px 0;" />
          <p style="font-size: 12px; color: #6b7280; margin: 0;">Sent securely from your Portfolio website contact form.</p>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend Error]:", error.message || error);
      return res.status(500).json({
        success: false,
        message: "Failed to send email.",
        error: error.message || "Email provider error",
      });
    }

    console.log(`[Success] Email dispatched successfully. Message ID: ${data?.id}`);
    return res.status(200).json({
      success: true,
      message: "Message sent successfully!",
      id: data?.id,
    });
  } catch (err) {
    console.error("[Server Error /send-email]:", err.message || err);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while sending your message.",
      error: err.message || "Internal error",
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found.",
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error("[Unhandled App Error]:", err.message || err);
  res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});