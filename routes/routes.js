import express from 'express';
import {dirname, join} from 'path';
import { fileURLToPath } from 'url';
const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

router.get('^/$|/index(.html)?', (req, res) =>{
    res.sendFile(join(__dirname, '..', 'views','index.html'));
});

export default router;