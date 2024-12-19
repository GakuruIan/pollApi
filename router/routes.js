const router = require('express').Router()
const Upload = require('../services/ImageUpload')
const UserController = require('../controllers/UsersController')
const passport = require('passport')
const VerifyToken = require('../middlewares/VerifyToken')
const expressRateLimiter = require('express-rate-limit')

const rateLimiter = expressRateLimiter({
    windowMs:15*60*1000,
    max:5,
    message:{message:"Too many Login attempts"}
})


// user routes
router.post('/register',UserController.Register);

router.post('/login',rateLimiter,UserController.Login)
// end of user routes

module.exports =router