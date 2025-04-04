const express = require("express")
const router = express.Router()
const {loginUser, registerUser, currentUser, refresh,logout} = require('../controller/userController')
const validateToken = require("../middleware/validateTokenHandler")

router.post("/login",loginUser)

// Add verifier-specific login route - uses the same controller but will be validated for verifier role
router.post("/verifier/login",loginUser)

router.post("/register", registerUser)

router.get("/refresh", refresh)

router.post("/logout", logout)

router.get("/current", validateToken, currentUser)

module.exports = router