const jwt = require('jwt-simple');
const moment = require('moment');

const secret = 'SECRET_KEY_RED_SOCIAL';

const createToken = (user) => {
    const payload = {
        id: user._id,
        name: user.name,
        nick: user.nick,
        email: user.email,
        role: user.role,
        image: user.image,
        iat: moment().unix(),
        exp: moment().add(30, 'days').unix()
    };
    return jwt.encode(payload, secret);
};

module.exports = {
    secret,
    createToken
};