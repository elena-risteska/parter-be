import pool from "../config/db.js";

const EXPIRATION_MINUTES = 10;

export const createReservation = async (req, res) => {
  const { play_id, seats } = req.body;
  const user_id = req.user.id;

  if (!play_id || !Array.isArray(seats) || seats.length === 0) {
    return res
      .status(400)
      .json({ error: "Избирање претстава и седишта е задолжително" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Expire old pending reservations
    await client.query(`
      UPDATE reservations
      SET status = 'expired'
      WHERE status = 'pending'
        AND expires_at < NOW()
    `);

    // 2️⃣ Prevent multiple reservations per play per user
    const existingRes = await client.query(
      `
      SELECT 1
      FROM reservations
      WHERE user_id = $1
        AND play_id = $2
        AND status IN ('pending', 'confirmed')
      `,
      [user_id, play_id],
    );

    if (existingRes.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Веќе имаш резервација за оваа претстава",
      });
    }

    // 3️⃣ Lock seats for this play
    const reservedResult = await client.query(
      `
      SELECT seats
      FROM reservations
      WHERE play_id = $1
        AND status IN ('pending', 'confirmed')
      FOR UPDATE
      `,
      [play_id],
    );

    const reservedSeats = reservedResult.rows.flatMap((r) => r.seats);

    const conflict = seats.some((seat) => reservedSeats.includes(seat));
    if (conflict) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Некое од седиштата е веќе резервирано",
      });
    }

    // 4️⃣ Get play price
    const playResult = await client.query(
      "SELECT price FROM plays WHERE id = $1",
      [play_id],
    );

    if (playResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Претставата не е пронајдена" });
    }

    const total_price = playResult.rows[0].price * seats.length;

    // 5️⃣ Insert reservation
    const expiresAt = new Date(Date.now() + EXPIRATION_MINUTES * 60 * 1000);

    const insertResult = await client.query(
      `
      INSERT INTO reservations
        (user_id, play_id, seats, status, total_price, expires_at)
      VALUES
        ($1, $2, $3, 'pending', $4, $5)
      RETURNING *
      `,
      [user_id, play_id, seats, total_price, expiresAt],
    );

    await client.query("COMMIT");
    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Резервацијата не успеа" });
  } finally {
    client.release();
  }
};

export const getMyReservations = async (req, res) => {
  const userId = req.user.id;

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
      [userId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Неуспешно преземање на резервациите" });
  }
};

export const getReservationById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `
      SELECT *
      FROM reservations
      WHERE id = $1
        AND user_id = $2
      `,
      [id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Резервацијата не е пронајдена" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Неуспешно преземање на резервациите" });
  }
};

export const getAllReservations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.seats,
        r.total_price,
        r.status,
        r.expires_at,
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
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Неуспешно преземање на резервациите" });
  }
};

export const getReservedSeatsByPlay = async (req, res) => {
  const { playId } = req.params;

  const result = await pool.query(
    `
    SELECT seats
    FROM reservations
    WHERE play_id = $1
    `,
    [playId],
  );

  res.json(result.rows);
};

export const updateReservation = async (req, res) => {
  const { id } = req.params;
  const { seats } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ error: "Избирање седишта е задолжително" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      UPDATE reservations
      SET status = 'expired'
      WHERE status = 'pending'
        AND expires_at < NOW()
    `);

    const reservationRes = await client.query(
      `
      SELECT play_id
      FROM reservations
      WHERE id = $1
        AND user_id = $2
        AND status = 'pending'
        AND expires_at > NOW()
      `,
      [id, userId],
    );

    if (reservationRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Резервацијата истече или не може да се менува",
      });
    }

    const play_id = reservationRes.rows[0].play_id;

    const reservedResult = await client.query(
      `
      SELECT seats
      FROM reservations
      WHERE play_id = $1
        AND id != $2
        AND status IN ('pending', 'confirmed')
      FOR UPDATE
      `,
      [play_id, id],
    );

    const reservedSeats = reservedResult.rows.flatMap((r) => r.seats);

    const conflict = seats.some((seat) => reservedSeats.includes(seat));
    if (conflict) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Некое од седиштата е веќе резервирано",
      });
    }

    const priceRes = await client.query(
      "SELECT price FROM plays WHERE id = $1",
      [play_id],
    );

    if (priceRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Претставата не е пронајдена" });
    }

    const totalPrice = priceRes.rows[0].price * seats.length;

    const updateRes = await client.query(
      `
      UPDATE reservations
      SET seats = $1, total_price = $2
      WHERE id = $3 AND user_id = $4
      RETURNING *
      `,
      [seats, totalPrice, id, userId],
    );

    await client.query("COMMIT");
    res.json(updateRes.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Неуспешна измена на резервацијата" });
  } finally {
    client.release();
  }
};

export const deleteReservation = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `
      UPDATE reservations
      SET status = 'cancelled'
      WHERE id = $1 AND user_id = $2
      RETURNING *
      `,
      [id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Резервацијата не е пронајдена" });
    }

    res.json({ message: "Резервацијата е успешно откажана" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Грешка при откажувањето на резервацијата" });
  }
};
