const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middlewares/auth');
const { saveFollow, unfollow, following, followers } = require('../controllers/followController');

router.post('/save-follow', checkAuth, saveFollow);
router.post('/unfollow', checkAuth, unfollow);
router.get('/following/:id', checkAuth, following);
router.get('/following/:id/:page', checkAuth, following);
router.get('/followers/:id', checkAuth, followers);
router.get('/followers/:id/:page', checkAuth, followers);

module.exports = router;