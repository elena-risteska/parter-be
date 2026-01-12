import express from "express"
import cors from "cors"
import authRoutes from "./routes/auth.routes.js"
import playRoutes from "./routes/play.routes.js"

const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.json({ message: "Parter backend is running ajmo" })
})

app.use("/api/auth", authRoutes)
app.use("/api/plays", playRoutes)

export default app
