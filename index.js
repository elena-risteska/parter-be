const express = require("express")
const cors = require("cors")
require("dotenv").config()

const app = express()

// Middlewares
app.use(cors())
app.use(express.json())

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Parter backend is running ajmo" })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
