const mysql = require("mysql");
const con = () => {
  const conneciton = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "test",
  });

  conneciton.connect((err) => {
    if (err) throw err;
  });

  return conneciton;
};
module.exports = con;
