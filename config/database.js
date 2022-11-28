import mongoose from 'mongoose';
import {MONGODB_URI, NODE_ENV} from '../config.js'

const connectDB = async () => {
    try {
        console.log(NODE_ENV)
        await mongoose.connect(MONGODB_URI)
    } catch (err) {
        console.log(err)
    }
}

export default connectDB