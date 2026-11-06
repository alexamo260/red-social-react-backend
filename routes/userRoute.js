const express = require('express');
const router = express.Router();
const { registerUser, loginUser, profileUser, listUsers, editUser, deleteUser, uploadUserAvatar, showAvatar, counters } = require('../controllers/userController');
const { checkAuth } = require('../middlewares/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const avatarsDirectory = path.join(__dirname, '..', 'uploads', 'avatars');

fs.mkdirSync(avatarsDirectory, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, avatarsDirectory);
    },
    filename: function (req, file, cb) {
        cb(null, 'avatar-' + Date.now() + path.extname(file.originalname).toLowerCase());
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, callback) => callback(null, file.mimetype.startsWith('image/'))
});

router.post('/register-user', upload.single('avatar'), registerUser);
router.post('/login-user', loginUser);
router.get('/profile/:id', checkAuth, profileUser);
router.get('/list-users/:page', checkAuth, listUsers);
router.put('/edit-user/:id', checkAuth, editUser);
router.delete('/delete-user/:id', checkAuth, deleteUser);
router.post('/upload-avatar/:id', [checkAuth, upload.single('avatar')], uploadUserAvatar);
router.get('/show-avatar/:filename', showAvatar);
router.get('/counters/:id', checkAuth, counters);


module.exports = router;