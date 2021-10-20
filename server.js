const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const bcrypt = require("bcrypt");
const mysql = require("mysql");

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const PORT = 3000;

const db = mysql.createConnection({
    host        : "localhost",
    user        : "root",
    password    : "123456",
    database    : "nodemysql"
});

db.connect((err) => {
    if(err) throw err;
    console.log("Database connected")
});

app.use(express.static("public"));

app.get('/register', function(req, res) {
    res.sendFile(__dirname + '/public/register.html');
});

app.get('/forgot_password', function(req, res) {
    res.sendFile(__dirname + '/public/password.html');
});

io.on("connection", (socket) => {
    socket.on("registerUser", userdata => {
        let sql = `SELECT * FROM users WHERE username = ${mysql.escape(userdata.username)}`;
        let query = db.query(sql, (err, result) => {
            if(err) throw err;
            if(Object.keys(result).length > 0){
                socket.emit("userExists");
            }else{
                const pw = bcrypt.hash(userdata.password, 10);
                pw.then(function(result){
                    let hashedpw = result;
                    let user = {username: userdata.username, password: hashedpw};
                    let sql = "INSERT INTO users SET ?";
                    let query = db.query(sql, user, (err, result) => {
                    if(err) throw err;
                    socket.emit("userCreated");
                });
                });
            }
        });
    });
    socket.on("loginTry", userdata => {
        let sql = `SELECT * FROM users WHERE username = ${mysql.escape(userdata.username)}`;
        let query = db.query(sql, (err, result) => {
            if(err) throw err;
            if(Object.keys(result).length == 0){
                socket.emit("user-doesnt-exist");
            }else{
                let sql = `SELECT password FROM users WHERE username = "${userdata.username}"`;
                let query = db.query(sql, (err, result) => {
                    if(err) throw err;
                    setValue(result, userdata.password);
                })
            }
        });
    });
    function setValue(pw, userPw){
        let savedPw = pw[0].password;
        pwCheck(savedPw, userPw)
    }

    async function pwCheck(savedPw, enteredPw){
        if(await bcrypt.compare(enteredPw, savedPw)){
            socket.emit("access");
        }else{
            socket.emit("denied");
        }
    }

    socket.on("change-password", data => {
        const pw = bcrypt.hash(data.password, 10);
        pw.then(function(result){
            let hashedpw = result;
            let sql = 'UPDATE users SET password = "' + hashedpw + '" WHERE username = "' + data.username +'"';
            let query = db.query(sql, (err, result) => {
                if(err) throw err;
                socket.emit("changed");
            });
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
})
