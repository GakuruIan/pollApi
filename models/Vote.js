const mongoose = require('mongoose')

const voteSchema = new mongoose.Schema({
    poll_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'poll',
        required:true
    },
    option_id:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
    },
    voter_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
        default:null
    },
    ip_address:{
        type:String,
        required:true
    },
    rank:{
        type:Number,
        default:null
    },
    voted_at:{
        type:Date,
        default:Date.now()
    }
})

voteSchema.index({poll_id:1,ip_address:1},{unique:true})


module.exports = mongoose.model('vote',voteSchema)