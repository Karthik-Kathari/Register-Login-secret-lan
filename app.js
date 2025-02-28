require('dotenv').config(); // Load environment variables from the .env file
const express = require('express');
const mongoose = require("mongoose");
const app = express();
const session = require('express-session'); // Import session module for user login tracking

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Use sessions to track login state
// app.use(session({
//   secret: 'mysecret', // Change this to a secret string
//   resave: false,
//   saveUninitialized: true
// }));
app.use(session({
  secret: process.env.SESSION_SECRET, // Use the secret from environment variable
  resave: false,
  saveUninitialized: true
}));

// Connect to MongoDB
 // MongoDB Atlas connection string
const dbURI = `mongodb+srv://karthikkathari74:${process.env.DB_PASSWORD}@register-login-secret-l.2ikl2.mongodb.net/?retryWrites=true&w=majority&appName=Register-Login-secret-lan`;

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB Atlas successfully!");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

// Define User Schema for registration and login
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

// Define Secret Schema for storing secrets, with reference to the user
const secretSchema = new mongoose.Schema({
  secret: String,  // The secret entered by the user
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Reference to User model
    required: true,
    ref: "User"
  }
});

const User = mongoose.model("User", userSchema);
const Secret = mongoose.model("Secret", secretSchema);

// Home route
app.get("/", function(req, res) {
  res.render("home");
});

// Register route
app.post("/register", async function(req, res) {
  const { username, password } = req.body;

  try {
    // Check if user with the same email already exists
    const existingUser = await User.findOne({ email: username });

    if (existingUser) {
      // If user already exists, send a message with a clickable login link
      return res.send('This email is already registered. Please <a href="/login">login</a>.');
    }

    // If no existing user, create a new user
    const newUser = new User({
      email: username,
      password: password
    });

    await newUser.save();  // Save user to the database
    res.redirect("/login");  // Redirect to login page

  } catch (err) {
    console.log(err);
    res.status(500).send("Error during registration.");
  }
});

// Login route
app.post("/login", async function(req, res) {
  const username = req.body.username;
  const password = req.body.password;

  try {
    const foundUser = await User.findOne({ email: username });

    if (foundUser) {
      if (foundUser.password === password) {
        // Store the userId in the session after successful login
        req.session.userId = foundUser._id;
        res.redirect("/submit");  // Redirect to submit secrets page
      } else {
        res.send("Incorrect password!");
      }
    } else {
      res.send("No user found with that email!");
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Error during login.");
  }
});

// Login page
app.get("/login", function(req, res) {
  res.render("login");
});

// Register page
app.get("/register", function(req, res) {
  res.render("register");
});

// Logout route
app.get("/logout", function(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect("/");  
  });
});

// Submit a Secret page (GET request)
app.get("/submit", function(req, res) {
  if (!req.session.userId) {
    return res.redirect("/login"); // Ensure user is logged in before accessing this page
  }
  res.render("submit");
});

// Submit a Secret page (POST request)
app.post("/submit", async function(req, res) {
  if (!req.session.userId) {
    return res.redirect("/login"); // Ensure user is logged in before submitting a secret
  }

  const newSecret = new Secret({
    secret: req.body.secret,
    userId: req.session.userId  // Associate secret with the logged-in user
  });

  try {
    await newSecret.save();  // Save secret to the database
    res.redirect("/secrets");  // Redirect to the page that shows only the user's secrets
  } catch (err) {
    console.log(err);
    res.status(500).send("Error saving the secret.");
  }
});

// Show all secrets for the logged-in user
app.get("/secrets", async function(req, res) {
  if (!req.session.userId) {
    return res.redirect("/login"); // Ensure user is logged in before viewing secrets
  }

  try {
    // Fetch secrets only for the logged-in user
    const secrets = await Secret.find({ userId: req.session.userId }).exec();
    res.render("secrets", { secrets: secrets });  // Pass user's secrets to the view
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching secrets.");
  }
});

// Start the server
app.listen(8000, function() {
  console.log("Server started on port 8000");
});
