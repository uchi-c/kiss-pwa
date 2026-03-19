const express = require("express");
const path = require("path");
const nodemailer = require("nodemailer");

// Load .env locally (Render ignores .env by default; you set vars in Render dashboard)
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const siteRoot = __dirname;

app.get("/", (req, res) => {
  res.sendFile(path.join(siteRoot, "index.html"));
});

// Body parsers
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true }));

// Static files from the current project root
app.use(express.static(siteRoot, { extensions: ["html"] }));

// Health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Contact form -> SMTP
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "Please fill in all fields." });
    }

    // Env vars (set these in Render -> Environment)
    const host = process.env.SMTP_HOST || "smtp.mail.privateemail.com";
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const secure = String(process.env.SMTP_SECURE || "true") === "true";

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const toEmail = process.env.TO_EMAIL;

    if (!smtpUser || !smtpPass || !toEmail) {
      return res.status(500).json({
        error:
          "Email not configured. Set SMTP_USER, SMTP_PASS, and TO_EMAIL in environment variables."
      });
    }

    const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mail.privateemail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || "true") === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});


    // Basic sanitization
    const safe = (s) => String(s || "").replace(/[<>]/g, "").trim();

    await transporter.sendMail({
      from: `ChooseYourGameMode <${smtpUser}>`,
      to: toEmail,
      replyTo: safe(email),
      subject: `[ChooseYourGameMode] ${safe(subject)}`,
      text: `New message from ChooseYourGameMode

Name: ${safe(name)}
Email: ${safe(email)}
Subject: ${safe(subject)}

Message:
${safe(message)}
`
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("Contact error:", err);
    return res.status(500).json({ error: "Email failed to send. Check SMTP settings." });
  }
});

// SPA fallback (must be AFTER express.static)
app.get("*", (_req, res) => {
  res.sendFile(path.join(siteRoot, "index.html"));
});

app.listen(PORT, () => {
  console.log(`ChooseYourGameMode running on port ${PORT}`);
});
