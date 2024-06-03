const jwt = require('jsonwebtoken');
const User = require('../models/User');
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
    let feedback = createFeedback(404, `${username} could not be created.`);

    if (typeof(username) !== 'undefined' && typeof(password) !== 'undefined') {
        try {
            const result = await User.create({ username, password });
            if (result) {
                const { _id } = result;
                feedback = createFeedback(200, `${username} was created!`, true, { _id });
            }
        } catch(error) {
            feedback = createFeedback(409, `${username} could not be created!`, false, error);
        }
    }
    console.log('Payload:', feedback.payload); // Logging the payload to the console
    res.status(feedback.statuscode).json(feedback);
}


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
const loginuser = async (req, res)=>{
    const {username, password} = req.body;
    let feedback=accessDenied();
    const user = await User.login(username,password);
   
    if(user){
        const {_id} = user;
        //expiration: one hour
        const accessToken = generateAccessToken(_id)
        const refreshToken = await generateRefreshToken(_id);

        if(refreshToken){
            feedback=createFeedback(200, `${username} was authenticated`, true, {accessToken, refreshToken});
        } else {
            feedback=internalServerError();
        }
    }
    res.status(feedback.statuscode).json(feedback);
}

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
const createPlagg = async (req,res)=>{
    const {productName, description, user}=req.body;
    let feedback= createFeedback(404, 'Faulty inputdata');

    if(typeof(productName)!=='undefined'&&typeof(description)!=='undefined'&& typeof(user)!=='undefined'){
        const plagg ={productName, description};
        user.plaggs.push(plagg);
        try {
            const updatedUser = await user.save();
            feedback=createFeedback(200, 'Plagg was inserted to the database',true, updatedUser.plaggs);
        } catch (err) {
            console.log(err)
            feedback = createFeedback(500, 'Internal server error');
        }
    }
    sendresponse(res,feedback);
}

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
