const express = require("express");
const router = express.Router();
const connection = require("./connection");
const SecretKey = "!@#$%^";
const jwt = require("jsonwebtoken");

const con = connection();

const generateAccessToken = (admin_id) => {
  return jwt.sign({ admin_id }, SecretKey, { expiresIn: "6h" });
};

const authenticateToken = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  jwt.verify(token, SecretKey, (err, admin) => {
    if (err) {
      console.error("JWT verification error:", err);
      return res.status(403).json({ error: "Invalid token" });
    }
    req.admin_id = admin.admin_id;
    console.log(admin);
    next();
  });
};

router.post("/", (req, res) => {
  const { admin_id, password } = req.body;
  if (!admin_id || !password) {
    return res
      .status(400)
      .json({ error: "admin_id and password are compulsory" });
  }

  con.query(
    "SELECT * FROM admin  WHERE admin_id = ? AND password = ?",
    [admin_id, password],
    (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      // Assuming results[0] contains the first matched user
      const admin = results[0];
      const accessToken = generateAccessToken(admin.admin_id);
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        maxAge: 6 * 60 * 60 * 1000,
      });
      res.status(200).json({ message: "Login successful", accessToken });
    }
  );
});

router.post("/delete", authenticateToken, (req, res) => {
  const { comment_id } = req.body;
  console.log(comment_id);

  const query = "DELETE  FROM comments WHERE comment_id = ?;";

  con.query(query, [comment_id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Comment deleted successfully", results: result });
  });
});

module.exports = router;
