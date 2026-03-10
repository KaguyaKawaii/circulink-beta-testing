import express from "express";
import * as reportController from "../controllers/reportController.js";

const router = express.Router();

// ================== REPORT ROUTES ==================
router.get("/", reportController.getReports); // GET all reports
router.get("/archived", reportController.getArchivedReports); // GET archived reports
router.get("/staff/:staffId", reportController.getReportsByStaff); // GET reports by staff
router.get("/:id", reportController.getReportById); // GET report by ID

router.post("/", reportController.createReport); // CREATE new report
router.post("/:id/start", reportController.startReport); // START report (staff begins work)

// ================== BULK OPERATIONS ==================
router.post("/bulk-restore-archived", reportController.bulkRestoreArchivedReports); // BULK RESTORE archived reports
router.post("/bulk-delete-archived", reportController.bulkDeleteArchivedReports); // BULK DELETE archived reports

router.put("/:id/status", reportController.updateReportStatus); // UPDATE report status
router.put("/:id/resolve", reportController.resolveReport); // RESOLVE report
router.put("/:id/archive", reportController.archiveReport); // ARCHIVE report
router.put("/:id/restore", reportController.restoreReport); // RESTORE report

router.put("/:id/assign", reportController.assignReport); // ASSIGN report to staff

router.delete("/:id", reportController.deleteArchivedReport); // DELETE archived report permanently

export default router;