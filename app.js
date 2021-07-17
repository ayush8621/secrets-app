//////////////////////////////////using passport and google auth for authentication //////////////////////////////////////////////////////////////
//jshint esversion:6
const dotenv=require("dotenv");
dotenv.config();
const express = require("express");
const bodyparser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportlocalmongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyparser.urlencoded({
  extended: true
}));

app.use(session({             //setting up session
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/secretsDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.set("useCreateIndex", true); //to avoid deprecation warning

const userschema = new mongoose.Schema({
  email: "String",
  password: "String",
  googleId:"String",
  secret:Array
});

userschema.plugin(passportlocalmongoose); //to save user data
userschema.plugin(findOrCreate);    //findOrCreate user data

const User = mongoose.model("user", userschema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


passport.use(new GoogleStrategy({                                           // using
    clientID: process.env.CLIENT_ID,                                       // google
    clientSecret: process.env.CLIENT_SECRET,                              //oath
    callbackURL:"http://localhost:3000/auth/google/secrets",             //2.0
    userprofileUrl: "https://www.googleapis.com/oauth2/v3/userinfo"     // to avoid google+ deprecation warning
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile.name);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get("/", function(req, res) {
  res.render("home");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/submit",function(req,res){
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.get("/secrets", function(req, res) {
    User.find({"secret": {$ne:null}},function(err,founduser){
      console.log(founduser);
      if(err){
        console.log(err);
      }
      else{
        if(founduser){
          console.log(founduser);
          res.render("secrets", {userwithsecret: founduser});
        }
      }
    });
});

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
  });

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/submit",function(req,res){
const submittedsecret = req.body.secret;
  User.findById(req.user.id,function(err,founduser){
    if(err){
      console.log(err);
    }
    else{
      if(founduser){
      founduser.secret.push(submittedsecret);
      founduser.save(function(){
        res.redirect("/secrets");
      });
      }
    }
  });
});

app.post("/register", function(req, res) {
  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register")
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});



app.post("/login", function(req, res) {
  User.findOne({username: req.body.username}, function(err, founduser) {
      if (founduser) {
        const user = new User({
          username: req.body.username,
          password: req.body.password
        });
      passport.authenticate("local", function(err,user) {
        if (err) {
          console.log(err);
        } else {
          if (user) {
            req.login((user), function(err) {
              res.redirect("/secrets");
            });
          } else {
            res.redirect("/login");
          }
        }
      })(req, res);
    } else {
      res.redirect("/login");
    }
  });
});



app.listen(3000, function() {
  console.log("Server is running on port 3000");
});





///////////////////////////////////////////////////////////////using mongoose-encrypt,md5,bcrypt ///////////////////////////////////

// const bcrypt = require('bcrypt');
// const saltRounds = 10;
// // var md5 = require("md5");
// const express = require("express");
// const bodyparser = require("body-parser");
// const ejs = require("ejs");
// const mongoose =require("mongoose");
// // const encrypt = require("mongoose-encryption");
//
// const app =express();
//  app.use(express.static("public"));
//  app.set('view engine','ejs');
//  app.use(bodyparser.urlencoded({
//    extended:true
//  }));
//
// mongoose.connect('mongodb://localhost:27017/secretsDB', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// });
//
//
// const userschema = new mongoose.Schema({
//   email: "String",
//   password: "String"
// });
//
// // const secret = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBBBBBBBBBHHHH.";
// // userschema.plugin(encrypt,{secret:secret,encryptedFields:["password"]});
//
// const User = mongoose.model("user", userschema);
//
// app.get("/",function(req,res){
//   res.render("home");
// });
//
// app.get("/login",function(req,res){
//   res.render("login");
// });
//
// app.get("/register",function(req,res){
//   res.render("register");
// });
//
// app.post("/register",function(req,res){
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     const user = new User({
//       email:req.body.username,
//       password:hash
//     });
//     user.save(function(err){
//       if(!err){
//         res.render("secrets");
//       }
//       else{
//       res.send(err);
//     }
//     });
// });
//
// });
//
// app.post("/login",function(req,res){
//   const username = req.body.username;
//   // const password = md5(req.body.password);
//   User.findOne({email:username},function(err,founduser){
//     if(!err){
//       bcrypt.compare(req.body.password,founduser.password, function(err, result) {
//         if(result === true){
//           res.render("secrets");
//         }
//         else{
//           res.send("User Not Found");
//         }
//       }
//       else{
//         res.send(err);
//       }
//     });
// });
//
// });
//  app.listen(3000,function(){
//    console.log("Server is running on port 3000");
//  });






////////////////////////////////////////////explanation to post route///////////////////////////////////////

// app.post("/login", function(req, res){
//   //check the DB to see if the username that was used to login exists in the DB
//   User.findOne({username: req.body.username}, function(err, foundUser){
//     //if username is found in the database, create an object called "user" that will store the username and password
//     //that was used to login
//     if(foundUser){
//     const user = new User({
//       username: req.body.username,
//       password: req.body.password
//     });
//       //use the "user" object that was just created to check against the username and password in the database
//       //in this case below, "user" will either return a "false" boolean value if it doesn't match, or it will
//       //return the user found in the database
//       passport.authenticate("local", function(err, user){
//         if(err){
//           console.log(err);
//         } else {
//           //this is the "user" returned from the passport.authenticate callback, which will be either
//           //a false boolean value if no it didn't match the username and password or
//           //a the user that was found, which would make it a truthy statement
//           if(user){
//             //if true, then log the user in, else redirect to login page
//             req.login(user, function(err){
//             res.redirect("/secrets");
//             });
//           } else {
//             res.redirect("/login");
//           }
//         }
//       })(req, res);
//     //if no username is found at all, redirect to login page.
//     } else {
//       //user does not exists
//       res.redirect("/login")
//     }
//   });
// });
