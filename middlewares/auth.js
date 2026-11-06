const jwt = require('jwt-simple');
const moment = require('moment');

const libjwt = require('../services/jwtService');
const { secret } = libjwt;

exports.checkAuth = (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(403).send({ 
            message: 'La petición no tiene la cabecera de autorización' 
        });
    }

    const token = req.headers.authorization.replace(/['"]+/g, '');
    try {
        const payload = jwt.decode(token, secret);
        if (payload.exp <= moment().unix()) {
            return res.status(401).send({ 
                message: 'El token ha expirado' 
            });
        }
        req.user = payload;
    } catch (err) {
        return res.status(404).send({ 
            message: 'El token no es válido' 
        });
    }
    
    next();
};