const express = require('express');
const fetch = require('node-fetch');

const mysql = require('mysql');

const mysqlConfig = {
    database: process.env.MYSQL_DATABASE,
    host: process.env.MYSQL_HOST,
    password: process.env.MYSQL_PASSWORD,
    port: 3306,
    user: process.env.MYSQL_USER,
};

const pool = mysql.createPool(mysqlConfig);
const router = express.Router();

/* kludge way to stop route chaining in URL */
router.get('*/search', async function (req, res) {

    const key = 'RNQAGUEKH5UL8IF5';
    const q = req.query.keyword;
    const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${q}&apikey=${key}`;
    let settings = {method: "Get"};
    var symbols= [];

    await fetch(url, settings)
        .then(res => res.json())
        .then((json) => {
            if (q != '') {
                let result = json['bestMatches']
                console.log(result);
                console.log(result.length)
                for (let i in result) {
                    symbols.push(result[i]['1. symbol'])
                }
                console.log(typeof(symbols));
                res.render('search', {
                    result: symbols
                });
            } else {
                res.redirect('/search')
            }
        });

});
module.exports = router;
