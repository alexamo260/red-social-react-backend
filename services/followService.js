const Follow = require('../models/followModel');

const followUserIds = async (userId) => {
    const following = await Follow.find({ user: userId }).select('followed -_id');
    const followed = await Follow.find({ followed: userId }).select('user -_id');
    return {
        following: following.map(f => f.followed),
        followed: followed.map(f => f.user)
    };
};

const followThisUser = async (userId, followedId) => {
    const following = await Follow.findOne({ user: userId, followed: followedId }).select('followed -_id').exec();

    const follower = await Follow.findOne({ user: followedId, followed: userId }).select('user -_id').exec();
    return {
        following: following ? [following.followed] : [],
        follower: follower ? [follower.user] : []
    };
};

const countFollowing = async (userId) => {
    return await Follow.countDocuments({ user: userId });
};

const countFollowers = async (userId) => {
    return await Follow.countDocuments({ followed: userId });
};

module.exports = { followUserIds, followThisUser, countFollowing, countFollowers }; 