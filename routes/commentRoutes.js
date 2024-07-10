const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  authforcomment,
  checkTFA,
} = require("../middleware/authentication");
const commentController = require("../controllers/commentController");

router.post(
  "/comments",
  authforcomment,
  checkTFA,
  commentController.createComment
);
router.post(
  "/editcomment",
  authenticateToken,
  checkTFA,
  commentController.editComment
);
router.post(
  "/delete",
  authenticateToken,
  checkTFA,
  commentController.deleteComment
);

module.exports = router;
