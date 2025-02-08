const mongoose = require('mongoose')

const optionSchema =new mongoose.Schema({
    option:{type:String,default:null},
    image_url:{type:String,default:null},
    position:{type:Number,default:null}
},{_id:true})

const pollSchema = mongoose.Schema({
    creator:{
      type:mongoose.Schema.Types.ObjectId,
      ref:'user',
      required:true
    },
    ip:{
        type:String,
        required:true,
    },
    title:{
        type:String,
        required:true,
        unique:true
    },
    description:{
        type:String
    },
    poll_type:{
        type:String,
        enum:['ranking','multiple_choice'],
        required:true
    },
    options:[optionSchema],
    settings:{
         require_account:{
            type:Boolean,
            default:false
        },
         one_vote_per_ip:{
            type:Boolean
            ,default:false
        },
        
    },
    allow_multiple_votes:{
        type:Boolean,
        default:false
    },
    openDate:{
      type:Date,
      required:true
    },
    closeDate:{
        type:Date,
        required:true
    },
    useCaptcha:{
        type:Boolean,
        default:false
    },
    requireParcipantName:{
        type:Boolean,
        default:false
    },
    isClosed:{
        type:Boolean,
        default:false
    }
},{timestamps:true})

pollSchema.post('findOneAndDelete',async function(poll){
    const vote = mongoose.model('vote')

    const results = mongoose.model('results')

    if(poll){
        await vote.deleteMany({poll_id:poll._id})
        await results.deleteMany({poll_id:poll._id})
    }
})

module.exports = mongoose.model('poll',pollSchema)