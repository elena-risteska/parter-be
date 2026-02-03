import pool from "../config/db.js";
import bcrypt from "bcryptjs";

export const getProfile = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      "SELECT id, first_name, last_name, email FROM users WHERE id = $1",
      [userId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

export const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { firstName, lastName } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE users
      SET first_name = $1, last_name = $2
      WHERE id = $3
      RETURNING id, first_name, last_name, email
      `,
      [firstName, lastName, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

export const changePassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "Both passwords are required" });

  try {
    const userRes = await pool.query(
      "SELECT password FROM users WHERE id = $1",
      [userId],
    );
    if (userRes.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const passwordMatch = await bcrypt.compare(
      currentPassword,
      userRes.rows[0].password,
    );
    if (!passwordMatch)
      return res.status(400).json({ error: "Current password is incorrect" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashedPassword,
      userId,
    ]);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to change password" });
  }
};

export const deleteProfile = async (req, res) => {
  const userId = req.user.id;
  try {
    await pool.query("DELETE FROM reservations WHERE user_id = $1", [userId]);

    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id, email",
      [userId],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    res.json({ message: "Profile and all reservations deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete profile" });
  }
};
