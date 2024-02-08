import express from 'express';
import * as controller from '../controllers/controller.js';

const router = express.Router();

// Define routes
router.get('/', controller.login);
router.post('/login', controller.verifyLogin);
router.get('/register', controller.register);
router.post('/register', controller.verifyRegister);
router.get('/logout', controller.logout);
          
router.get('/forgotPassword', controller.askForPassword);
router.post('/requestPasswordReset', controller.sendPassword);

router.get('/reset/:token', controller.resetPassword);
router.post('/reset/:token', controller.updatePassword);

export default router;
