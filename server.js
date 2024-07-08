const express = require("express");
const connection = require("./connection");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const path = require("path");
const admin_route = require("./admin");
const nodemailer = require("nodemailer");
const userRoutes = require("./routes/userRoutes");

const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

const fs = require("fs");
const dir = "./uploads";
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

const {
  authenticateToken,
  authforcomment,
} = require("./middleware/authentication");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(__dirname + "public"));
const SecretKey = "!@#$%^";
const forgetkey = "youforgot";
const con = connection();
const PORT = 6000;

app.use("/admin", admin_route);
app.use("/users", userRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
      text: " ",
      html: `<b>click here to <a href= "http://localhost:6000/resetpassword?token=${token}" >reset your password </a> </b>`,
    };

    let info = await transporter.sendMail(mailoption);
    console.log("Message sent: %s", info.messageId);
  } catch (e) {
    // res.json({ message: "failed to send reset password token ! " });
    console.log(e);
  }
};

app.post("/posts", authenticateToken, upload.single("photo"), (req, res) => {
  const { title, content } = req.body;
  const user_id = req.user_id;
  const photo = req.file ? req.file.path : null;

  if (!title || !content) {
    return res
      .status(400)
      .json({ message: "Title and content are compulsory" });
  }

  con.query(
    "INSERT INTO posts (user_id, title, content, photo) VALUES (?, ?, ?, ?)",
    [user_id, title, content, photo],
    (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error creating post", error: err });
      }
      res.status(200).json({ message: "Post created", results: result });
    }
  );
});

app.post(
  "/uploadprofile",
  authenticateToken,
  upload.single("ProfilePhoto"),
  (req, res) => {
    const ProfilePhoto = req.file ? req.file.path : null;
    const user_id = req.user_id;

    if (!user_id || !ProfilePhoto) {
      return res
        .status(400)
        .json({ error: "User ID and profile photo are required" });
    }

    con.query(
      "UPDATE users SET photo_path = ? WHERE user_id = ?",
      [ProfilePhoto, user_id],
      (error, results) => {
        if (error) {
          return res.status(500).json({ error: error.message });
        }
        res.json({ message: "Profile photo updated", ProfilePhoto });
      }
    );
  }
);

app.get("/profile", authenticateToken, (req, res) => {
  const user_id = req.user_id;
  const query = "SELECT username, photo_path FROM users WHERE user_id = ?";

  con.query(query, [user_id], (error, results) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const { username, photo_path } = results[0];
    const photoUrl = `http://localhost:6000/${photo_path}`;

    res.json({ username, photoUrl, photo_path });
  });
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
      res.status(200).json({ message: "Comment added", results: result });
    }
  );
});

app.get("/posts", authenticateToken, (req, res) => {
  const user_id = req.user_id;
  const query =
    "SELECT p.user_id,p.post_id, p.title, p.content,c.user_id as user_id,c.comment_id, c.comment_content FROM posts p LEFT JOIN comments c ON p.post_id = c.post_id WHERE p.user_id = ?;";
  con.query(query, [user_id], (err, results) => {
    res.status(200).json({ posts: results });
  });
});

app.get("/allposts", (req, res) => {
  const query = `
    SELECT 
        p.post_id AS post_id,
        p.user_id AS post_user_id,
        p.title,
        p.content,
        u.username AS post_username,
        c.comment_id,
        c.comment_content AS comment,
        c.user_id AS comment_user_id,
        cu.username AS comment_username
    FROM 
        posts p
    LEFT JOIN 
        comments c ON p.post_id = c.post_id
    LEFT JOIN 
        users u ON p.user_id = u.user_id
    LEFT JOIN 
        users cu ON c.user_id = cu.user_id;
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
          user_id: row.post_user_id,
          username: row.post_username,
          comments: [],
        });
      }

      if (row.comment_id) {
        postsMap.get(postId).comments.push({
          comment_id: row.comment_id,
          user_id: row.comment_user_id,
          username: row.comment_username,
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

app.post("/forgetpassword", (req, res) => {
  const { email } = req.body;
  con.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (results.length == 0) {
      res.json({ message: "email not found" });
    } else {
      sendpasswordmailer(email);
      res.json({
        message: "email sent succesfully. Please check spam folder ",
      });
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

app.listen(PORT, () => {
  console.log(`server is running on http://localhost:${PORT}`);
});
