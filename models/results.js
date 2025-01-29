const mongoose = require('mongoose')

const resultSchema = new mongoose.Schema({
    poll_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'poll',
        required:true
    },
    results:[
        {
            option_id:{
                type:mongoose.Schema.Types.ObjectId,
                required:true
            },
            votes:{
                type:Number,
                default:0
            }
        }
    ],
    ranking_results:[
        {
            option_id:{
                type:mongoose.Schema.Types.ObjectId,
                required:true
            },
            rank_score:{ //for a weighted score of an option
                type:Number,
                default:0
            },
            ranking_position:{
                type:Map,
                of:Number,
                default:{}
            }
        }
    ],
},{timestamp:true})

module.exports = mongoose.model('results',resultSchema)
