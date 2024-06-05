const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const {User, Plagg, Cart} = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const crypto = require('crypto');

const {
    accessDenied,
    notAuthorized,
    createFeedback,
    resourceNotFound,
    internalServerError
} = require('../handlers/feedbackHandler');
const { response } = require('express');

const createuser = async (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
        try {
            // Check if user already exists
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ message: 'Username already exists', success: false });
            }

            // Create a new user
            const user = new User({ username, password });
            await user.save();

            // Create an associated cart
            const cart = new Cart({ owner: user._id, cartPlagg: [] });
            await cart.save();

            // Set user in session
            req.session.user = {
                id: user._id,
                username: user.username,
                role: user.role
            };

            res.redirect('/');
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: 'An error occurred during user creation',
                success: false
            });
        }
    } else {
        res.status(400).json({
            message: 'Invalid input data',
            success: false
        });
    }
};



const upgradeuser = async (req, res)=>{
    const {username, isDowngrade} = req.body;
    let feedback = createFeedback(404, 'Faulty inputdata!');
    try{
        let targetUser = await User.findOne({username});
        const updateduser = await targetUser.changeUserRole(isDowngrade);

        if(updateduser){
            feedback=createFeedback(200, 'Success', true, {username:updateduser.username,role:updateduser.role});
        } else {
            feedback=internalServerError();
        }
    } catch(error) {
        feedback=resourceNotFound();
    }
    res.status(feedback.statuscode).json(feedback);
}

const deleteuser = async (req, res)=>{
    const {username} = req.body;
    let feedback = createFeedback(404, `User ${username} could not be deleted`);
    if(typeof(username)!=='undefined'){
        try {

            const result = await User.findOneAndDelete({username});
            if(result){
                feedback=createFeedback(200, `${username} was deleted!`, true, result);
            }
        }catch(error){
            console.log('error!');
        }
    }
    res.status(feedback.statuscode).json(feedback);
}

const logoutuser = (req, res) => {
    let feedback = createFeedback(404, 'User not found!');
    const { user } = req.session;

    if (user) {
        req.session.destroy((err) => {
            if (err) {
                feedback = createFeedback(500, 'Failed to logout user!');
                console.error('Error while logging out user:', err);
            } else {
                feedback = createFeedback(200, `${user.username} has been logged out!`, true);
                console.log('User logged out:', user.username);
            }
            res.status(feedback.statuscode).json(feedback);
        });
    } else {
        res.status(feedback.statuscode).json(feedback);
    }
};

const loginuser = async (req, res) => {
    const { username, password } = req.body;

    if (typeof(username) !== 'undefined' && typeof(password) !== 'undefined') {
        try {
            const user = await User.login(username, password);

            if (user) {
                const accessToken = generateAccessToken(user._id);
                const refreshToken = await generateRefreshToken(user._id);

                // Store user data in session
                req.session.user = { username: user.username, role: user.role };
                // Redirect to index page
                res.redirect('/');
            } else {
                res.status(401).json({ message: 'Invalid username or password', success: false });
            }
        } catch (error) {
            res.status(500).json({ message: 'An error occurred during login', success: false });
        }
    } else {
        res.status(400).json({ message: 'Invalid input data', success: false });
    }
};

/**
 * This controller checks for req.body.refreshToken, looks up the token in the corresponding
 * database and checks if it is valid. If it is valid, it authenticates the user and sends
 * a new accesstoken.
 */
const refreshUser = async (req, res)=>{
    const {_id} = req.body.user;
    const accessToken=generateAccessToken(_id);
    const feedback= createFeedback(200,'Token refreshed!', true, {accessToken})

    res.status(feedback.statuscode).json(feedback);
}
/**
 * The function will look for title and description in the body of the request object.
 * If either of those variables is not present. Then a json object relaying the failure
 * will be rendered.
 */
