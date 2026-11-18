const express = require("express");
const mongoose = require("mongoose");
const Post = require("../models/Post");
const { authenticate } = require("../middleware/auth");
const { getPagination, paginationMeta } = require("../utils/pagination");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [posts, total] = await Promise.all([
      Post.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate("author", "name email"),
      Post.countDocuments()
    ]);
    res.json({ posts, pagination: paginationMeta(page, limit, total) });
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate, async (req, res, next) => {
  try {
    const post = await Post.create({ content: req.body.content, author: req.user._id });
    res.status(201).json({ post: await post.populate("author", "name email") });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
