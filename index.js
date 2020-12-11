var express = require('express');
var request = require("request");
var session = require('express-session');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var multer = require('multer');
var bcrypt = require('bcrypt');
const fetch = require('node-fetch');
var app = express();

const router = express.Router();
const actionRouter = require('./routes/action');
const searchRouter = require('./routes/search');
const tfjsRouter = require('./routes/tfjs');

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
//     host: 'localhost',
//     user: 'root',
//     password: '13Beagles',
//     database: 'project3'
// });

let connection
if (process.env.JAWSDB_URL) {
    console.log("jawsdb")
    connection = mysql.createConnection(process.env.JAWSDB_URL);
} else {
    // create connection
    console.log("local db")
    connection =  mysql.createConnection({
        host: process.env.DATABASE_HOST,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE
    });
}
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

/* Action route */
app.use('/action', actionRouter);
app.use('/search', searchRouter);
app.use('/tfjs', tfjsRouter);

/* Logout Route */
app.get('/logout', function(req, res){
   req.session.destroy();
   res.redirect('/');
});

/* Welcome Route */
app.get('/welcome', isAuthenticated, function(req, res){
   res.render('welcome', {user: req.session.user}); 
});

/*Prediction Route*/
app.get('/pred', async (req, res) => {

    res.redirect('/prediction');
    // const key = 'RNQAGUEKH5UL8IF5';
    // const symbol = req.query.btnName;
    // const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${key}`;
    // let settings = {method: "Get"};
    // let stockData = []
    //
    // await fetch(url, settings)
    //     .then(res => res.json())
    //     .then((json) => {
    //         if (symbol != '') {
    //             let result = json["Time Series (Daily)"]
    //             console.log(result.size);
    //             for (let i in result) {
    //                 stockData.push(result[i])
    //             }
    //             res.render('pred', {
    //                 result: stockData
    //             });
    //         } else {
    //             res.redirect('/search')
    //         }
    //     });
});

app.post('/search', (req, res) => {
    res.render('search');
});

/* Error Route*/
app.get('*', function(req, res){
   res.render('search');
});

app.listen(process.env.PORT || 3000, function(){
    console.log('Server has been started');
})