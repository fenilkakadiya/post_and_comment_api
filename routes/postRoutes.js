const express = require("express");
const router = express.Router();
const { authenticateToken, checkTFA } = require("../middleware/authentication");
const { upload } = require("../middleware/authentication");

const postController = require("../controllers/postController");

router.post(
  "/posts",
  authenticateToken,
  checkTFA,
  upload.single("photo"),
  postController.createPost
);
router.get("/posts", authenticateToken, checkTFA, postController.getPosts);
router.get("/allposts", postController.getAllPosts);

module.exports = router;
