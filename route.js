const express = require("express")
const app = express()
const path = require("path")

app.set("views",path.join(__dirname,"views"))
app.set("view engine","ejs") 

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const randomWords = require('random-words');
const WordPOS = require('wordpos');
const wordpos = new WordPOS();
const shuffle = require('shuffle-array');

let word,hint,n1,jumbled

// --------------------------------------------------------------------

const mongoose = require('mongoose')

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/gamecenter');
}

main()
.then(res => console.log("connected to database successfully"))
.catch(err => console.log(err));

const userschema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
},{ timestamps: true })

const user = mongoose.model("user",userschema)

// --------------------------------------------------------------------

const cookieParser = require('cookie-parser')
app.use(cookieParser())

const jwt = require("jsonwebtoken")
const secret = "sahaj"

function setUser(user){
    return jwt.sign({
        _id:user._id,
        username:user.username
    },
    secret,
    {
      expiresIn:"1h"
    })
}

function getUser(token){
    if(!token) return null
    try{
    return jwt.verify(token,secret)
    }
    catch(err){
        return null
    }
}

function requireLogin(req, res, next) {
    const token = req.cookies.uid
    const decoded = getUser(token)
    if (!decoded) return res.redirect("/login")
    req.user = decoded
    next()
}

// --------------------------------------------------------------------

app.get("/signup",(req,res)=>{
  res.render("signup.ejs",{ username_check: false })
})

app.post("/signup",async (req,res)=>{
  const {username,password} = req.body
  const username_check = await user.findOne({username:username})
  if(username_check){
    return res.render("signup.ejs",{ username_check: true })
  }
  const newUser = new user({username : username,password : password});
  await newUser.save();
  res.redirect("/login")
})

// --------------------------------------------------------------------

app.get("/login",(req,res)=>{
  res.render("login.ejs",{User : false})
})

app.post("/login",async (req,res)=>{
  const {username,password} = req.body
  const User = await user.findOne({username,password})
  
  if(!User) return res.render("login.ejs",{User : true})

  const token = setUser(User)
  res.cookie('uid',token)
  res.redirect(`/${username}`)
})

// --------------------------------------------------------------------

app.get("/:username",requireLogin,(req,res)=>{
  if (req.params.username !== req.user.username) return res.send("Access denied");
  res.render("index.ejs",{username: req.user.username})
})

// --------------------------------------------------------------------

app.get("/:username/word",requireLogin, async (req, res) => {
  if (req.params.username !== req.user.username) return res.send("Access denied");
  n1 = req.query.n1
  word = randomWords.generate()
  const hint = await new Promise((resolve) => {
    wordpos.lookup(word, (results) => {
      if (results && results.length > 0) resolve(results[0].def)
      else resolve("No definition found");
    });
  });
  res.render("index1.ejs", { word, hint, n1,username: req.user.username});
});

app.post("/:username/word",requireLogin,(req,res)=>{
  n1 = req.body.n1;
  res.render("index1.ejs",{word,hint,n1,username: req.user.username})
})

// --------------------------------------------------------------------

app.get("/:username/number",requireLogin,(req,res)=>{
  if (req.params.username !== req.user.username) return res.send("Access denied");
  const n1 = req.query.n1;
  const n2 = req.query.n2;
  res.render("index2.ejs",{n1,n2,username: req.user.username})
})

// --------------------------------------------------------------------

app.get("/:username/jumble",requireLogin,(req,res)=>{
  if (req.params.username !== req.user.username) return res.send("Access denied");
  word = randomWords.generate()
  jumbled = shuffle(word.split('')).join('');
  n1 = req.query.n1
  res.render("index3.ejs",{word,jumbled,n1,username: req.user.username})
})

app.post("/:username/jumble",requireLogin,(req,res)=>{
  n1 = req.body.n1;
  res.render("index3.ejs",{word,jumbled,n1,username: req.user.username})
})

// --------------------------------------------------------------------

app.get("/",(req,res)=>{
    res.render("main.ejs")
})

app.listen(8080,()=>{
    console.log("connected to port 8080 successfully")
})