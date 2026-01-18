import nodemailer from "nodemailer"
import "dotenv/config"  // ✅ make sure env vars are loaded

export const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false, // TLS (port 587)
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
})

// Optional: verify transporter immediately
transporter.verify().then(() => {
  console.log("✅ Email transporter is ready")
}).catch(err => {
  console.error("❌ Transporter verification failed:", err)
})
