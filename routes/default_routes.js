const router = require('express').Router();

// API route
router.get('/courtesy-route', (req, res) => {
    res.json({ message: 'you have connected to jwt-demoapp api, and it is running!' });
});

module.exports = router;
