import pool from "../config/db.js"

export const createReservation = async (req, res) => {
  const { play_id, seats } = req.body
  const user_id = req.user.id

  if (!play_id || !seats || seats.length === 0) {
    return res.status(400).json({ error: "Play and seats are required" })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // 1️⃣ Get already reserved seats for this play
    const reservedResult = await client.query(
      `
      SELECT seats
      FROM reservations
      WHERE play_id = $1
        AND status IN ('pending', 'confirmed')
      FOR UPDATE
      `,
      [play_id]
    )

    const reservedSeats = reservedResult.rows.flatMap(r => r.seats)

    // 2️⃣ Check seat conflicts
    const conflict = seats.some(seat => reservedSeats.includes(seat))

    if (conflict) {
      await client.query("ROLLBACK")
      return res.status(409).json({
        error: "One or more seats are already reserved"
      })
    }

    // 3️⃣ Get play price
    const playResult = await client.query(
      "SELECT price FROM plays WHERE id = $1",
      [play_id]
    )

    if (playResult.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({ error: "Play not found" })
    }

    const total_price = playResult.rows[0].price * seats.length

    // 4️⃣ Create reservation
    const insertResult = await client.query(
      `
      INSERT INTO reservations (user_id, play_id, seats, status, total_price)
      VALUES ($1, $2, $3, 'pending', $4)
      RETURNING *
      `,
      [user_id, play_id, seats, total_price]
    )

    await client.query("COMMIT")

    res.status(201).json(insertResult.rows[0])

  } catch (err) {
    await client.query("ROLLBACK")
    console.error(err)
    res.status(500).json({ error: "Reservation failed" })
  } finally {
    client.release()
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

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // 1️⃣ Get reservation + play_id
    const reservationRes = await client.query(
      `
      SELECT play_id
      FROM reservations
      WHERE id = $1 AND user_id = $2
      `,
      [id, userId]
    )

    if (reservationRes.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({ error: "Reservation not found" })
    }

    const play_id = reservationRes.rows[0].play_id

    // 2️⃣ Lock existing reservations EXCEPT this one
    const reservedResult = await client.query(
      `
      SELECT seats
      FROM reservations
      WHERE play_id = $1
        AND id != $2
        AND status IN ('pending', 'confirmed')
      FOR UPDATE
      `,
      [play_id, id]
    )

    const reservedSeats = reservedResult.rows.flatMap(r => r.seats)

    const conflict = seats.some(seat => reservedSeats.includes(seat))
    if (conflict) {
      await client.query("ROLLBACK")
      return res.status(409).json({
        error: "One or more seats are already reserved"
      })
    }

    // 3️⃣ Get price
    const priceRes = await client.query(
      "SELECT price FROM plays WHERE id = $1",
      [play_id]
    )

    const totalPrice = priceRes.rows[0].price * seats.length

    // 4️⃣ Update reservation
    const updateRes = await client.query(
      `
      UPDATE reservations
      SET seats = $1, total_price = $2
      WHERE id = $3 AND user_id = $4
      RETURNING *
      `,
      [seats, totalPrice, id, userId]
    )

    await client.query("COMMIT")
    res.json(updateRes.rows[0])

  } catch (err) {
    await client.query("ROLLBACK")
    console.error(err)
    res.status(500).json({ error: "Failed to update reservation" })
  } finally {
    client.release()
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
