const User = require('../models/userModel');
const Publication = require('../models/publicationModel');
const bcrypt = require('bcrypt');
const { createToken } = require('../services/jwtService');
const fs = require('fs');
const path = require('path');
const { followUserIds, followThisUser, countFollowing, countFollowers } = require('../services/followService');

const registerUser = async (req, res) => {
    const { name, nick, email, password, role, image } = req.body;

    if (!name || !nick || !email || !password) {
        const missingFields = [
            !name && 'name',
            !nick && 'nick',
            !email && 'email',
            !password && 'password'
        ].filter(Boolean);

        return res.status(400).send({
            message: `Faltan datos obligatorios: ${missingFields.join(', ')}`
        });
    }
    const newUser = new User({
        name,
        nick,
        email,
        password: await bcrypt.hash(password, 10),
        role,
        image: req.file?.filename || image
    });

    try {
        const savedUser = await newUser.save();
        const userResponse = savedUser.toObject();
        delete userResponse.password;

        return res.status(201).send({
            message: 'Usuario registrado correctamente',
            user: userResponse
        });
    } catch (err) {
        return res.status(500).send({
            message: `Error al guardar el usuario: ${err}`
        });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        const missingFields = [
            !email && 'email',
            !password && 'password'
        ].filter(Boolean);

        return res.status(400).send({
            message: `Faltan datos obligatorios: ${missingFields.join(', ')}`
        });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send({
                message: 'Usuario no encontrado'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).send({
                message: 'Contraseña incorrecta'
            });
        }

        const userResponse = user.toObject();
        delete userResponse.password;

        return res.status(200).send({
            message: '¡Bienvenido a WAVELY Social!',
            user: userResponse,
            token: createToken(user)
        });
    } catch (err) {
        return res.status(500).send({
            message: `Error al autenticar el usuario: ${err}`
        });
    }
};

const profileUser = async (req, res) => {
    const id = req.params.id;  
    try {
        const user = await User.findById(id).select('-password -role').exec();
        if (!user) {
            return res.status(404).send({
                message: 'Usuario no encontrado'
            });
        }

        const followInfo = await followThisUser(req.user.id, id);

        return res.status(200).send({
            message: 'Perfil del usuario',
            user,
            followInfo
        });
    } catch (err) {
        return res.status(500).send({
            message: `Error al obtener el perfil del usuario: ${err}`
        });
    }
};

const listUsers = async (req, res) => {
    const page = parseInt(req.params.page) || 1;
    const itemsPerPage = 5;
    const filter = { _id: { $ne: req.user.id } };
    const search = String(req.query.search || '').trim();

    if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
            { name: { $regex: escapedSearch, $options: 'i' } },
            { nick: { $regex: escapedSearch, $options: 'i' } }
        ];
    }

    try {
        const [users, total] = await Promise.all([
            User.find(filter)
                .select('-password -role')
                .skip((page - 1) * itemsPerPage)
                .limit(itemsPerPage)
                .exec(),
            User.countDocuments(filter)
        ]);

        const followInfo = await followUserIds(req.user.id); 

        return res.status(200).send({
            message: 'Lista de usuarios',
            users,
            total,
            pages: Math.ceil(total / itemsPerPage),
            followInfo
        });
    } catch (err) {
        return res.status(500).send({
            message: `Error al obtener la lista de usuarios: ${err}`
        });
    }
};

const editUser = async (req, res) => {
    const id = req.params.id;
    if (String(id) !== String(req.user.id)) {
        return res.status(403).send({ message: 'Solo puedes editar tu propio perfil' });
    }

    const updateData = {};
    for (const field of ['name', 'nick', 'email']) {
        if (typeof req.body[field] === 'string') {
            updateData[field] = req.body[field].trim();
        }
    }

    if (Object.keys(updateData).length === 0 || Object.values(updateData).some((value) => !value)) {
        return res.status(400).send({ message: 'Nombre, nick y correo electrónico no pueden estar vacíos' });
    }

    try {
        const user = await User.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true
        }).select('-password -role').exec();
        if (!user) {
            return res.status(404).send({
                message: 'Usuario no encontrado'
            });
        }
        return res.status(200).send({
            message: 'Usuario actualizado correctamente',
            user
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).send({ message: 'El nick o el correo electrónico ya están en uso' });
        }
        return res.status(500).send({
            message: `Error al actualizar el usuario: ${err}`
        });
    }
};

const deleteUser = async (req, res) => {
    const id = req.params.id;
    try {
        const user = await User.findByIdAndDelete(id).select('-password -role').exec();
        if (!user) {
            return res.status(404).send({
                message: 'Usuario no encontrado'
            });
        }
        return res.status(200).send({
            message: 'Usuario eliminado correctamente',
            user
        });
    } catch (err) {
        return res.status(500).send({
            message: `Error al eliminar el usuario: ${err}`
        });
    }
};

const uploadUserAvatar = async (req, res) => {
    const id = req.params.id;
    if (String(id) !== String(req.user.id)) {
        return res.status(403).send({ message: 'Solo puedes cambiar tu propia foto de perfil' });
    }
    if (!req.file) {
        return res.status(400).send({
            message: 'Selecciona una imagen válida de hasta 5 MB'
        });
    }
    try {
        const user = await User.findByIdAndUpdate(req.user.id, { image: req.file.filename }, { returnDocument: 'after' }).select('-password -role').exec();
        if (!user) {
            return res.status(404).send({
                message: 'Usuario no encontrado'
            });
        }
        return res.status(200).send({
            message: 'Avatar subido correctamente',
            user
        });
    } catch (err) {
        return res.status(500).send({
            message: `Error al subir el avatar: ${err}`
        });
    }
};

const showAvatar = async (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, '..', 'uploads', 'avatars', filename);
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            return res.status(404).send({
                message: 'Avatar no encontrado'
            });
        }
        return res.sendFile(path.resolve(filePath));
    });

};

const counters = async (req, res) => {
    const id = req.params.id;
    try {
        const user = await User.findById(id).select('_id').exec();
        if (!user) {
            return res.status(404).send({ message: 'Usuario no encontrado' });
        }

        const [following, followers, publications] = await Promise.all([
            countFollowing(id),
            countFollowers(id),
            Publication.countDocuments({ user: id })
        ]);

        return res.status(200).send({
            following,
            followers,
            publications
        });
    } catch (err) {
        return res.status(500).send({
            message: `Error al obtener los contadores: ${err}`
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    profileUser,
    listUsers,
    editUser,
    deleteUser,
    uploadUserAvatar,
    showAvatar,
    counters
};