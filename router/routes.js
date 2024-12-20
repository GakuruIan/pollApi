const router = require('express').Router()
const Upload = require('../services/ImageUpload')
const UserController = require('../controllers/UsersController')
const passport = require('passport')
const expressRateLimiter = require('express-rate-limit')


const rateLimiter = expressRateLimiter({
    windowMs:15*60*1000,
    max:5,
    message:{message:"Too many Login attempts"}
})


// user routes
router.post('/register',UserController.Register);

router.put('/update/:id/profile',passport.authenticate('jwt',{session:false}),UserController.UpdateProfile)

router.post('/login',rateLimiter,UserController.Login)

router.post('/logout',passport.authenticate('jwt',{session:false}),UserController.Logout)

router.post('/forgot-password',rateLimiter,UserController.ForgotPassword)

router.put('/reset-password',UserController.ResetPassword);
// end of user routes

module.exports =router