const asyncHandler = require('express-async-handler')
const User = require('../model/userModel')
const ActivationCode = require('../model/activationCodeModel')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
require('dotenv').config({ path: __dirname + '../../.env' });

const registerUser = asyncHandler(async (req, res) => {
    try {
        console.log('Registration request received:', req.body);
        const {username, email, password, role, activationCode} = req.body
        
    if(!username ||!email || !password || !role){
            console.log('Missing required fields');
            return res.status(400).json({
                success: false,
                message: "All required fields must be completed"
            });
        }
        
        // Check if activation code is required for admins and verifiers
        if (role === 'admin' || role === 'verifier') {
            if (!activationCode) {
                console.log('Missing activation code for', role);
                return res.status(403).json({
                    success: false,
                    message: `Activation code is required for ${role} registration`
                });
            }
            
            // Special case for demo/test activation codes
            if (role === 'verifier' && activationCode === 'SUPERCERT-VERIFIER-2025') {
                console.log('Using demo verifier code');
                // Continue with registration - special demo code
            } else {
                // Verify the activation code exists and is not used
                console.log('Verifying activation code:', activationCode);
                const codeRecord = await ActivationCode.findOne({ code: activationCode });
                
                if (!codeRecord) {
                    console.log('Invalid activation code:', activationCode);
                    return res.status(403).json({
                        success: false,
                        message: "Invalid activation code"
                    });
                }
                
                if (codeRecord.isUsed) {
                    console.log('Activation code already used:', activationCode);
                    return res.status(403).json({
                        success: false,
                        message: "This activation code has already been used"
                    });
                }
                
                // Check if the code type matches the requested role
                if (codeRecord.type !== 'general' && codeRecord.type !== role) {
                    console.log('Role mismatch for activation code:', codeRecord.type, role);
                    return res.status(403).json({
                        success: false,
                        message: `This activation code is not valid for ${role} registration`
                    });
                }
            }
    }
    
    const emailAvailable = await User.findOne({email})
    if(emailAvailable){
            console.log('Email already registered:', email);
            return res.status(400).json({
                success: false,
                message: "User already registered"
            });
    }
    
    const hashPassword = await bcrypt.hash(password, 10)
    
        // Determine institution based on activation code
        let institutionData = {};
        if (role === 'admin' && activationCode) {
            const codeRecord = await ActivationCode.findOne({ code: activationCode });
            if (codeRecord && codeRecord.institution) {
                institutionData = codeRecord.institution;
            }
        }
        
        // Create the user
        console.log('Creating user with role:', role);
    const user = await User.create({
        username,
        email,
        password: hashPassword,
        role,
            institution: institutionData,
            activationCode: activationCode || '',
            isActive: true // Set active by default
    })
    
    if(user){
            // If this is a registration with an activation code, mark the code as used
            if ((role === 'admin' || role === 'verifier') && 
                activationCode && 
                activationCode !== 'SUPERCERT-VERIFIER-2025') {
                const codeRecord = await ActivationCode.findOne({ code: activationCode });
                if (codeRecord) {
                    codeRecord.isUsed = true;
                    codeRecord.usedBy = user._id;
                    await codeRecord.save();
                }
            }
            
            console.log('User created successfully:', user.username);
            return res.status(201).json({
                success: true,
                user: {
            _id: user.id, 
            email: user.email,
            role: user.role,
                    username: user.username,
                    institution: user.institution?.name || ''
                }
            });
        } else {
            console.log('User creation failed');
            return res.status(400).json({
                success: false,
                message: "User data invalid"
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || "An error occurred during registration"
        });
    }
})

const loginUser = asyncHandler(async (req,res) => {
    try {
        console.log('Login attempt:', req.body.email);
        const {email, password} = req.body;
        
        if(!email || !password) {
            console.log('Missing required fields');
            return res.status(400).json({
                success: false,
                message: "All fields are mandatory"
            });
        }

        // Find the user by email
        const user = await User.findOne({email});
        
        if(!user) {
            console.log('User not found:', email);
            return res.status(401).json({
                success: false,
                message: "User not found with this email"
            });
        }

        // Check if the account is active
        if (!user.isActive) {
            console.log('Account not active:', email);
            return res.status(403).json({
                success: false,
                message: "Your account is not active. Please contact administrator."
            });
        }

        // Check the password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            console.log('Invalid password for:', email);
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Check the path to ensure users use the correct login page
        const path = req.path || '';
        
        if(path.includes('verifier') && user.role !== 'verifier') {
            console.log('Non-verifier attempting to log in through verifier route:', email);
            return res.status(403).json({
                success: false,
                message: "Please use the appropriate login page for your account type."
            });
        }
        
        console.log('Login successful for:', email, 'Role:', user.role);
       
        // Generate tokens
        const accessToken = jwt.sign(
            {
                "username": user.username,
                "id": user.id,
                "role": user.role
        }, 
        process.env.ACCESS_TOKEN_SECRET, 
            { expiresIn:"15m" }
        );
        
        const refreshToken = jwt.sign(
            {
                "username": user.username,
                "role": user.role
            },
            process.env.REFRESH_TOKEN_SECRET,
            {expiresIn: "1d"}
        );

        // Create cookie
        res.cookie('jwt', refreshToken, {
            httpOnly: true,
            secure: true, // https
            sameSite: 'None',
            maxAge: 7 * 24 * 60 * 60 * 1000 // expiry for cookie
        });

        // Return user info and token
        return res.status(200).json({
            success: true,
            accessToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                institution: user.institution?.name || ''
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: "An error occurred during login"
        });
    }
});

//@desc refresh
//@route GET /user/refresh
//@access public
const refresh = asyncHandler(async(req, res)=> {
    const cookies = req.cookies

    if (!cookies?.jwt) return res.status(401).json({ message: 'Unauthorized' })

    const refreshToken = cookies.jwt

    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        asyncHandler(async (err, decoded) => {
            if (err) return res.status(403).json({ message: 'Forbidden' })
            const foundUser = await User.findOne({ username: decoded.username })

            if (!foundUser) return res.status(401).json({ message: 'Unauthorized' })
            
            // Check if user is active
            if (!foundUser.isActive) {
                return res.status(401).json({ message: 'Account is inactive. Please contact administrator.' })
            }

            const accessToken = jwt.sign(
                {
                    "user": {
                        "username": foundUser.username,
                        "email": foundUser.email,
                        "id": foundUser.id,
                        "role": foundUser.role,
                        "institution": foundUser.institution
                    }
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '15m' }
            )

            res.json({ 
                accessToken,
                user: {
                    id: foundUser.id,
                    username: foundUser.username,
                    email: foundUser.email,
                    role: foundUser.role,
                    institution: foundUser.institution?.name || ''
                }
            })
        })
    )
})


//@desc Logout
//@route POST  /user/logout
//@access public
const logout = asyncHandler(async(req, res)=>{
    const cookies = req.cookies
    if (!cookies?.jwt) return res.sendStatus(204) //No content
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true })
    res.json({ message: 'Cookie cleared' })
})

//@desc Cuurent User Info
//@route user/current
//@access private
const currentUser = asyncHandler(async (req, res) => {
    res.json(req.user)
})

module.exports= {loginUser, registerUser, currentUser, logout, refresh}