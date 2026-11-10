const Publication = require('../models/publicationModel');
const fs = require('fs');
const path = require('path');
const followService = require('../services/followService');

const serializePublication = (publication, userId) => {
    const data = publication.toObject();
    const likedBy = data.likedBy || [];
    delete data.likedBy;
    return {
        ...data,
        likesCount: likedBy.length,
        likedByMe: likedBy.some(id => String(id) === String(userId))
    };
};

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
        const publication = await Publication.findById(req.params.id).select('+likedBy');
        if (!publication) return res.status(404).send({ message: 'Publicación no encontrada' });
        return res.status(200).send(serializePublication(publication, req.user.id));
    } catch (err) {
        return res.status(500).send({ message: 'Error fetching publications' });
    }
};

const editPublication = async (req, res) => {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).send({ message: 'El texto de la publicación no puede estar vacío' });

    try {
        const publication = await Publication.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { text },
            { new: true, runValidators: true }
        ).populate('user', '-password -role -__v').select('+likedBy');
        if (!publication) return res.status(404).send({ message: 'Publicación no encontrada' });
        return res.status(200).send(serializePublication(publication, req.user.id));
    } catch (err) {
        return res.status(500).send({ message: 'Error al editar la publicación' });
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

const likePublication = async (req, res) => {
    try {
        const publication = await Publication.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { likedBy: req.user.id } },
            { new: true }
        ).select('+likedBy');
        if (!publication) return res.status(404).send({ message: 'Publicación no encontrada' });
        return res.status(200).send(serializePublication(publication, req.user.id));
    } catch (err) {
        return res.status(500).send({ message: 'Error al dar me gusta a la publicación' });
    }
};

const unlikePublication = async (req, res) => {
    try {
        const publication = await Publication.findByIdAndUpdate(
            req.params.id,
            { $pull: { likedBy: req.user.id } },
            { new: true }
        ).select('+likedBy');
        if (!publication) return res.status(404).send({ message: 'Publicación no encontrada' });
        return res.status(200).send(serializePublication(publication, req.user.id));
    } catch (err) {
        return res.status(500).send({ message: 'Error al retirar el me gusta' });
    }
};

const listPublicationByUser = async (req, res) => {
    try {
        const publications = await Publication.find({ user: req.params.id })
            .select('+likedBy')
            .populate('user', '-password -role -__v')
            .sort({ createdAt: -1 });
        return res.status(200).send(publications.map(publication => serializePublication(publication, req.user.id)));
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
    const filterType = req.query.filter === 'following' ? 'following' : 'recent';
    const itemsPerPage = 10;
    const skip = (page - 1) * itemsPerPage;
    try {
        const myFollows = filterType === 'following'
            ? await followService.followUserIds(req.user.id)
            : { following: [] };
        const filter = filterType === 'following'
            ? { user: { $in: myFollows.following } }
            : { user: { $ne: req.user.id } };
        const [publications, total] = await Promise.all([
            Publication.find(filter)
                .select('+likedBy')
                .populate('user', '-password -role -__v')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(itemsPerPage),
            Publication.countDocuments(filter)
        ]);
        return res.status(200).send({
            status: 'success',
            message: 'Feed de publicaciones',
            filter: filterType,
            following: myFollows.following,
            total,
            page,
            pages: Math.ceil(total / itemsPerPage),
            publications: publications.map(publication => serializePublication(publication, req.user.id))
        });
    } catch (err) {
        return res.status(500).send({ message: `Error fetching publications feed: ${err}` });
    }
};


module.exports = {
    savePublication,
    getPublication,
    editPublication,
    deletePublication,
    likePublication,
    unlikePublication,
    listPublicationByUser,
    uploadImagePublication,
    showImagePublication,
    publicationsFeed
};