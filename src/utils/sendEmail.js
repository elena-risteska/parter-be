import nodemailer from "nodemailer"
import "dotenv/config"

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: false, // TLS
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    })

    // Optional: verify transporter before sending
    await transporter.verify()
    console.log("✅ Email transporter is ready")

    const info = await transporter.sendMail({
      from: `"parter" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    })

    console.log("📨 Email sent:", info.messageId)
    return info
  } catch (err) {
    console.error("❌ Failed to send email:", err)
    throw err
  }
}
