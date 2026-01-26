import express from "express";
import {
  getPlays,
  getPlayById,
  createPlay,
  updatePlay,
  deletePlay,
} from "../controllers/play.controller.js";

import { protect, adminOnly } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getPlays);
router.get("/:id", getPlayById);

router.post("/", protect, adminOnly, createPlay);
router.put("/:id", protect, adminOnly, updatePlay);
router.delete("/:id", protect, adminOnly, deletePlay);

export default router;
