import dotenv from 'dotenv';
import express from 'express';
import {dirname, join} from 'path';
import { MONGODB_URI, PORT } from "./config.js";
import { fileURLToPath } from 'url';
import router from './routes/routes.js';
import users from './routes/userRoutes.js';
import {logger, logEvents} from './middleware/logger.js';
import errorHandler from './middleware/errorHandler.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import corsOptions from './config/corsOptions.js';
import connectDB from './config/database.js';
import mongoose from 'mongoose';


//Initializations
dotenv.config();
const app = express();
connectDB();
const __dirname = dirname(fileURLToPath(import.meta.url));

//Global variables

//Routes
app.use('/', router);
app.use('/users', users);

//Middleware
app.use(express.json());
app.use(logger);
app.use(cookieParser());
app.use(cors(corsOptions));

//Static files
app.use('/', express.static(join(__dirname, 'public')));


//Error status codes
app.all('*', (req, res) => {
    res.status(404)
    if(req.accepts('html')){
        res.sendFile(join(__dirname, 'views', '404.html'))
    } else if (req.accepts('json')){
        res.json({message: "404 Not Found"})
    } else {
        res.type('txt').send({message: "404 Not Found"});
    }
});

app.use(errorHandler);

mongoose.connection.once('open', () => {
    console.log('Connected to Mongo DB.');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).on('error', (err) => {
    console.log(err);
    logEvents(`${err.name}: ${err.message}\t${req.method}\t${req.url}
    \t${req.headers.origin}`, 'errLogs.log');
})