const express = require("express");
const router = require("./router/routes");
const moongose = require("mongoose");
const passport = require('passport')
const cors = require('cors')
const cookieParser = require('cookie-parser')

require('./passport/passport')(passport)

require("dotenv").config();

const PORT = process.env.PORT || 3000;

moongose
  .connect(process.env.LOCAL_URI)
  .then(() => console.log("database connected successfully"))
  .catch((err) => console.log(err));

const app = express();

app.use(cookieParser())

//body parser
app.use(express.json());
app.use(express.urlencoded({extended:true}));

// passport
app.use(passport.initialize())

// cors
app.use(cors({
  origin:'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization','Access-Control-Allow-Headers'],
  credentials:true
}));

app.use(router);

app.listen(PORT, () => {
  console.log(`server started on http://localhost:${PORT}`);
});