import "dotenv/config"
import nodemailer from "nodemailer"

const sendTest = async () => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    })

    const info = await transporter.sendMail({
      from: `"Parter 🎭" <${process.env.MAIL_USER}>`,
      to: "elena.risteska003@gmail.com",
      subject: "Test Email",
      html: "<h1>Hello!</h1><p>This is a test</p>"
    })

    console.log("📨 Email sent:", info.messageId)
  } catch (err) {
    console.error("❌ Email failed:", err)
  }
}

sendTest()
