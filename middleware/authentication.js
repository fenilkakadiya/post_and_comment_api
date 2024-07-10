const jwt = require("jsonwebtoken");
const SecretKey = "!@#$%^";
const multer = require("multer");
const path = require("path");
const connection = require("../connection");
const con = connection();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

const authenticateToken = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  jwt.verify(token, SecretKey, (err, user) => {
    if (err) {
      console.error("JWT verification error:", err);
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user_id = user.user_id;
    console.log(user);
    next();
  });
};

const authforcomment = (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token) {
    req.user_id = 0;
    next();
  } else {
    jwt.verify(token, SecretKey, (err, user) => {
      if (err) {
        // console.error('JWT verification error:', err);
        req.user_id = 0;
        // return res.status(403).json({ error: 'Invalid token' });
        next();
      } else {
        req.user_id = user.user_id;
        next();
      }
    });
  }
};

const checkTFA = (req, res, next) => {
  const userId = req.user_id;

  const query = "SELECT tfa FROM users WHERE user_id = ?";
  con.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length > 0 && results[0].tfa) {
      next();
    } else {
      res.status(403).json({
        message: "Two-Factor Authentication is required",
      });
    }
  });
};

module.exports = {
  authenticateToken,
  authforcomment,
  upload,
  checkTFA,
};
