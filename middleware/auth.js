import User from "../models/User.js";
import { HttpError, isManager } from "../lib/validation.js";
export async function requireAuth(req, res, next) {
  if (!req.session.userId) throw new HttpError(401, "Please sign in.");
  const user = await User.findById(req.session.userId);
  if (
    !user?.active ||
    (req.session.version ?? 0) !== (user.sessionVersion ?? 0)
  )
    throw new HttpError(401, "Your session has expired. Please sign in again.");
  req.user = user;
  next();
}
export function requireManager(req, res, next) {
  if (!isManager(req.user))
    throw new HttpError(403, "Manager or Admin access is required.");
  next();
}
