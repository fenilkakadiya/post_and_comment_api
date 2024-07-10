const connection = require("../connection");
const con = connection();

const uploadProfilePhoto = (req, res) => {
  const user_id = req.user_id;
  const profilePhoto = req.file ? req.file.path.replace(/\\/g, "/") : null;

  if (!profilePhoto) {
    return res.status(400).json({ message: "Profile photo is compulsory" });
  }

  con.query(
    "UPDATE users SET photo_path = ? WHERE user_id = ?",
    [profilePhoto, user_id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ message: "Profile photo uploaded successfully", result });
    }
  );
};

const getProfile = (req, res) => {
  const user_id = req.user_id;
  con.query(
    "SELECT * FROM users WHERE user_id = ?",
    [user_id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ profile: result[0] });
    }
  );
};

module.exports = {
  uploadProfilePhoto,
  getProfile,
};
