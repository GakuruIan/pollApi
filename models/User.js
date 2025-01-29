const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
   name:{
    type:String,
    required:true
   },
   email:{
    type:String,
    required:true,
    unique:true
   },
   password:{
    type:String,
    required:true,
   },
   rememberMe:{
      type:Boolean,
      default:false
   },
   loginAttempts:{
      type:Number,
      default:0
   },
   lockUntil:{
      type:Date,
      default:null
   }
},{timestamps:true});

userSchema.methods.isLocked = function(){
   return this.lockUntil && this.lockUntil > Date.now();
}

module.exports = mongoose.model('user',userSchema)
