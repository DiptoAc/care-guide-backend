function notFound(req, res) {
  res.status(404).json({ message: "Route not found" });
}

function errorHandler(error, req, res, next) {
  if (error?.code === 11000) {
    return res.status(409).json({ message: "Email already exists" });
  }

  if (error?.name === "CastError") {
    return res.status(400).json({ message: "Invalid identifier" });
  }

  if (error?.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation failed",
      details: Object.values(error.errors).map((item) => item.message)
    });
  }

  console.error(error);
  res.status(error.status || 500).json({
    message: error.status ? error.message : "Internal server error"
  });
}

module.exports = { notFound, errorHandler };
