const JWTStrategy = require('passport-jwt').Strategy
const users = require('../models/User');
require('dotenv').config();

const options = {
    jwtFromRequest: (req)=>{
       return req && req.cookies ? req.cookies.token : null
    },
    secretOrKey: process.env.JWT_SECRET, 
  };

module.exports = function(passport){
   passport.use(new JWTStrategy(options,async(jwtPayload,done)=>{
     try {
        const user =await users.findById(jwtPayload.userID);

        if(user){
            return done(null,user)
        }
        else{
            return done(null,false)
        }
     } catch (error) {
        return done(error,false)
     }
   }
   ))
}