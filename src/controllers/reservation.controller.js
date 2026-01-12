import pool from "../config/db.js"

export const createReservation = async (req, res) => {
  const userId = req.user.id
  const { playId, seats } = req.body

  if (!playId || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ error: "Play and seats are required" })
  }

  try {
    // Check if user already has a reservation for this play
    const existing = await pool.query(
      "SELECT id FROM reservations WHERE user_id = $1 AND play_id = $2",
      [userId, playId]
    )

    if (existing.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "You already have a reservation for this play" })
    }

    // Get play price
    const playRes = await pool.query(
      "SELECT price FROM plays WHERE id = $1",
      [playId]
    )

    if (playRes.rows.length === 0) {
      return res.status(404).json({ error: "Play not found" })
    }

    const price = playRes.rows[0].price
    const totalPrice = price * seats.length

    // Create reservation
    const result = await pool.query(
      `
      INSERT INTO reservations
      (user_id, play_id, seats, total_price, expires_at)
      VALUES ($1, $2, $3, $4, NOW() + INTERVAL '10 minutes')
      RETURNING *
      `,
      [userId, playId, seats, totalPrice]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Create reservation error:", err.message)
    res.status(500).json({ error: "Failed to create reservation" })
  }
}

export const getMyReservations = async (req, res) => {
  const userId = req.user.id

  try {
    const result = await pool.query(
      `
      SELECT 
        r.*,
        p.title,
        p.date,
        p.time
      FROM reservations r
      JOIN plays p ON p.id = r.play_id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      `,
      [userId]
    )

    res.json(result.rows)
  } catch (err) {
    console.error("Get reservations error:", err.message)
    res.status(500).json({ error: "Failed to fetch reservations" })
  }
}

export const getReservationById = async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  try {
    const result = await pool.query(
      "SELECT * FROM reservations WHERE id = $1 AND user_id = $2",
      [id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reservation not found" })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error("Get reservation error:", err.message)
    res.status(500).json({ error: "Failed to fetch reservation" })
  }
}

export const getAllReservations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.seats,
        r.total_price,
        r.status,
        r.created_at,
        u.id AS user_id,
        u.email,
        p.title,
        p.date,
        p.time
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      JOIN plays p ON r.play_id = p.id
      ORDER BY r.created_at DESC
    `)

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch reservations" })
  }
}

export const updateReservation = async (req, res) => {
  const { id } = req.params
  const { seats } = req.body
  const userId = req.user.id

  if (!Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ error: "Seats are required" })
  }

  try {
    // Get play price for recalculation
    const priceRes = await pool.query(
      `
      SELECT p.price
      FROM reservations r
      JOIN plays p ON p.id = r.play_id
      WHERE r.id = $1 AND r.user_id = $2
      `,
      [id, userId]
    )

    if (priceRes.rows.length === 0) {
      return res.status(404).json({ error: "Reservation not found" })
    }

    const totalPrice = priceRes.rows[0].price * seats.length

    const result = await pool.query(
      `
      UPDATE reservations
      SET seats = $1, total_price = $2
      WHERE id = $3 AND user_id = $4
      RETURNING *
      `,
      [seats, totalPrice, id, userId]
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error("Update reservation error:", err.message)
    res.status(500).json({ error: "Failed to update reservation" })
  }
}

export const deleteReservation = async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  try {
    const result = await pool.query(
      `
      UPDATE reservations
      SET status = 'cancelled'
      WHERE id = $1 AND user_id = $2
      RETURNING *
      `,
      [id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reservation not found" })
    }

    res.json({ message: "Reservation cancelled successfully" })
  } catch (err) {
    console.error("Delete reservation error:", err.message)
    res.status(500).json({ error: "Failed to cancel reservation" })
  }
}
