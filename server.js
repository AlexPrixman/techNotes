import express from 'express';
import dotenv from 'dotenv';
import {dirname, join} from 'path';
import { MONGODB_URI, PORT } from "./config.js";
import { fileURLToPath } from 'url';
import router from './routes/routes.js';
import {logger} from './middleware/logger.js';
import errorHandler from './middleware/errorHandler.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import corsOptions from './config/corsOptions.js';

const app = express();

//Initializations
dotenv.config();

//Global variables
const __dirname = dirname(fileURLToPath(import.meta.url));

//Routes
app.use('/', router);

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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;