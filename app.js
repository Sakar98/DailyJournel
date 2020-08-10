//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const _ = require("lodash");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const app = express();

var currUser = "";
var options = {
  year: "numeric",
  month: "long",
  day: "numeric",
};
var today = new Date();

today = today.toLocaleDateString("en-US", options);

app.use(
  session({
    secret: "My secret",
    resave: false,
    saveUninitialized: false,
    // cookie: { secure: true }
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(
  "mongodb+srv://admin_sakar:Database@1001@cluster1.5znki.mongodb.net/blogDB?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

mongoose.set("useCreateIndex", true);

const postSchema = new mongoose.Schema({
  Title: { type: String, required: true },
  Post: { type: String, required: true },
  username: String,
  date: String,
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleID: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});
passport.use(
  new GoogleStrategy(
    {
      clientID:
        "296956664283-c7utg6vi713d0a6on6ilqltofj37c9cj.apps.googleusercontent.com",
      clientSecret: "u_HnWHT31AGyFAjPnDh6ewbc",
      callbackURL: "http://localhost:3000/auth/google/dailyjournel",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      // npm i mongoose-findorcreate to make this work
      // console.log(profile);
      User.findOrCreate(
        { googleID: profile.id, username: profile.displayName },
        function (err, user) {
          currUser = profile.id;
          return cb(err, user);
        }
      );
    }
  )
);

const Post = mongoose.model("Post", postSchema);

const homeStartingTitle = [
  "1. Keep your thoughts organized.",
  "2. Set & achieve your goals.",
  "3. Record ideas on-the-go.",
];

const homeStartingDesc = [
  "Diaries help us to organize our thoughts and make them apprehensible. You can record daily events, thoughts and feelings about certain experiences or opinions. Journey allows you to tag and archive your diary entries.",
  "A journal is a good place to write your goals, ambitions, aspirations and new year resolutions. By keeping them in a diary, you can monitor your progress and feel motivated to continue to focus on your next milestone!",
  "The benefits of keeping a journal is that you can record all of your ideas in one place anytime and at anywhere. Whenever an idea comes to your mind, you can write it down in your journal. You can then revisit these ideas later on to look for new links, form conclusions or even get a fresh idea!",
];

const homeStartingContent =
  "  There are many benefits of keeping a journal.Here are the top 3 reasons why you should be starting a journal today : ";

const aboutContent =
  "I am a full stack developer currently looking for work . I would like to help you to make the web a better place.  ";

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

function showPost(res) {
  Post.find({ username: currUser }, function (err, posts) {
    if (err || !posts.length) {
      res.render("error", { content: "Sorry! You have posted nothing" });
    } else {
      res.render("posts", { posts: posts });
    }
  });
}

app.get("/", function (req, res) {
  res.render("home", {
    content: homeStartingContent,
    contentTitle: homeStartingTitle,
    contentDesc: homeStartingDesc,
  });
});

app.get("/contact", function (req, res) {
  res.render("contact");
});
app.get("/about", function (req, res) {
  res.render("about", { content: aboutContent });
});
app.get("/compose", function (req, res) {
  res.render("compose");
});
app.get("/signin", function (req, res) {
  res.render("signin");
});
app.get("/login", function (req, res) {
  res.render("login");
});
app.get("/register", function (req, res) {
  res.render("register");
});
app.get("/posts", function (req, res) {
  if (req.isAuthenticated()) {
    showPost(res);
  } else {
    res.redirect("/signin");
  }
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/dailyjournel",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/posts");
  }
);

app.post("/register", function (req, res) {
  User.register({ username: req.body.username }, req.body.password, function (
    err,
    user
  ) {
    if (err) {
      res.redirect("/login");
    } else {
      currUser = req.body.username;
      passport.authenticate("local")(req, res, function () {
        res.redirect("/posts");
      });
    }
  });
});
app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  currUser = req.body.username;
  //From passport
  req.login(user, function (err) {
    if (err) {
      console.log(err);
      res.redirect("/login");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/posts");
      });
    }
  });
});
app.get("/posts/:postID", function (req, res) {
  const currID = req.params.postID;
  Post.findOne({ _id: currID }, function (err, doc) {
    if (doc) {
      res.render("post", { currPost: doc });
    } else {
      res.render("error", { content: "Post doesn't exist " });
    }
  });
});
app.get("/delete/:postID", function (req, res) {
  const currID = req.params.postID;
  Post.deleteOne({ _id: currID }, function (err) {
    showPost(res);
  });
});

app.post("/compose", function (req, res) {
  const post = new Post({
    Title: req.body.newPostTitle,
    Post: req.body.newPostContent,
    date: today,
    username: currUser,
  });

  post.save((err) => {
    if (!err) {
      showPost(res);
    } else {
      res.render("error", { content: "Enter Title/Post" });
    }
  });
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function () {
  console.log(`Server started on port ${port}`);
});
