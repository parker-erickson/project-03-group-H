const express = require('express');

const router = express.Router();

router.get('/', (req, res, next) => {
    res.render('search', {
        // jsonResult: req.app.locals.session.results,
        // user: req.app.locals.session.user,
    });
    // req.app.locals.session.results = null;
});

module.exports = router;

