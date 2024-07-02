const express = require('express');
const connection = require('./connection');
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
const SecretKey = '!@#$%^';

const con = connection();

const generateAccessToken = (user_id) => {
    return jwt.sign({ user_id }, SecretKey, { expiresIn: '6h' });
};


const authenticateToken =  (req, res, next) => {
    const token = req.cookies.accessToken

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized access' });
    }

    jwt.verify(token, SecretKey, (err, user) => {
        if (err) {
            console.error('JWT verification error:', err);
            return res.status(403).json({ error: 'Invalid token' });
        }
         req.user_id= user.user_id;

        next();
    });
};


app.post('/signup', (req, res) => {
    const { username, email, password } = req.body;
    console.log('Received data:', { username, email, password });

    if (!username || !email || !password) {
        return res.json({ message: "Username, email, and password are compulsory" });
    }

    if (!email.includes('@')) {
        return res.json({ message: "Email must contain '@' symbol" });
    }

    if (!(/[A-Z]/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password) && password.length >= 6)) {
        return res.json({ message: "Password must contain at least one uppercase letter, one special char, and must have 6 characters" });
    }

    con.query('SELECT * FROM users WHERE username = ?', [username], (err, result) => {
        if (result.length > 0) {
            return res.json({ message: "Username already taken" });
        }
        con.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
            if (result.length > 0) {
                return res.json({ message: "Email already registered" });
            }

            con.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, password], (err, result) => {
               if(err){
                console.log(err)
                res.json({message:"signup failed "})
               }
               const accessToken = generateAccessToken(result.insertId);
               res.json({message:"signup succesfull"})
            });
        });
    });
});


app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are compulsory' });
    }

    con.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Assuming results[0] contains the first matched user
        const user = results[0];
        const accessToken = generateAccessToken(user.user_id);
        res.cookie('accessToken', accessToken, { httpOnly: true, maxAge: 6 * 60 * 60 * 1000 });
        res.status(200).json({ message: 'Login successful',accessToken});
    });
});


app.post('/posts',authenticateToken, (req, res) => {
    const { title, content } = req.body;
    const user_id=req.user_id;
    if (!title || !content) {
        return res.json({ message: "title  and content are compulsory" });
    }
    console.log(user_id)

    con.query('INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)', [user_id, title, content], (err, result) => {

        res.status(200).json({ message: 'Post created' });
    });
});


app.post('/comments',authenticateToken, (req, res) => {
    const { post_id, comment_content } = req.body;
    const user_id=req.user_id;
    if(!comment_content){
        res.json({message:"comment is compulsory"})
    }
    con.query('INSERT INTO comments (post_id, user_id, comment_content) VALUES (?, ?, ?)', [post_id, user_id, comment_content], (err, result) => {

        res.status(200).json({ message: 'Comment added' });
    });
});


app.get('/posts',authenticateToken, (req, res) => {
    const user_id=req.user_id;
    const query = 'SELECT p.user_id,p.post_id, p.title, p.content,c.user_id as comment_user_id, c.comment_content FROM posts p LEFT JOIN comments c ON p.post_id = c.post_id WHERE p.user_id = ?;'
    con.query(query, [user_id], (err, results) => {

        res.status(200).json({ posts: results });
    });
});


app.listen(6000);