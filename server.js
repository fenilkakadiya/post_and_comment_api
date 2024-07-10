const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const connection = require("./connection");

const admin_route = require("./admin");
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const commentRoutes = require("./routes/commentRoutes");
const profileRoutes = require("./routes/profileRoutes");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(__dirname + "public"));

const dir = "./uploads";
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

const PORT = 6000;
const con = connection();

app.use("/admin", admin_route);
app.use("/users", userRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(postRoutes);
app.use(commentRoutes);
app.use(profileRoutes);

app.listen(PORT, () => {
  console.log(`server is running on http://localhost:${PORT}`);
});
