import { Router } from "express";
import * as resourceController from "../controllers/resourceController.js";

const router = Router();
// Public routes
router.get("/nearby", resourceController.findNearbyResources);

export default router;