import express from "express"
import cors from "cors"

const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.json({ message: "Parter backend is running ajmo" })
})

export default app
