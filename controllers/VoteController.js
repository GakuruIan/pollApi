const Vote = require('../models/Vote');
const Joi = require('joi');
const Poll = require('../models/Poll');
const jwt = require('jsonwebtoken');

exports.Vote = async (req, res) => {
    const { poll_id,selected_options,ip_address,ranks } = req.body;
     
    try {

        const voteSchema = Joi.object({
            poll_id: Joi.string().required(),
            selected_options:Joi.array().required(),
            ip_address: Joi.string().required(),
            ranks: Joi.array().default([])
        });

        const {error} = voteSchema.validate(req.body);

        if (error) {
            return res.status(400).json({message: error.details[0].message});
        }

        const decoded = jwt.verify(req.cookies.token,process.env.JWT_SECRET);

        const poll = await Poll.findOne({_id:poll_id});

        // check if poll exists
        if (!poll) {
            return res.status(404).json({message: 'Poll not found'});
        }

        // check if poll is closed
        if (poll.isClosed) {
            return res.status(400).json({message: 'Poll is closed'});
        }
        
        //check the poll settings
        if (poll.settings.require_account) {
          
           if (!decoded) {
               return res.status(401).json({message: 'You must be logged in to vote'});
           }
        }

        if (poll.settings.one_vote_per_ip) {
            const vote = await Vote.findOne({poll_id,ip_address});
            if (vote) {
                return res.status(400).json({message: 'You have already voted'});
            }
        }


        // checking type of the poll
        if (poll.poll_type === 'ranking') {
            if (!rank) {
                return res.status(400).json({message: 'Rank is required'});
            }
        }
        
        // for multiple choice 
        const newVote = new Vote({
            poll_id,
            voter_id:decoded.userID,
            ip_address,
            selected_options,
        })
       
       

      await newVote.save()


       return res.status(200).json({message:"You vote has been recorded successfully"})
        
    } catch (error) {
        console.log(error)
        return res.status(500).json({message:"Internal server error"});
    }

}