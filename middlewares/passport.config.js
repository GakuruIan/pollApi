const CookieExtractor =(req)=>{
   let token = null
   
   if(req && req.cookies){
    token = req.cookies
   }

   return token
}

module.exports = CookieExtractor