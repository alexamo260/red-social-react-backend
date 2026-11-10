const express = require('express');
const router = express.Router();
const { savePublication, getPublication, editPublication, deletePublication, likePublication, unlikePublication, listPublicationByUser, uploadImagePublication, showImagePublication, publicationsFeed } = require('../controllers/publicationController');
const { checkAuth } = require('../middlewares/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const publicationsDirectory = path.join(__dirname, '..', 'uploads', 'publications');

fs.mkdirSync(publicationsDirectory, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, publicationsDirectory);
    },
    filename: function (req, file, cb) {
        cb(null, 'publication-' + Date.now() + path.extname(file.originalname).toLowerCase());
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, callback) => callback(null, file.mimetype.startsWith('image/'))
});

router.post('/save-publication', checkAuth, savePublication);
router.get('/get-publication/:id', checkAuth, getPublication);
router.put('/edit-publication/:id', checkAuth, editPublication);
router.delete('/delete-publication/:id', checkAuth, deletePublication);
router.post('/like-publication/:id', checkAuth, likePublication);
router.delete('/unlike-publication/:id', checkAuth, unlikePublication);
router.get('/list-publication-by-user/:id', checkAuth, listPublicationByUser);
router.post('/upload-image-publication/:id', [checkAuth, upload.single('publication')], uploadImagePublication);       
router.get('/show-image-publication/:filename', showImagePublication);
router.get('/publications-feed', checkAuth, publicationsFeed);
router.get('/publications-feed/:page', checkAuth, publicationsFeed);


module.exports = router;