const connectDB = require('./database/connection');
const express = require('express');
const cors = require('cors');

console.log('API NODE RED SOCAL INICIADA');

const app = express();
const port = 3900;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const userRoutes = require('./routes/userRoute');
const publicationRoutes = require('./routes/publicationRoute');
const followRoutes = require('./routes/followRoute');
const messageRoutes = require('./routes/messageRoute');

app.use('/api', userRoutes);
app.use('/api', publicationRoutes);
app.use('/api', followRoutes);
app.use('/api', messageRoutes);

app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
});

connectDB();