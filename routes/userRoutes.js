const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authenticationMiddleware = require("../middleware/authentication");

router.post("/signup", userController.signup);
router.post("/login", userController.login);
router.post("/forgetpassword", userController.forgetPassword);
router.post("/resetpassword", userController.resetPassword);

router.use(authenticationMiddleware.authenticateToken); // Protect routes below this middleware

router.post("/changepassword", userController.changePassword);
router.post("/logout", userController.logout);

module.exports = router;
