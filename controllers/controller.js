import User from '../Models/EmailUser.js';
import passport from 'passport';
import sgMail from '@sendgrid/mail';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import ejs from 'ejs';

import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const login = (req, res) => {
  res.render('login', {message: req.query.action});
}

export const verifyLogin = 
  passport.authenticate('local', { successRedirect: '/?action=logIn',
                                   failureRedirect: '/',
                                   failureFlash: true });

export const register = (req, res) => {
  res.render('register');
}

export const verifyRegister = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = new User({ username, password });
    await user.save();
    
    // Log the user in after successful registration
    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('Error during login after registration:', loginErr);
        req.flash('error', 'An unexpected error occurred. Please try again.');
        return res.redirect('/register');
      }
      // Redirect the user or send a success message
      req.flash('success', `${user.username} registration successful.`);
      return res.redirect('/?action=logIn'); // Adjust the redirect as needed
    });
  } catch (error) {
    // Check if the error code and error message indicate a duplicate key error for the username
    if (error.code === 11000 && error.message.includes('username_1 dup key')) {
      // Customize the error message
      const customMessage = `${req.body.username} is already registered.`;
      // Use flash messages to send the custom error message back to the client, if you're using flash messages
      req.flash('error', customMessage);
      // Redirect back to the registration page or wherever appropriate
      return res.redirect('/register');
    }
    // Handle other types of errors or pass them to an error handler
    console.error('Error during registration:', error);
    req.flash('error', 'An unexpected error occurred. Please try again.');
    res.redirect('/register');
  }
};

export const logout = (req, res) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    // Redirect or respond after successful logout
    res.redirect('/');
  });
}  

//EMAIL LOGIC
export const askForPassword = (req, res) => {
  res.render('requestPassword');
}

//export const sendPassword = async (req, res) => {
//  const { username } = req.body;
//  try {
//    const user = await User.findOne({ username });
//    if (!user) {
//      // Handle case when user is not found
//      return res.status(404).send('User not found.');
//    }
//
//    // Generate a token
//    const token = crypto.randomBytes(20).toString('hex');
//    // Set token and expiration
//    user.resetPasswordToken = token;
//    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
//
//    await user.save();
//    
//    // Send email with reset link
//    const resetUrl = `http://${req.headers.host}/reset/${token}`;
//    const msg = {
//      to: user.username,
//      from: 'dcalmeyer@westridge.org', // Use your verified sender
//      subject: 'Password Reset',
//      text: `You are receiving this because you (or someone else) requested a password reset for your account.\n\n` +
//      `Please click on the following link, or paste it into your browser to complete the process within one hour of receiving it:\n\n` +
//      `${resetUrl}\n\n` +
//      `If you did not request this, please ignore this email and your password will remain unchanged.`,
//      // HTML version of the message
//      html: `<!DOCTYPE html>
//        <html>
//        <head>
//        <title>Password Reset</title>
//        </head>
//        <body>
//        <p>You are receiving this because you (or someone else) requested a password reset for your account.</p>
//        <p>Please click on the following link, or paste it into your browser to complete the process within one hour of receiving it:</p>
//        <a href="${resetUrl}">${resetUrl}</a>
//        <p>If you did not request this, please <strong>ignore</strong> this email and your password will remain unchanged.</p>
//        </body>
//        </html>`
//    };
//
//    await sgMail.send(msg);
//    console.log(`${user.username} sent email`);
//    
//    res.redirect('/?action=emailSent');
//  } catch (error) {
//    console.error('Password reset request error:', error);
//    res.status(500).send('Error processing password reset request.');
//  }
//};

export const sendPassword = async (req, res) => {
  const { username } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/forgotPassword');
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    
    const resetUrl = `http://${req.headers.host}/reset/${token}`;
    const templatePath = path.join(__dirname, '..', 'views', 'emails', 'passwordResetEmail.ejs');

    // Convert ejs.renderFile to use promises
    const html = await ejs.renderFile(templatePath, { resetUrl: resetUrl });

    const msg = {
      to: user.username,
      from: 'dcalmeyer@westridge.org',
      subject: 'Password Reset',
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste it into your browser to complete the process:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`,
      html: html
    };

    await sgMail.send(msg);
    console.log(`${user.username} sent email`);
    req.flash('success', 'Password reset email sent.');
    res.redirect('/');
  } catch (error) {
    console.error('Password reset request error:', error);
    req.flash('error', 'Error processing password reset request.');
    res.redirect('/forgotPassword');
  }
};


export const resetPassword  = async (req, res) => {
  const user = await User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } });
  if (!user) {
    // Handle error - token invalid or expired
    req.flash('error', 'Password reset token is invalid or has expired.');
    return res.redirect(`/`);
  }
  // Render reset password form
  res.render('resetPassword', { token: req.params.token });
};

export const updatePassword  = async (req, res) => {
  const { password, confirmPassword } = req.body;
  const { token } = req.params;

  // Validate the passwords match
  if (password !== confirmPassword) {
    return res.render('resetPassword', { 
      token,
      errorMessage: 'Passwords do not match.' 
    });
  }

  try {
    // Ensure the token is still valid and find the associated user
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    console.log("Found " + user.username);
    
    if (!user) {
      return res.status(400).render('resetPassword', { 
        token,
        errorMessage: 'Password reset token is invalid or has expired.' 
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    req.flash('success', 'Password updated!');
    res.redirect('/');

  } catch (error) {
    console.error('Password reset request error:', error);
    req.flash('error', 'Error processing password reset request.');
    res.redirect(`/reset/${token}`);
  }
};








