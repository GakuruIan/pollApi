const JWTStrategy = require('passport-jwt').Strategy
const users = require('../models/User');
const ExtractJwt = require('passport-jwt').ExtractJwt;
require('dotenv').config();

const options = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET, 
  };

module.exports = function(passport){
   passport.use(new JWTStrategy(options,async(jwtPayload,done)=>{
     try {
        const user =await users.findById(jwtPayload.userId);

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