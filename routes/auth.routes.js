const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Rota para exibir a página de login
router.get('/login', authController.getLoginPage);

// Rota para processar o formulário de login
router.post('/login', authController.login);

// Rota para logout
router.get('/logout', authController.logout);

module.exports = router;