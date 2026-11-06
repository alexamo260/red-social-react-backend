const Publication = require('../models/publicationModel');
const fs = require('fs');
const path = require('path');
const followService = require('../services/followService');

const savePublication = async (req, res) => {
    const publication = new Publication({ ...req.body, user: req.user.id });
    try {
        const savedPublication = await publication.save();
        return res.status(200).send(savedPublication);
    } catch (err) {
        return res.status(500).send({ message: 'Error saving publication' });
    }
};

const getPublication = async (req, res) => {
    try {
        const publication = await Publication.findById(req.params.id);
        return res.status(200).send(publication);
    } catch (err) {
        return res.status(500).send({ message: 'Error fetching publications' });
    }
};

const deletePublication = async (req, res) => {
    try {
        const deletedPublication = await Publication.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        });
        if (!deletedPublication) {
            return res.status(404).send({ message: 'Publicación no encontrada' });
        }
        return res.status(200).send(deletedPublication);
    } catch (err) {
        return res.status(500).send({ message: 'Error deleting publication' });
    }
};

const listPublicationByUser = async (req, res) => {
    try {
        const publications = await Publication.find({ user: req.params.id })
            .populate('user', '-password -role -__v')
            .sort({ createdAt: -1 });
        return res.status(200).send(publications);
    } catch (err) {
        return res.status(500).send({ message: 'Error fetching publications' });
    }
};

const uploadImagePublication = async (req, res) => {
    const id = req.params.id;
    if (!req.file) {
        return res.status(400).send({
            message: 'No se ha subido ninguna publicación'
        });
    }
    try {
        const publication = await Publication.findOneAndUpdate(
            { _id: id, user: req.user.id },
            { file: req.file.filename },
            { returnDocument: 'after' }
        ).exec();
        if (!publication) {
            return res.status(404).send({
                message: 'Publicación no encontrada'
            });
        }
        return res.status(200).send({
            message: 'Publicación subida correctamente',
            publication
        });
    } catch (err) {
        return res.status(500).send({
            message: `Error al subir la publicación: ${err}`
        });
    }
};

const showImagePublication = async (req, res) => {
    const filename = req.params.filename;
    const filePath = `./uploads/publications/${filename}`;
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            return res.status(404).send({
                message: 'Publicación no encontrada'
            });
        }
        return res.sendFile(path.resolve(filePath));
    });

};

const publicationsFeed = async (req, res) => {
    const page = Math.max(parseInt(req.params.page, 10) || 1, 1);
    const itemsPerPage = 10;
    const skip = (page - 1) * itemsPerPage;
    try {
        const myFollows = await followService.followUserIds(req.user.id);
        const filter = { user: { $in: myFollows.following } };
        const [publications, total] = await Promise.all([
            Publication.find(filter)
                .populate('user', '-password -role -__v')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(itemsPerPage),
            Publication.countDocuments(filter)
        ]);
        return res.status(200).send({
            status: 'success',
            message: 'Feed de publicaciones',
            following: myFollows.following,
            total,
            page,
            pages: Math.ceil(total / itemsPerPage),
            publications
        });
    } catch (err) {
        return res.status(500).send({ message: `Error fetching publications feed: ${err}` });
    }
};


module.exports = {
    savePublication,
    getPublication,
    deletePublication,
    listPublicationByUser,
    uploadImagePublication,
    showImagePublication,
    publicationsFeed
};