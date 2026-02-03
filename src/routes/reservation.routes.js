import express from "express";
import {
  createReservation,
  getMyReservations,
  getReservationById,
  deleteReservation,
  getAllReservations,
  getReservedSeatsByPlay,
} from "../controllers/reservation.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";

const router = express.Router();

// 🔐 USER
router.post("/", protect, createReservation);
router.get("/", protect, getMyReservations);
router.get("/:id", protect, getReservationById);
router.get("/play/:playId", protect, getReservedSeatsByPlay);
router.delete("/:id", protect, deleteReservation);

// 🔐 ADMIN ONLY
router.get("/admin/all", protect, adminOnly, getAllReservations);

export default router;
