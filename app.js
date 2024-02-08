import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import bcrypt from 'bcrypt';
import flash from 'connect-flash';

import configurePassport from './config/passport.js';

import dotenv from 'dotenv'; 
dotenv.config({ path: 'process.env' });

import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

configurePassport(passport); // Configuring passport

// Session setup
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URL })
}));

app.use(flash());

// Make flash messages available to all templates
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Define routes
import routes from './routes/routes.js'; 
app.use('/', routes);
const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
