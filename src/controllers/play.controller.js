import pool from "../config/db.js"

export const getPlays = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM plays
       ORDER BY date ASC, time ASC`
    )

    res.json(result.rows)
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: "Failed to fetch plays" })
  }
}

export const getPlayById = async (req, res) => {
  const { id } = req.params

  try {
    const result = await pool.query(
      "SELECT * FROM plays WHERE id = $1",
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Play not found" })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: "Failed to fetch play" })
  }
}

export const createPlay = async (req, res) => {
  const {
    title,
    description,
    date,
    time,
    duration,
    director,
    price,
    total_seats
  } = req.body

  if (!title || !date || !time || !price || !director ||!total_seats) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  try {
    const result = await pool.query(
      `INSERT INTO plays
       (title, description, date, time, duration, director,price, total_seats)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [title, description, date, time, duration, director, price, total_seats]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: "Failed to create play" })
  }
}

export const updatePlay = async (req, res) => {
  const { id } = req.params
  const {
    title,
    description,
    date,
    time,
    duration,
    director,
    price,
    total_seats
  } = req.body

  try {
    const result = await pool.query(
      `UPDATE plays
       SET title=$1,
           description=$2,
           date=$3,
           time=$4,
           duration=$5,
           director=$6,
           price=$7,
           total_seats=$8
       WHERE id=$9
       RETURNING *`,
      [
        title,
        description,
        date,
        time,
        duration,
        director,
        price,
        total_seats,
        id
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Play not found" })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: "Failed to update play" })
  }
}

export const deletePlay = async (req, res) => {
  const { id } = req.params

  try {
    const result = await pool.query(
      "DELETE FROM plays WHERE id = $1 RETURNING *",
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Play not found" })
    }

    res.json({ message: "Play deleted successfully" })
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: "Failed to delete play" })
  }
}
