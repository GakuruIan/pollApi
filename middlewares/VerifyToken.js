const passport = require('passport')

const VerifyToken =(req,res,next)=>{
    passport.authenticate('jwt', { session: false },(err,user,info)=>{
        if(err) return next(err)

        if(!user){
            res.status(401).json({message:"Unauthorized access"})
        }
        
        req.user =user
        next()
    })(req, res, next);
}

module.exports = VerifyToken