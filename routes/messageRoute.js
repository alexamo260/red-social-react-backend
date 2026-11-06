const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middlewares/auth');
const { getInbox, getFollowedUsers, sendMessage } = require('../controllers/messageController');

router.get('/messages/inbox', checkAuth, getInbox);
router.get('/messages/following', checkAuth, getFollowedUsers);
router.post('/messages', checkAuth, sendMessage);

module.exports = router;