const express = require("express");
const mongoose = require("mongoose");
const Note = require("../models/Note");
const { authenticate, requireRole } = require("../middleware/auth");
const { getPagination, paginationMeta } = require("../utils/pagination");

const router = express.Router();
router.use(authenticate);

router.post("/", async (req, res, next) => {
  try {
    const note = await Note.create({
      title: req.body.title,
      content: req.body.content,
      owner: req.user._id
    });
    res.status(201).json({ note });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = req.user.role === "admin" ? {} : { owner: req.user._id };
    const [notes, total] = await Promise.all([
      Note.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("owner", "name email"),
      Note.countDocuments(filter)
    ]);
    res.json({ notes, pagination: paginationMeta(page, limit, total) });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid note id" });
    }
    const filter = req.user.role === "admin"
      ? { _id: req.params.id }
      : { _id: req.params.id, owner: req.user._id };
    const note = await Note.findOne(filter).populate("owner", "name email");
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }
    res.json({ note });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid note id" });
    }
    const filter = req.user.role === "admin"
      ? { _id: req.params.id }
      : { _id: req.params.id, owner: req.user._id };
    const allowed = ["title", "content"];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    const note = await Note.findOneAndUpdate(filter, updates, {
      new: true,
      runValidators: true
    }).populate("owner", "name email");
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }
    res.json({ note });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid note id" });
    }
    const filter = req.user.role === "admin"
      ? { _id: req.params.id }
      : { _id: req.params.id, owner: req.user._id };
    const note = await Note.findOneAndDelete(filter);
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
