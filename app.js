const express = require('express');
const bcryptjs = require('bcryptjs');
const firebaseAdmin = require('firebase-admin');
const session = require('express-session');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fetch = require('node-fetch');
const serviceAccount = require('./key.json');

initializeApp({
  credential: cert(serviceAccount),
});

const firestore = getFirestore();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Session management
app.use(session({
  secret: 'my-secret-key',
  resave: false,
  saveUninitialized: false,
}));

// Routes
app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    await firebaseAdmin.auth().getUserByEmail(email);
    return res.status(400).send('Email already registered');
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      return res.status(400).send(error.message);
    }
  }

  try {
    const newUser = await firebaseAdmin.auth().createUser({
      email,
      password,
      displayName: username,
    });

    const hashedPassword = await bcryptjs.hash(password, 10);

    await firestore.collection('Users').doc(newUser.uid).set({
      username,
      email,
      hashedPassword
    });

    res.redirect('/login');
  } catch (error) {
    res.status(400).send(error.message);
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await firebaseAdmin.auth().getUserByEmail(email);

    const userDoc = await firestore.collection('Users').doc(user.uid).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const isPasswordValid = await bcryptjs.compare(password, userData.hashedPassword);
    if (!isPasswordValid) {
      return res.status(400).send('Invalid credentials');
    }

    req.session.user = {
      uid: user.uid,
      username: user.displayName,
      email: user.email,
    };

    res.redirect('/weather');
  } catch (error) {
    res.status(400).send(error.message);
  }
});

app.get('/weather', (req, res) => {
  res.render('weather');
});

app.post('/weather', async (req, res) => {
  const { location } = req.body;
  const weatherApiKey = '6793461102434d5f8b160545241006';

  try {
    const weatherResponse = await fetch(http://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${location});

    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text();
      throw new Error(HTTP error! Status: ${weatherResponse.status} - ${errorText});
    }

    const weatherInfo = await weatherResponse.json();

    res.render('weather', { weather: weatherInfo });
  } catch (error) {
    console.error('Error fetching weather data:', error);
    res.status(500).send('Unable to fetch weather data. Please try again later.');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Error logging out');
    }
    res.redirect('/login');
  });
});

app.listen(PORT, () => {
  console.log(Server is running on port ${PORT});
});