const createPlagg = async (req, res) => {
    const { productName, kategori, description, imageUrl } = req.body;
    const user = req.session.user;

    console.log('Received request to create plagg:', productName, kategori, description, imageUrl);
    console.log('User session:', req.session);

    if (!user) {
        console.log('Unauthorized: No user found in session');
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const newPlagg = new Plagg({
            plaggId: new mongoose.Types.ObjectId(), // Generate a new ObjectId for plaggId
            productName,
            kategori,
            description,
            imageUrl,
            creatorId: new mongoose.Types.ObjectId(user._id) // Ensure correct ObjectId creation
        });

        await newPlagg.save();
        console.log('New plagg saved:', newPlagg);

        res.redirect('/dashboard'); // Redirect to dashboard after creation
    } catch (error) {
        console.error('Error while creating plagg:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


const removePlagg = async (req, res)=>{
    let feedback=resourceNotFound();
    const {productName, user} = req.body;
    if(typeof productName === 'string' && typeof user === 'object') {
        user.plaggs = user.plaggs.filter(item => {
            return item.productName !== productName;
    });

        try {
            const {plaggs} = await user.save();
            feedback = createFeedback(200, 'Requested Plagg is gone!', true, plaggs);
        } catch(error){

        }
    }

    sendresponse(res, feedback);
}

const getNewestPlaggPerCategory = async (req, res) => {
    try {
        const newestPlaggs = await Plagg.aggregate([
            // Sort by kategori and timestamps in descending order
            { $sort: { kategori: 1, timestamps: -1 } },
            {
                $group: {
                    _id: "$kategori",
                    latestPlagg: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$latestPlagg" } }
        ]);

        res.render('index', {
            title: 'Hjemmeside',
            user: req.session.user,
            newestPlaggs
        });
    } catch (error) {
        console.error('Error while fetching newest plaggs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const addToCart = async (req, res) => {
    const user = req.session.user;
    if (!user) {
        console.log('Unauthorized: No user found in session');
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { plaggId } = req.body;

    try {
        const plagg = await Plagg.findById(plaggId);
        if (!plagg) {
            return res.status(404).json({ message: 'Plagg not found' });
        }

        const cart = await Cart.findOneAndUpdate(
            { owner: user.id },
            { $push: { cartPlagg: plagg._id } },
            { new: true }
        ).populate('cartPlagg');

        req.session.user.cart = cart;

        res.redirect('/');
    } catch (error) {
        console.error('Error while adding plagg to cart:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

function generateAccessToken(_id){
    const cryptotoken = crypto.randomBytes(32).toString('hex');
    return jwt.sign({_id, cryptotoken}, process.env.JWTSECRET, {expiresIn:"1h"});
}

//generates a refresh token that is valid for one week
async function generateRefreshToken(_id){
    const expireDays=7; //jwt token measure expire in days
    const expireTime= new Date(); //Mongodb handles expiry better if it is a date
    expireTime.setDate(expireTime.getDate()+expireDays);

    const cryptotoken = crypto.randomBytes(32).toString('hex');

    const refreshToken = jwt.sign({_id, cryptotoken}, process.env.JWTSECRET, {expiresIn:`${expireDays}d`});

    const result = await RefreshToken.create({jwt:refreshToken, cryptotoken, expireTime});
    return refreshToken;
}

function sendresponse(response,feedback){
    response.status(feedback.statuscode).json(feedback);
}

const getCategoryPlaggs = (category) => {
    return async (req, res, next) => {
        try {
            const plaggs = await Plagg.find({ kategori: category }).exec();
            res.locals.plaggs = plaggs;
            next();
        } catch (err) {
            next(err);
        }
    };
};

const getPlaggByProductName = async (req, res, next) => {
    try {
        const productName = req.params.productName;
        const plagg = await Plagg.findOne({ productName }).exec();
        if (!plagg) {
            return res.status(404).send('Plagg not found');
        }
        res.locals.plagg = plagg;
        next();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

// Function to get all plaggs
const getAllPlaggs = async (req, res, next) => {
    try {
        const plaggs = await Plagg.find().exec();
        res.locals.plaggs = plaggs;
        next();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

const updatePlagg = async (req, res) => {
    try {
        const productName = req.params.productName;
        const { productName: newProductName, kategori, description, imageUrl } = req.body;
        await Plagg.updateOne({ productName }, { productName: newProductName, kategori, description, imageUrl }).exec();
        res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

module.exports={
    createPlagg,
    removePlagg,
    getNewestPlaggPerCategory,
    getCategoryPlaggs,
    getPlaggByProductName, 
    getAllPlaggs,
    updatePlagg,
    addToCart,
    createuser,
    loginuser,
    logoutuser,
    deleteuser,
    upgradeuser,
    refreshUser
}
