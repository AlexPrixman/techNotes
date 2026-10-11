export default function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  let status = err.status || 500;
  let message = err.message;
  if (err.code === 11000) {
    status = 409;
    message = "That username or note title already exists.";
  }
  if (err.name === "ValidationError" || err.name === "CastError") status = 400;
  if (err.name === "VersionError") {
    status = 409;
    message = "This note changed. Reload it before saving again.";
  }
  if (status >= 500) {
    console.error(err);
    message = "An unexpected server error occurred.";
  }
  res.status(status).json({ message });
}
