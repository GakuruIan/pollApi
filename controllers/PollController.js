const Poll = require('../models/Poll');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const ip_Address = require('ip')
require('dotenv').config();

exports.CreatePoll = async (req, res) => {
    const {pollTitle, description,pollType, options, settings, openDate, closeDate,requirePartcipantName} = req.body;
    
    try {
         const TOKEN = req.cookies.token
         let userID
         if(TOKEN){
             const decode = jwt.verify(TOKEN,process.env.JWT_SECRET)
             userID = decode.userID
         }


        const pollSchema = Joi.object({
            pollTitle: Joi.string().required(),
            description: Joi.string(),
            pollType: Joi.string().valid('ranking', 'multiple_choice', 'image_poll').required(),
            options: Joi.array().items(Joi.object({
                option: Joi.string().required(),
                image_url: Joi.string(),
                position: Joi.number()
            })).required(),
            settings: Joi.object({
                require_account: Joi.boolean().default(false),
                one_vote_per_ip: Joi.boolean().default(false),
            }),
            allow_multiple_votes: Joi.boolean().default(false),
            openDate: Joi.date().required(),
            closeDate: Joi.date().required(),
            requirePartcipantName:Joi.boolean().default(false)
        });

        const {error} = pollSchema.validate(req.body);
        if (error) {
            return res.status(400).json({message: error.details[0].message});
        }

        if(options.length < 2) {
            return res.status(400).json({message: 'You must provide at least two options'});
        }

        console.log(req.cookies)


        const newPoll = new Poll({
            creator: userID,
            title: pollTitle,
            ip:ip_Address.address(),
            description,
            poll_type: pollType,
            options,
            settings: settings,
            openDate,
            closeDate,
            requirePartcipantName
        });

        // const createdPoll = await newPoll.save();

        const createdPoll = {}

        res.status(201).json({message: 'Poll created successfully',pollID:createdPoll?._id,type:createdPoll?.poll_type});
    } catch (error) {
         
        switch (error.message) {  
            case 'invalid signature':
            case 'invalid token':
                return res.status(401).json({message: 'Authentication error'});
            default:
                console.log(error)
                return res.status(500).json({message:"Internal server error"});
        }
   
    }
}

exports.EditPoll = async (req, res) => {
    const {pollTitle, description,pollType, options,pollSettings, openDate, closeDate} = req.body;

    const pollID = req.params.id;

    try {
         const TOKEN = req.cookies.token

         const decode = jwt.verify(TOKEN,process.env.JWT_SECRET)
         const userID = decode.userID


        const pollSchema = Joi.object({
            pollTitle: Joi.string().required(),
            description: Joi.string(),
            pollType: Joi.string().valid('ranking', 'multiple_choice', 'image_poll').required(),
            options: Joi.array().items(Joi.object({
                option: Joi.string().required(),
                image_url: Joi.string(),
                position: Joi.number()
            })).required(),
            pollSettings: Joi.object({
                allow_ananymous: Joi.boolean().default(false),
                require_account: Joi.boolean().default(false),
                one_vote_per_ip: Joi.boolean().default(false),
                allow_multiple_votes: Joi.boolean().default(false)
            }),
            openDate: Joi.date().required(),
            closeDate: Joi.date().required()
        });

        const {error} = pollSchema.validate(req.body);
        if (error) {
            return res.status(400).json({message: error.details[0].message});
        }

        if(options.length < 2) {
            return res.status(400).json({message: 'You must provide at least two options'});
        }


        const newPoll = {
            creator: userID,
            title: pollTitle,
            description,
            poll_type: pollType,
            options,
            settings: pollSettings,
            openDate,
            closeDate
        };

        const poll = await Poll.findByIdAndUpdate(pollID, newPoll, {new: true});


        res.status(201).json({message: 'Poll updated successfully',poll});
    } catch (error) {

        switch (error.message) {  
            case 'invalid signature':
            case 'invalid token':
                return res.status(401).json({message: 'Authentication error'});
            default:
                console.log(error)
                return res.status(500).json({message:"Internal server error"});
        }
   
    }
}

exports.GetPoll = async (req, res) => {
    const pollID = req.params.id;

    try {
        const poll = await Poll.findById(pollID).populate('creator','name email');

        if (!poll) {
            return res.status(404).json({message: 'Poll not found'});
        }

        res.status(200).json({poll});
    } catch (error) {
        res.status(500).json({message: 'Internal server error'});
    }
}

exports.DeletePoll = async (req, res) => {
    const pollID = req.params.id;
    const {ip} = req.body;

    try {

        const query = {
            $or : [
                {ip: ip},
                {_id: pollID}
            ]
        }

        const poll = await Poll.findOneAndDelete(query);

        if (!poll) {
            return res.status(404).json({message: 'Poll not found'});
        }

        res.status(200).json({message: 'Poll deleted successfully'});
        
    } catch (error) {
        console.log(error)

        res.status(500).json({message: 'Internal server error'});
    }
}

exports.ClosePoll = async (req, res) => {
    const pollID = req.params.id;
    try {

        const poll = await Poll.findByIdAndUpdate(pollID, {isClosed:true}, {new: true});

        if (!poll) {
            return res.status(404).json({message: 'Poll not found'});
        }

        res.status(200).json({message: 'Poll closed successfully',poll});
    }
    catch (error) {
        console.log(error)

        res.status(500).json({message: 'Internal server error'});
    }
}