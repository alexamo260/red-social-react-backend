const Follow = require('../models/followModel');
const User = require('../models/userModel');
const followService = require('../services/followService');


const saveFollow = async (req, res) => {
    const params = req.body;
    const identity = req.user.id;
    if (!params.followed) {
        return res.status(400).json({ message: 'El usuario a seguir es obligatorio' });
    }
    if (String(identity) === String(params.followed)) {
        return res.status(400).json({ message: 'No puedes seguirte a ti mismo' });
    }

    const targetUser = await User.findById(params.followed).select('_id').exec();
    if (!targetUser) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const existingFollow = await Follow.findOne({ user: identity, followed: params.followed }).exec();
    if (existingFollow) {
        return res.status(409).json({ message: 'Ya sigues a este usuario' });
    }

    const userToFollow = new Follow({
        user: identity,
        followed: params.followed
    });
    try {
        await userToFollow.save();
        return res.status(201).json(userToFollow);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const unfollow = async (req, res) => {
    const params = req.body;
    const identity = req.user.id;
    try {
        const userToUnfollow = await Follow.findOneAndDelete({
            user: identity,
            followed: params.followed
        });
        if (!userToUnfollow) {
            return res.status(404).json({ message: 'Follow not found' });
        }
        return res.status(200).json({ message: 'Unfollowed successfully' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const following = async (req, res) => {
    const userId = req.params.id;
    const page = parseInt(req.params.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    try {
        const followIds = await followService(userId);
        const users = await User.find({ _id: { $in: followIds.following } })
            .select('-password -role')
            .skip(skip)
            .limit(limit);
        return res.status(200).json(users);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const followers = async (req, res) => {
    const userId = req.params.id;
    const page = parseInt(req.params.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    try {
        const followIds = await followService(userId);
        const users = await User.find({ _id: { $in: followIds.followed } })
            .select('-password -role')
            .skip(skip)
            .limit(limit);
        return res.status(200).json(users);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
    
module.exports = {
    saveFollow,
    unfollow,
    following,
    followers
};