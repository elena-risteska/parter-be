import dotenv from "dotenv"
dotenv.config()

import pkg from "pg"
const { Pool } = pkg

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

export const connectDB = async () => {
  try {
    await pool.connect()
    console.log("✅ PostgreSQL connected")
  } catch (err) {
    console.error("❌ PostgreSQL connection failed")
    console.error(err.message)
    process.exit(1)
  }
}

export default pool
