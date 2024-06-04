const jwt = require('jsonwebtoken');
const {User, Plagg} = require('../models/User');
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
    console.log('Username:', username);
    console.log('Password:', password);

    if (typeof(username) !== 'undefined' && typeof(password) !== 'undefined') {
        try {
            // Create user without cart
            let user = new User({ username, password });

            // Save the user to get the _id
            await user.save();

            // Add cart to the user with owner set to user's _id
            user.cart.push({ owner: user._id, cartPlagg: [] });

            // Save the user again to update with cart
            await user.save();

            // Generate tokens
            const accessToken = generateAccessToken(user._id);
            const refreshToken = await generateRefreshToken(user._id);

            // Store user data in session
            req.session.user = { username: user.username };

            // Redirect to index page
            res.redirect('/');
        } catch (error) {
            res.status(500).json({ message: 'An error occurred during user creation', success: false });
        }
    } else {
        res.status(400).json({ message: 'Invalid input data', success: false });
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

const logoutuser = async (req, res)=> {
    let feedback = createFeedback(404, 'user not found!');
    const {user} = req.body;
    if(user){
        feedback = createFeedback(200, `${user.username} has been logged out!`, true);
    }
    res.status(feedback.statuscode).json(feedback);
}

const loginuser = async (req, res) => {
    const { username, password } = req.body;

    if (typeof(username) !== 'undefined' && typeof(password) !== 'undefined') {
        try {
            const user = await User.login(username, password);

            if (user) {
                const accessToken = generateAccessToken(user._id);
                const refreshToken = await generateRefreshToken(user._id);

                // Store user data in session
                req.session.user = { username: user.username };

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
    const user = req.session.user; // Få brukeren fra sesjonen

    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const newPlagg = new Plagg({
            productName,
            kategori,
            description,
            imageUrl, // Legg til bilde-URL
            creatorId: user._id
        });

        await newPlagg.save();

        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            { $push: { plaggs: newPlagg._id } },
            { new: true }
        ).populate('plaggs');

        req.session.user = updatedUser; // Oppdater brukersesjonen

        res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    createPlagg
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

module.exports={
    createPlagg,
    removePlagg,
    createuser,
    loginuser,
    logoutuser,
    deleteuser,
    upgradeuser,
    refreshUser
}
