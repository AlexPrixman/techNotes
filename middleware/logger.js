import { format } from "date-fns";
import { v4 } from "uuid";
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import {dirname, join} from 'path';
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));


const logEvents = async (message, logFileName) => {
    const dateTime = `${format(new Date(), 'yyyyMMdd\tHH:mm:ss')}`;
    const logItem = `${dateTime}\t${v4()}\t${message}\n`;
    try {
        if(!fs.existsSync(join(__dirname, '..', 'logs'))){
            await fsPromises.mkdir(join(__dirname, '..', 'logs'));
        }
        await fsPromises.appendFile(join(__dirname, '..', 'logs', logFileName), logItem)
    } catch (error) {
        console.log(error)
    }
}

const logger = (req, res, next) => {
    logEvents(`${req.method}\t${req.url}\t${req.headers.origin}`, 'reqLog.log')
    console.log(`${req.method} ${req.path}`)
    next()
}

export {logEvents, logger}

