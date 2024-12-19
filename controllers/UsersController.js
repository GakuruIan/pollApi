const User = require('../models/User')
const bcrypt = require('bcryptjs')
const Joi = require('joi')
const jwt = require('jsonwebtoken')
require('dotenv').config()

exports.Register=async(req,res)=>{
   const {name,email,password} = req.body

   

   if(!name || !email || !password){
      return res.status(400).json({message:"missing input field"})
   }

   try {
     const existingUser = await User.findOne({email})

     if(existingUser){
        return res.status(400).json({message:"Email already already exists"})
     }

     const salt = await bcrypt.genSalt(10)
     const hashedPassword = await bcrypt.hash(password,salt)


     const newUser = new User({
        name,
        email,
        password:hashedPassword
     })


     await newUser.save()

     res.status(201).json({message:"Account created successfully"})
   
   } catch (error) {
      res.status(500).json({error})
   }
}

// login 
exports.Login=async(req,res)=>{
   const MAX_ATTEMPT = 5
   const {email,password} = req.body

//    input validation
   const loginSchema = Joi.object({
    email:Joi.string().email().required(),
    password:Joi.string().min(8).required()
   })

   const {error} = loginSchema.validate(req.body);
   if(error){
    return res.status(400).json({message:error.details[0].message})
   }

   if(!email || !password){
      return res.status(400).json({message:"missing input field"})
   }

   try {
    const user = await User.findOne({email})

    // checking for user
    if(!user){
         await new Promise((resolve) => setTimeout(resolve, 1000));
        return res.status(401).json({message:"Invalid Credentials"})
    }

    // check if account is locked
    if(user.isLocked()){
        return res.status(403).json({message:"Account is Locked, Try again later"})
    }

    const ispasswordValid = await bcrypt.compare(password,user.password)

    // password validation
    if(!ispasswordValid){
         user.loginAttempts += 1;

         if(user.loginAttempts >= MAX_ATTEMPT){
            const LOCK_TIME = 30 *60 *1000
            user.lockUntil = new Date(Date.now()+LOCK_TIME);
         }

         await user.save();

         return res.status(401).json({message:"Invalid credential"})
    }
    
    user.loginAttempts = 0
    user.lockUntil = null
    await user.save()

    const accessToken = jwt.sign({userID:user._id},process.env.JWT_SECRET,{expiresIn:'1d'})

    res.cookie('token',accessToken,{
        httpOnly:false,
        maxAge:24 *60*60*1000,
        secure:process.env.NODE_ENV === 'production',
        sameSite:'Strict'
    })

    res.status(200).json({message:"Login success"})
   } catch (error) {
    res.status(500).json({message:"Internal server error"})
   }
}