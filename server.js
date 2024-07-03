const express = require("express");
const connection = require("./connection");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const admin_route = require("./admin");
const nodemailer = require("nodemailer");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
const SecretKey = "!@#$%^";
const forgetkey = "youforgot";
const con = connection();

app.use("/admin", admin_route);

const generateAccessToken = (user_id) => {
  return jwt.sign({ user_id }, SecretKey, { expiresIn: "6h" });
};

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
      html: `<b>click here to <a href= "http://localhost:6000/resetpassword?token=${token}" >reset your password </a> </b>`,
    };

    let info = await transporter.sendMail(mailoption);
    console.log("Message sent: %s", info.messageId);
  } catch (e) {
    // res.json({ message: "failed to send reset password token ! " });
    console.log(e);
  }
};
app.post("/signup", (req, res) => {
  const { username, email, password } = req.body;
  console.log("Received data:", { username, email, password });

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
              res.json({ message: "signup succesfull" });
            }
          );
        }
      );
    }
  );
});

app.post("/login", (req, res) => {
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
});

app.post("/posts", authenticateToken, (req, res) => {
  const { title, content } = req.body;
  const user_id = req.user_id;
  if (!title || !content) {
    return res.json({ message: "title  and content are compulsory" });
  }
  console.log(user_id);

  con.query(
    "INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)",
    [user_id, title, content],
    (err, result) => {
      res.status(200).json({ message: "Post created" });
    }
  );
});

app.post("/comments", authforcomment, (req, res) => {
  const { post_id, comment_content } = req.body;
  const user_id = req.user_id;
  console.log(user_id, post_id, comment_content);
  if (!comment_content) {
    res.json({ message: "comment is compulsory" });
  }
  con.query(
    "INSERT INTO comments (post_id, user_id, comment_content) VALUES (?, ?, ?)",
    [post_id, user_id, comment_content],
    (err, result) => {
      res.status(200).json({ message: "Comment added" });
    }
  );
});

app.get("/posts", authenticateToken, (req, res) => {
  const user_id = req.user_id;
  const query =
    "SELECT p.user_id,p.post_id, p.title, p.content,c.user_id as comment_user_id, c.comment_content FROM posts p LEFT JOIN comments c ON p.post_id = c.post_id WHERE p.user_id = ?;";
  con.query(query, [user_id], (err, results) => {
    res.status(200).json({ posts: results });
  });
});

app.get("/allposts", (req, res) => {
  const query = `
  SELECT p.post_id as post_id, p.title, p.content, c.user_id as user_id, c.comment_content as comment
  FROM posts p
  LEFT JOIN comments c ON p.post_id = c.post_id
`;

  con.query(query, (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const postsMap = new Map();

    results.forEach((row) => {
      const postId = row.post_id;

      if (!postsMap.has(postId)) {
        postsMap.set(postId, {
          id: postId,
          title: row.title,
          content: row.content,
          comments: [],
        });
      }

      if (row.user_id) {
        postsMap.get(postId).comments.push({
          user_id: row.user_id,
          comment: row.comment,
        });
      }
    });

    const posts = Array.from(postsMap.values());
    res.json(posts);
  });
});

app.post("/editcomment", authenticateToken, (req, res) => {
  const { content, comment_id } = req.body;
  const user_id = req.user_id;

  const checkQuery =
    "SELECT * FROM comments WHERE comment_id = ? AND user_id = ?";
  con.query(checkQuery, [comment_id, user_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (rows.length === 0) {
      return res
        .status(403)
        .json({ error: "You are not authorized to edit this comment." });
    }

    const updateQuery =
      "UPDATE comments SET comment_content = ? WHERE comment_id = ?";
    con.query(updateQuery, [content, comment_id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Comment updated successfully", results: result });
    });
  });
});

app.post("/delete", authenticateToken, (req, res) => {
  const { comment_id } = req.body;
  const user_id = req.user_id;

  const checkQuery =
    "SELECT * FROM comments WHERE user_id = ? AND comment_id = ?";
  con.query(checkQuery, [user_id, comment_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (results.length === 0) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this comment." });
    }
    const deleteQuery =
      "DELETE FROM comments WHERE user_id = ? AND comment_id = ?";
    con.query(deleteQuery, [user_id, comment_id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Comment deleted successfully", results: result });
    });
  });
});

app.post("/logout", (req, res) => {
  res.clearCookie("accessToken");
  res.json({ message: "Logged out successfully" });
});

app.post("/forgetpassword", (req, res) => {
  const { email } = req.body;
  con.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (results.length == 0) {
      res.json({ message: "email not found" });
    } else {
      sendpasswordmailer(email);
      res.json({ message: "email sent succesfully" });
    }
  });
});

app.post("/resetpassword", (req, res) => {
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
});

app.post("/changepassword", authenticateToken, (req, res) => {
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
});

app.listen(6000);
