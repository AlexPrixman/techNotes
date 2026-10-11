import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getAllNotes,
  getNote,
  createNewNote,
  updateNote,
  deleteNote,
} from "../controllers/notesController.js";
const router = Router();
router.use(requireAuth);
router
  .route("/")
  .get(getAllNotes)
  .post(createNewNote)
  .patch(updateNote)
  .delete(deleteNote);
router.route("/:id").get(getNote).patch(updateNote).delete(deleteNote);
export default router;
