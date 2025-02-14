const User = require('../models/User')
const bcrypt = require('bcryptjs')
const Joi = require('joi')
const jwt = require('jsonwebtoken')
const transporter = require('../services/Mailer')

require('dotenv').config()

// register
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
        httpOnly:process.env.NODE_ENV === 'production',
        maxAge:24 *60*60*1000,
        secure:process.env.NODE_ENV === 'production',
        sameSite:'lax',
        path:'/'
    })

    res.status(200).json({message:"Login success"})
   } catch (error) {
    res.status(500).json({message:"Internal server error"})
   }
}

// Edit profile
exports.UpdateProfile=async(req,res)=>{
   const {name,email} = req.body
   const {_id} = req.user

   const validationSchema = Joi.object({
    email:Joi.string().email().required(),
    name:Joi.string().min(3).required()
   })

   const {error} = validationSchema.validate(req.body);

   if(error){
    return res.status(400).json({message:error.details[0].message})
   }

   if(!email || !name){
      return res.status(400).json({message:"missing input field"})
   }

   try {
      const user = await User.findById(_id)

      if(!user){
         return res.status(404).json({message:"user not found"})
      }

      const updatedInfo = {name,email}

      const updatedProfile = await User.findByIdAndUpdate(_id,updatedInfo,{new:true})

      res.status(200).json({message:"Account updated successfully",user:updatedProfile})
   } catch (error) {
      console.log(error)
      res.status(500).json({message:"Internal server error"})
   }
}

// forgot password
exports.ForgotPassword=async(req,res)=>{

   const {email} = req.body

   const resetSchema = Joi.object({
    email:Joi.string().email().required(),
   })

   const {error} = resetSchema.validate(req.body);
   if(error){
    return res.status(400).json({message:error.details[0].message})
   }

   try {
      if(!email){
         return res.status(400).json({message:"missing input field"})
     }

     const user = await User.findOne({email})

     if(!user){
        return res.status(404).json({message:"User not found"})
     }

     const token = jwt.sign({userID:user._id},process.env.JWT_SECRET,{expiresIn:'30m'})

   //   reset
   const resetLink= `${process.env.RESET_URL}?token=${token}`

   transporter.verify((err,success)=>{
       if(success){
            transporter.sendMail({
               from:process.env.EMAIL,
               to:user.email,
               subject:"Castly Account recovery",
               html:`<p>You requested a password reset. Click the link below to reset your password:</p>
             <a href="${resetLink}">${resetLink}</a>`
            })
       }
       else{
         return res.status(500).json({message:"Internal server error"})
       }
   })

   res.status(200).json({message:"If an account exists, a reset link has been sent to your email."})

   } catch (error) {
      console.log(error)
       res.status(500).json({message:"Internal server error"})
   }

}

// reset password
exports.ResetPassword=async(req,res)=>{
     const {token,newPassword}=req.body

      if(!token || !newPassword){
         return res.status(400).json({message:"Missing inputs"})
      }

      const passwordSchema = Joi.object({
         token:Joi.string().required(),
         newPassword:Joi.string().required(),
      }).validate(req.body)

      if(passwordSchema.error){
        return res.status(400).json({message:passwordSchema.error.details[0].message})
      }

     try {
        
       const decode = jwt.verify(token,process.env.JWT_SECRET)

       const userID = decode.userID

       const user = await User.findOne({_id:userID})

       if(!user){
          return res.status(404).json({message:"User not found"})
       }

       const salt = await bcrypt.genSalt(10)
       const hashedPassword = await bcrypt.hash(newPassword,salt)
       
       user.password = hashedPassword

       await user.save()

       res.status(200).json({message:"Password reset successfully"})

     } catch (error) {
        if(error.name === "TokenExpiredError"){
           return res.status(400).json({message:"Token expired"})
       }
        else{
          res.status(400).json({message:"Invalid token"})
        }
      }
}

// Logout 
exports.Logout=async(req,res)=>{

   try {
      // invalidate tokens

      res.clearCookie("token", { 
         httpOnly: process.env.NODE_ENV === 'production', 
         secure: process.env.NODE_ENV === 'production', 
         sameSite: "strict" 
      });
      
      res.status(200).json({message:"Logged out successfully",redirect:"/"})
   } catch (error) {
      res.status(500).json({message:"Internal server error"})
   }
}

// Delete account
exports.DeleteAccount=async(req,res)=>{
     const {userID} = req.body

     if(!userID){
         return res.status(400).json({message:"Missing inputs"})
      }

      const validationSchema = Joi.object({
        userID:Joi.string().required()
      }).validate(req.body)

      if(validationSchema.error){
        return res.status(400).json({message:validationSchema.error.details[0].message})
      }

     try {
       const user = await User.findOne({_id:userID})

       if(!user){
         return res.status(404).json({message:"user not found"})
       }

       await user.deleteOne({_id:userID})

       res.status(200).json({message:"Account deleted successfully",redirect:"/"})

     } catch (error) {
        res.status(500).json({message:"Internal server error"})
     }
}