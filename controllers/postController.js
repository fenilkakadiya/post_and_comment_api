const path = require("path");
const connection = require("../connection");
const con = connection();

const createPost = (req, res) => {
  const { title, content } = req.body;
  const user_id = req.user_id;
  let photo = req.file ? path.join("uploads", req.file.filename) : null;

  if (photo) {
    photo = photo.replace(/\\/g, "/");
  }

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
      res.status(200).json({ message: "Post created", results: result, photo });
    }
  );
};

const getPosts = (req, res) => {
  const user_id = req.user_id;
  const query =
    "SELECT p.user_id,p.post_id, p.title, p.content,c.user_id as user_id,c.comment_id, c.comment_content FROM posts p LEFT JOIN comments c ON p.post_id = c.post_id WHERE p.user_id = ?;";
  con.query(query, [user_id], (err, results) => {
    res.status(200).json({ posts: results });
  });
};

const getAllPosts = (req, res) => {
  const { search } = req.query;

  let query = `
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
        users cu ON c.user_id = cu.user_id
  `;

  const queryParams = [];

  if (search) {
    if (isNaN(search)) {
      query += " WHERE u.username = ?";
      queryParams.push(search);
    } else {
      query += " WHERE p.post_id = ?";
      queryParams.push(Number(search));
    }
  }

  con.query(query, queryParams, (err, results) => {
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
};

module.exports = {
  createPost,
  getPosts,
  getAllPosts,
};
