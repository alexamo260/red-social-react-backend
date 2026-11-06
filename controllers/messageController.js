const { Types } = require('mongoose');
const Follow = require('../models/followModel');
const Message = require('../models/messageModel');
const User = require('../models/userModel');

const getInbox = async (req, res) => {
    try {
        const messages = await Message.find({ recipient: req.user.id })
            .sort({ createdAt: -1 })
            .populate('sender', 'name nick image')
            .lean();
        return res.status(200).json(messages);
    } catch (error) {
        return res.status(500).json({ message: 'No se pudieron cargar los mensajes recibidos.' });
    }
};

const getFollowedUsers = async (req, res) => {
    try {
        const follows = await Follow.find({ user: req.user.id }).select('followed -_id').lean();
        const followedIds = follows.map((follow) => follow.followed);
        const users = await User.find({ _id: { $in: followedIds } })
            .select('name nick image')
            .sort({ nick: 1 })
            .lean();
        return res.status(200).json(users);
    } catch (error) {
        return res.status(500).json({ message: 'No se pudieron cargar las personas que sigues.' });
    }
};

const sendMessage = async (req, res) => {
    const body = req.body || {};
    const { recipientId } = body;
    const text = typeof body.text === 'string' ? body.text.trim() : '';

    if (!Types.ObjectId.isValid(recipientId)) {
        return res.status(400).json({ message: 'Selecciona un destinatario válido.' });
    }
    if (!text) {
        return res.status(400).json({ message: 'El mensaje no puede estar vacío.' });
    }
    if (text.length > 2000) {
        return res.status(400).json({ message: 'El mensaje no puede superar los 2000 caracteres.' });
    }
    if (String(req.user.id) === String(recipientId)) {
        return res.status(400).json({ message: 'No puedes enviarte un mensaje a ti mismo.' });
    }

    try {
        const recipient = await User.exists({ _id: recipientId });
        if (!recipient) {
            return res.status(404).json({ message: 'El destinatario ya no existe.' });
        }

        const followsRecipient = await Follow.exists({ user: req.user.id, followed: recipientId });
        if (!followsRecipient) {
            return res.status(403).json({ message: 'Solo puedes escribir a personas que sigues.' });
        }

        const message = await Message.create({
            sender: req.user.id,
            recipient: recipientId,
            text
        });
        await message.populate('sender', 'name nick image');
        return res.status(201).json(message);
    } catch (error) {
        return res.status(500).json({ message: 'No se pudo enviar el mensaje.' });
    }
};

module.exports = { getInbox, getFollowedUsers, sendMessage };