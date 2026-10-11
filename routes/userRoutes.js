import { Router } from "express";
import { requireAuth, requireManager } from "../middleware/auth.js";
import {
  getAllUsers,
  getAssignees,
  createNewUser,
  updateUser,
  deleteUser,
} from "../controllers/usersController.js";
const router = Router();
router.use(requireAuth);
router.get("/assignees", getAssignees);
router.use(requireManager);
router
  .route("/")
  .get(getAllUsers)
  .post(createNewUser)
  .patch(updateUser)
  .delete(deleteUser);
router.route("/:id").patch(updateUser).delete(deleteUser);
export default router;
