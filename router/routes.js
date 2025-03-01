const router = require('express').Router()
const Upload = require('../services/ImageUpload')
const UserController = require('../controllers/UsersController')
const ResultsController = require('../controllers/ResultsController')
const PollController = require('../controllers/PollController')
const VoteController = require('../controllers/VoteController')
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

// poll routes
// passport.authenticate('jwt',{session:false})
// add this middleware to any route you want to protect

// create poll
router.post('/create-poll',PollController.CreatePoll);
// edit poll
router.put('/edit-poll/:id',PollController.EditPoll);
// get all poll
router.get('/poll/:id',PollController.GetPoll);

// results route
router.get('/results/:id',ResultsController.GetPollResults)

// close poll
router.put('/close-poll/:id',PollController.ClosePoll);
// get users polls
router.get('/my-polls',PollController.GetUsersPolls)
// delete poll
router.delete('/delete-poll/:id',PollController.DeletePoll);

// vote
router.post('/vote',VoteController.Vote);



module.exports =router