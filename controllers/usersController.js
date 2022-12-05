import User from '../models/User.js';
import Note from '../models/Note.js';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcrypt';

//@desc Get all users
//@route GET /users
//@access Private
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find().select('-password').lean()
    if(!users?.length){
        return res.status(400).json({message:'No user was found'})
    }
    res.json(users)
})

//@desc Create a new user
//@route POST /users
//@access Private
const createNewUser = asyncHandler(async (req, res) => {
    const {username, password, roles} = req.body

    //Confirm the data
    if(!username || !password || !Array.isArray(roles) || !roles.length){
        return res.status(400).json({message:'All fields are required.'})
    }

    //Verifying duplicates
    const duplicate = await User.findOne({username}).lean().exec()
    
    if(duplicate){
        return res.status(409).json({message: 'User already exists.'})
    }
    
    //Hash the password
    const hashPassword = await bcrypt.hash(password, 10) //10 Salt rounds

    //Assign values to each field of the new user
    const userObject = {username, "password": hashPassword, roles}

    //Create new user
    const user = await User.create(userObject)

    //Validate request for user creation
    if(user){
        res.status(201).json({message:`The user ${username} has been created`})    
    } else {
        res.status(400).json({message:'There was an error, contact the system admin'})
    }
})

//@desc Update a current user
//@route PATCH /users
//@access Private
const updateUser = asyncHandler(async (req, res) => {
    const {id, username, roles, active, password} = req.body
    
    //Confirm the date
    if(!id || !username || !Array.isArray(roles) || !roles.length || typeof active !== 'boolean'){
        return res.status(400).json({message: 'All fields are required'})
    }

    const user = await User.findById(id).exec()

    if(!user){
        return res.status(400).json({message: 'This user could not be found.'})
    }

    //Check for duplicates
    const duplicates = await User.findOne({username}).lean().exec()

    //Allow updates to the original user
    if(duplicates && duplicates?._id.toString() !== id){
        return res.status(409).json({message:'Duplicate username.'})
    }

    //Pointing to the model props
    user.username = username
    user.roles = roles
    user.active = active

    if(password){
        //Hashing password
        user.password = await bcrypt.hashSync(password, 10)
    }

    const updatedUser = await user.save()

    res.json({message: `${updatedUser.username} has been updated.`})
})

//@desc Delete a current user
//@route DELETE /users
//@access Private
const deleteUser = asyncHandler(async (req, res) => {
    const {id} = req.body

    if(!id){
        return res.status(400).json({message: 'User ID required'})
    }

    //Prevent deletion if user has pending notes
    const note = await Note.findOne({user: id}).lean().exec()

    if(note){
        return res.status(404).json({message:'User has pending notes to finish.'})
    }

    const user = await User.findById(id).exec()

    if(!user){
        return res.status(400).json({message: 'User could not be found.'})
    }

    const deletedUser = await user.deleteOne()

    const reply = `User ${deletedUser.username} with ID ${deletedUser._id} deleted.`

    res.json(reply)
})

export {getAllUsers, createNewUser, updateUser, deleteUser}
