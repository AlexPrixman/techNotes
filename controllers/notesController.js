import User from "../models/User.js";
import Note from "../models/Note.js";
import {
  HttpError,
  objectId,
  text,
  boolean,
  isManager,
} from "../lib/validation.js";
const serialize = (note) => ({ ...note.toObject(), user: String(note.user) });
function authorize(req, note) {
  if (!isManager(req.user) && String(note.user) !== String(req.user._id))
    throw new HttpError(403, "You may only access your assigned notes.");
}
async function fields(req) {
  const body = req.body || {};
  const user = objectId(body.user);
  if (!isManager(req.user) && user !== String(req.user._id))
    throw new HttpError(403, "You may only assign notes to yourself.");
  if (!(await User.exists({ _id: user, active: true })))
    throw new HttpError(400, "Choose an active staff member.");
  return {
    user,
    title: text(body.title, "Title"),
    text: text(body.text, "Description", 10000),
    completed: boolean(body.completed ?? false, "Completed"),
  };
}
export async function getAllNotes(req, res) {
  const filter = isManager(req.user) ? {} : { user: req.user._id };
  res.json((await Note.find(filter).sort({ ticket: -1 })).map(serialize));
}
export async function getNote(req, res) {
  const note = await Note.findById(objectId(req.params.id));
  if (!note) throw new HttpError(404, "Note not found.");
  authorize(req, note);
  res.json(serialize(note));
}
export async function createNewNote(req, res) {
  const note = await Note.create(await fields(req));
  res.status(201).json(serialize(note));
}
export async function updateNote(req, res) {
  const note = await Note.findById(objectId(req.params.id || req.body?.id));
  if (!note) throw new HttpError(404, "Note not found.");
  authorize(req, note);
  Object.assign(note, await fields(req));
  await note.save();
  res.json(serialize(note));
}
export async function deleteNote(req, res) {
  if (!isManager(req.user))
    throw new HttpError(
      403,
      "Manager or Admin access is required to delete notes.",
    );
  const note = await Note.findById(objectId(req.params.id || req.body?.id));
  if (!note) throw new HttpError(404, "Note not found.");
  await note.deleteOne();
  res.sendStatus(204);
}
