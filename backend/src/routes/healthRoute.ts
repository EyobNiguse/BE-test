import express from "express";
const router = express.Router();

// API Documentation
/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Check API health
 *     description: Returns OK if API is running. Used by Docker healthcheck to verify service status.
 *     responses:
 *       200:
 *         description: API is healthy and ready to accept requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                   description: Status indicator showing API health
 */
router.get("/", (req, res) => {
    res.status(200).json({ status: "OK" });
});

export default router;
