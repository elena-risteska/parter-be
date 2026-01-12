import express from "express"
import {
  createReservation,
  getMyReservations,
  getReservationById,
 getAllReservations,
  updateReservation,
  deleteReservation
} from "../controllers/reservation.controller.js"

import { protect } from "../middleware/auth.middleware.js"

const router = express.Router()

router.post("/", protect, createReservation)
router.get("/me", protect, getMyReservations)
router.get("/:id", protect, getReservationById)
router.get("/", protect, getAllReservations)
router.put("/:id", protect, updateReservation)
router.delete("/:id", protect, deleteReservation)

export default router
