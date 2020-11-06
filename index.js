var express = require('express');
var request = require("request");
var session = require('express-session');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var multer = require('multer');
var bcrypt = require('bcrypt');
var app = express();


app.use(express.static("css"));
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'top secret code!',
    resave: true,
    saveUninitialized: true
}));
app.set('view engine', 'ejs');

// const connection = mysql.createConnection({
//     host: process.env.HOST,
//     user: process.env.USERNAME,
//     password: process.env.PASSWORD,
//     database: process.env.DATABASE
// });
// connection.connect();

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'admin',
    password: 'admin',
    database: 'usersdb'
});
connection.connect();



/* Home Route*/
app.get('/', function(req, res) {
    
    let stmt = 'SELECT * FROM users';
    
    connection.query(stmt, function(error, results) {
        console.log("enter!");
        if (error) throw error;
        //if (results.length) {
            // console.log(results)
        res.render("home", { results: results });
        //}
    });
    
});


/* Error Route*/
app.get('*', function(req, res){
   res.render('error'); 
});

app.listen(process.env.PORT || 3000, function(){
    console.log('Server has been started');
})