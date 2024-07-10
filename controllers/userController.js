const connection = require("../connection");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const SecretKey = "!@#$%^";
const forgetkey = "youforgot";
const con = connection();

const generateAccessToken = (user_id) => {
  return jwt.sign({ user_id }, SecretKey, { expiresIn: "6h" });
};

const signup = (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.json({
      message: "Username, email, and password are compulsory",
    });
  }

  if (!email.includes("@")) {
    return res.json({ message: "Email must contain '@' symbol" });
  }

  if (
    !(
      /[A-Z]/.test(password) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(password) &&
      password.length >= 6
    )
  ) {
    return res.json({
      message:
        "Password must contain at least one uppercase letter, one special char, and must have 6 characters",
    });
  }

  con.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    (err, result) => {
      if (result.length > 0) {
        return res.json({ message: "Username already taken" });
      }
      con.query(
        "SELECT * FROM users WHERE email = ?",
        [email],
        (err, result) => {
          if (result.length > 0) {
            return res.json({ message: "Email already registered" });
          }

          con.query(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            [username, email, password],
            (err, result) => {
              if (err) {
                console.log(err);
                res.json({ message: "signup failed " });
              }
              const accessToken = generateAccessToken(result.insertId);
              res.json({ message: "signup successful" });
            }
          );
        }
      );
    }
  );
};

const login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are compulsory" });
  }

  con.query(
    "SELECT * FROM users WHERE email = ? AND password = ?",
    [email, password],
    (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      // Assuming results[0] contains the first matched user
      const user = results[0];
      const accessToken = generateAccessToken(user.user_id);
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        maxAge: 6 * 60 * 60 * 1000,
      });
      res.status(200).json({ message: "Login successful", accessToken });
    }
  );
};

const forgetPassword = (req, res) => {
  const { email } = req.body;
  con.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (results.length == 0) {
      res.json({ message: "email not found" });
    } else {
      sendpasswordmailer(email);
      res.json({
        message: "email sent successfully. Please check spam folder ",
      });
    }
  });
};

const resetPassword = (req, res) => {
  const token = req.query.token;
  const { newpassword, confirmpassword } = req.body;
  let email;

  jwt.verify(token, forgetkey, (err, emailobj) => {
    if (err) {
      console.error("JWT verification error:", err);
      return res.status(403).json({ error: "Invalid token" });
    }
    email = emailobj.email;
    if (newpassword == confirmpassword) {
      const updateQuery = "UPDATE users SET password = ? WHERE email = ?";
      con.query(updateQuery, [newpassword, email], (err, result) => {
        if (err) {
          console.error("Database update error:", err);
          return res.status(500).json({ error: "Database error" });
        }
        console.log("Password updated successfully");
        res.json({ message: "Password reset successfully" });
      });
    } else {
      res.json({ message: "both passwords should be same" });
    }
  });
};

const changePassword = (req, res) => {
  const { currentpassword, newpassword, confirmpassword } = req.body;
  const user_id = req.user_id;

  con.query(
    "SELECT password FROM users WHERE user_id = ?",
    [user_id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const storedpassword = results[0].password;

      if (currentpassword !== storedpassword) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      if (newpassword == confirmpassword) {
        con.query(
          "UPDATE users SET password = ? WHERE user_id = ?",
          [newpassword, user_id],
          (err, result) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ message: "Password updated successfully" });
          }
        );
      } else {
        res.json({ message: "both passwords should be same" });
      }
    }
  );
};

const logout = (req, res) => {
  res.clearCookie("accessToken");
  res.json({ message: "Logged out successfully" });
};
const generatetoken = (email) => {
  const token = jwt.sign({ email }, forgetkey, { expiresIn: "1h" });
  return token;
};
const sendpasswordmailer = async (email) => {
  try {
    const token = generatetoken(email);
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      auth: {
        user: "fenilkakadiya7777@gmail.com",
        pass: "rkue vcak sned qjxv",
      },
    });

    const mailoption = {
      from: "fenilkakadiya7777@gmail.com",
      to: email,
      subject: "reset passowred",
      text: "down down donw donw",
      html: `<b>click here to <a href= "http://localhost:6000/users/resetpassword?token=${token}" >reset your password </a> </b>`,
    };

    let info = await transporter.sendMail(mailoption);
    console.log("Message sent: %s", info.messageId);
  } catch (e) {
    console.log(e);
  }
};

module.exports = {
  signup,
  login,
  forgetPassword,
  resetPassword,
  changePassword,
  logout,
  sendpasswordmailer,
};
