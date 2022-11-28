import User from '../models/User.js';
import Note from '../models/Note.js';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcrypt';

//@desc Get all users
//@route GET /users
//@access Private
const getAllNotes = asyncHandler(async (req, res) => {
    const notes = await Note.find().lean()
    if(!notes?.length){
        return res.status(400).json({message:'No notes found'})
    }
    res.json(notes)
})

//@desc Create a new user
//@route POST /users
//@access Private
const createNewNote = asyncHandler(async (req, res) => {
    const {user, title, text, completed, timestamp} = await req.body
    //Confirm the data
    if(!user || !title || !text || typeof completed !== 'boolean' || !timestamp){
        return res.status(400).json({message:'All fields are required.'})
    }
    //Verifying duplicates
    const duplicates = await Note.findOne({title})
    if(duplicates){
        return res.status(409).json({message: `Note with title ${title} already exists.`})
    }

    //Assign values to each field of the new Note
    const noteObject = {user, title, text, completed, timestamp}

    //Create new user
    const note = await Note.create(noteObject).exec()

    //Validate request for user creation
    if(note){
        res.status(201).json({message:`The note ${title} has been created`})    
    } else {
        res.status(400).json({message:'There was an error, contact the system admin'})
    }
})

//@desc Update a current user
//@route PATCH /users
//@access Private
const updateNote = asyncHandler(async (req, res) => {
    const {id, user, title, text, completed, timestamp} = req.body
    
    //Confirm the date
    if(!id || !user || !title || !text || typeof completed !== 'boolean' || !timestamp){
        return res.status(400).json({message: 'All fields are required'})
    }

    const note = await Note.findById(id).exec()

    if(!note){
        return res.status(400).json({message: `The note ${Note.user} could not be found.`})
    }

    //Check for duplicates
    const duplicates = await Note.findOne({title}).lean().exec()

    //Allow updates to the original user
    if(duplicates && duplicates?._id.toString() !== id){
        return res.status(409).json({message:'This title already exists.'})
    }

    //Pointing to the model props
    note.user = user
    note.title = title
    note.text = text
    note.completed = completed
    note.timestamp = timestamp

    const updatedNote = await note.save()

    res.json({message: `${updatedNote.title} has been updated.`})
})

//@desc Delete a current user
//@route DELETE /users
//@access Private
const deleteNote = asyncHandler(async (req, res) => {
    const {id} = req.body

    if(!id){
        return res.status(400).json({message: 'Note ID required'})
    }

    const note = await Note.findById(id).exec()

    if(!note){
        return res.status(400).json({message: `Note could not be found.`})
    }

    const deletedNote = await note.deleteOne()

    const reply = `User ${deletedNote.title} with ID ${deletedNote._id} deleted.`

    res.json(reply)
})

export {getAllNotes, createNewNote, updateNote, deleteNote}