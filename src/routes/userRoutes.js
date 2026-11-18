const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const { authenticate, requireRole } = require("../middleware/auth");
const { getPagination, paginationMeta } = require("../utils/pagination");

const router = express.Router();
router.use(authenticate);

router.get("/me", (req, res) => {
  res.json({ user: req.user });
});

router.get("/", requireRole("admin"), async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [users, total] = await Promise.all([
      User.find().select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments()
    ]);
    res.json({ users, pagination: paginationMeta(page, limit, total) });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireRole("admin"), async (req, res, next) => {
  try {
    const { name, email, password, role = "user", interests } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const user = await User.create({ name, email, password, role, interests });
    res.status(201).json({ user: await User.findById(user._id).select("-password") });
  } catch (error) {
    next(error);
  }
});

router.get("/interests/group", requireRole("admin"), async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const grouped = await User.collection.aggregate([
      { $unwind: "$interests" },
      {
        $group: {
          _id: "$interests",
          users: { $push: { id: "$_id", name: "$name", email: "$email" } }
        }
      },
      { $sort: { _id: 1 } },
      {
        $facet: {
          groups: [
            { $skip: skip },
            { $limit: limit }
          ],
          total: [{ $count: "count" }]
        }
      }
    ]).toArray();

    const total = grouped[0].total[0]?.count || 0;
    res.json({
      groups: grouped[0].groups,
      pagination: paginationMeta(page, limit, total)
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (req.user.role !== "admin" && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const allowed = ["name", "email", "password", "role", "interests"];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (updates.role && !["user", "admin"].includes(updates.role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findById(req.params.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    Object.assign(user, updates);
    await user.save();
    res.json({ user: await User.findById(user._id).select("-password") });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/:id/posts", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (req.user.role !== "admin" && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const { page, limit, skip } = getPagination(req.query);
    const result = await User.collection.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
      {
        $lookup: {
          from: "posts",
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$author", "$$userId"] } } },
            { $sort: { createdAt: -1 } }
          ],
          as: "posts"
        }
      },
      {
        $set: {
          totalPosts: { $size: "$posts" },
          posts: { $slice: ["$posts", skip, limit] }
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          interests: 1,
          totalPosts: 1,
          posts: 1
        }
      }
    ]).toArray();

    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = result[0];
    res.json({
      user: { _id: req.params.id, name: user.name, email: user.email, interests: user.interests },
      posts: user.posts,
      pagination: paginationMeta(page, limit, user.totalPosts)
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
