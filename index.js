var express = require('express');
var request = require("request");
var session = require('express-session');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var multer = require('multer');
var bcrypt = require('bcrypt');
var nodemailer = require('nodemailer');
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
    user: 'root',
    password: 'jose',
    database: 'users'
});
connection.connect();

/* Middleware */
function isAuthenticated(req, res, next){
    if(!req.session.authenticated) res.redirect('/login');
    else next();
}

function checkUsername(username){
    let stmt = 'SELECT * FROM users WHERE username=?';
    return new Promise(function(resolve, reject){
       connection.query(stmt, [username], function(error, results){
           if(error) throw error;
           resolve(results);
       }); 
    });
}

function checkPassword(password, hash){
    return new Promise(function(resolve, reject){
       bcrypt.compare(password, hash, function(error, result){
          if(error) throw error;
          resolve(result);
       }); 
    });
}



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

/* Login Routes */
app.get('/login', function(req, res){
    res.render('login');
});

app.post('/login', async function(req, res){
    let isUserExist   = await checkUsername(req.body.username);
    let hashedPasswd  = isUserExist.length > 0 ? isUserExist[0].password : '';
    let passwordMatch = await checkPassword(req.body.password, hashedPasswd);
    if(passwordMatch){
        req.session.authenticated = true;
        req.session.user = isUserExist[0].username;
        res.redirect('/welcome');
    }
    else{
        res.render('login', {error: true});
    }
});

/* Register Routes */
app.get('/register', function(req, res){
    res.render('register');
});

app.post('/register', function(req, res){
    let salt = 10;
    console.log(req.body.password,req.body.username);
    bcrypt.hash(req.body.password, salt, function(error, hash){
        if(error) throw error;
        let stmt = 'INSERT INTO users (username, password, firstname, lastname) VALUES (?, ?, ?, ?)';
        let data = [req.body.username, hash, req.body.firstname, req.body.lastname];
        connection.query(stmt, data, function(error, result){
           if(error) throw error;
           res.redirect('/login');
        });
    });
});

/*About Routes */
app.get('/about', function(req,res){
    res.render('about');
});

/*Contact Routes */
app.get('/contact', function(req,res){
    res.render('contact');
});

app.post('/contact', function(req, res) {
    
    //instantiating the smtp server
    const smtpTrans = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465, 
        secure: true, 
        auth: {
            user: 'josealfaroproj3@gmail.com',
            pass: 'Password_proj3'
        }
    });
    
    //specify what email will look like
    var htmlBody = `<h2>Mail From Contact Form</h2><p> <h3>Name: </h3>${req.body.name} <h3>Email: </h3> <a href="mailto:${req.body.email}">${req.body.email}</a></p><p><h3>Message: </h3>${req.body.message}</p>`;
    var mailOpts = {
        from: '<email@email.com>',
        to: 'josealfaroproj3@gmail.com',
        subject: 'New Message',
        text: `FROM: ${req.body.name} EMAIL: ${req.body.email} MESSAGE: ${req.body.message}`,
        html: htmlBody
    };
    
    //attempt to send mail
    smtpTrans.sendMail(mailOpts, function(error, response) {
        if(error){
            res.render('contact-failure');
        }
        else{
            res.render('contact-success');
        }
    });
});


/* Logout Route */
app.get('/logout', function(req, res){
   req.session.destroy();
   res.redirect('/');
});

/* Welcome Route */
app.get('/welcome', isAuthenticated, function(req, res){
   res.render('welcome', {user: req.session.user}); 
});


/* Error Route*/
app.get('*', function(req, res){
   res.render('error'); 
});

app.listen(process.env.PORT || 3000, function(){
    console.log('Server has been started');
})