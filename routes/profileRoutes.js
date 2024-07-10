const express = require("express");
const router = express.Router();
const { authenticateToken, checkTFA } = require("../middleware/authentication");
const { upload } = require("../middleware/authentication");
const profileController = require("../controllers/profileController");

router.post(
  "/uploadprofile",
  authenticateToken,
  checkTFA,
  upload.single("ProfilePhoto"),
  profileController.uploadProfilePhoto
);
router.get(
  "/profile",
  authenticateToken,
  checkTFA,
  profileController.getProfile
);

module.exports = router;
