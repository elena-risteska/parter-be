import express from "express";
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteProfile,
} from "../controllers/profile.controller.js";
import { protect as authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getProfile);
router.put("/", updateProfile);
router.put("/password", changePassword);
router.delete("/", deleteProfile);

export default router;
