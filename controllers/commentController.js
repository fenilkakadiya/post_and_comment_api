const connection = require("../connection");
const con = connection();

const createComment = (req, res) => {
  const { post_id, comment_content } = req.body;
  const user_id = req.user_id;
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
};

const editComment = (req, res) => {
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
};

const deleteComment = (req, res) => {
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
};

module.exports = {
  createComment,
  editComment,
  deleteComment,
};
