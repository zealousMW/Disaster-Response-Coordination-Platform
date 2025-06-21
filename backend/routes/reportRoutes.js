import { getReports } from "../controllers/reportController.js";
import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();
// Public route to get reports for a specific disaster
router.get("/:id", getReports);


export default router;