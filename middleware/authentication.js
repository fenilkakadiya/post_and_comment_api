const jwt = require("jsonwebtoken");

const SecretKey = "!@#$%^";

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

module.exports = {
  authenticateToken,
  authforcomment,
};
