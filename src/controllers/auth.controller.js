import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import pool from "../config/db.js"
import { sendEmail } from "../utils/sendEmail.js"

console.log("🔥 auth.controller.js LOADED AT", new Date().toISOString())

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: "Missing fields" })

    const existing = await pool.query(
      "SELECT id FROM users WHERE email=$1",
      [email]
    )
    if (existing.rows.length > 0)
      return res.status(409).json({ message: "Email already exists" })

    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password)
       VALUES ($1,$2,$3,$4)
       RETURNING id, first_name, last_name, email`,
      [firstName, lastName, email, hashedPassword]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email])
    if (result.rows.length === 0)
      return res.status(401).json({ message: "Invalid credentials" })

    const user = result.rows[0]
    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(401).json({ message: "Invalid credentials" })

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" })

    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
}

export const forgotPassword = async (req, res) => {
  console.log("🚀 forgotPassword called")

  const { email } = req.body
  if (!email) return res.status(400).json({ error: "Email is required" })

  console.log("💡 Email received:", email)

  const userRes = await pool.query("SELECT id FROM users WHERE email=$1", [email])
  if (userRes.rows.length === 0)
    return res.json({ message: "If email exists, a code was sent" })

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 min

  await pool.query(
    "UPDATE users SET reset_code=$1, reset_code_expires=$2 WHERE email=$3",
    [code, expires, email]
  )

  try {
    const info = await sendEmail({
      to: email,
      subject: "prati se te molam",
      html: `
        <h2>Password Reset</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 4px;">${code}</h1>
        <p>This code expires in 10 minutes.</p>
      `
    })

    console.log("📨 Reset email sent:", info.messageId)
    res.json({ message: "Reset code sent" })
  } catch (err) {
    console.error("❌ Failed to send reset email:", err)
    res.status(500).json({ error: "Failed to send reset code" })
  }
}

export const resetPassword = async (req, res) => {
  const { email, code, password, confirmPassword } = req.body
  if (!email || !code || !password || !confirmPassword)
    return res.status(400).json({ error: "All fields are required" })

  if (password !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match" })

  const userRes = await pool.query(
    "SELECT id, reset_code, reset_code_expires FROM users WHERE email=$1",
    [email]
  )

  if (userRes.rows.length === 0)
    return res.status(400).json({ error: "Invalid code" })

  const user = userRes.rows[0]

  if (!user.reset_code || user.reset_code !== code || user.reset_code_expires < new Date())
    return res.status(400).json({ error: "Code is invalid or expired" })

  const hashedPassword = await bcrypt.hash(password, 10)

  await pool.query(
    "UPDATE users SET password=$1, reset_code=NULL, reset_code_expires=NULL WHERE id=$2",
    [hashedPassword, user.id]
  )

  res.json({ message: "Password reset successful" })
}