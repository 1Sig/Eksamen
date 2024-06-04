// Geir Hilmersen
// 10 May 2024 Geir Hilmersen

const jwt=require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

const {
    createFeedback,
    accessDenied,
    resourceNotFound
}=require('../handlers/feedbackHandler');

const {
    setTokenBan,
    isTokenBanned
} = require('../handlers/redishandler');

function sendresponse(response, feedback) {
    response.status(feedback.statuscode).json(feedback);
}

const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    console.log('Authorization token:', token);

    if (!token) {
        const feedback = createFeedback(401, 'Access Denied! - Authentication failed!');
        console.log('No token provided');
        return res.status(feedback.statuscode).json(feedback);
    }

    jwt.verify(token, process.env.JWTSECRET, (err, user) => {
        if (err) {
            const feedback = createFeedback(401, 'Access Denied! - Authentication failed!');
            console.log('Invalid token:', err);
            return res.status(feedback.statuscode).json(feedback);
        }
        req.user = user;
        console.log('Authenticated user:', user);
        next();
    });
};

const authenticateRefreshToken = (req,res,next) => {
    let refreshToken = req.headers.authorization?.split(' ')[1];
    let feedback=accessDenied();
    if(typeof(refreshToken) !== 'undefined' && typeof(refreshToken)==='string'){
        feedback = createFeedback(409, 'Token not valid');
        jwt.verify(refreshToken, process.env.JWTSECRET, async(err, decodedtoken)=>{
            if(!err){
                const {cryptotoken,_id}=decodedtoken;
                try {
                    refreshToken = await RefreshToken.findOne({cryptotoken})
                    const user = await User.findOne({_id});
                    if(refreshToken&&user) {
                        req.body.user=user;
                        next();
                    } else {
                        sendresponse(res,feedback);
                    }
                } catch(err){
                    sendresponse(res,feedback);
                }
            } else {
                sendresponse(res,feedback);
            }
        });
    } else {
        sendresponse(res,feedback);
    }
}

//Removes refreshtokens and bans accesstoken regardless of eachother.
//Any token found is removed. A valid accesstoken without a refreshtoken
//will be banned. A refreshtoken will be removed from the DB even if no
//valid accesstoken is found in case of tampering. Zero thrust security!
const invalidateTokens = async (req, res, next) => {
    try {
        let feedback = resourceNotFound();
        const refreshToken = req.headers.authorization?.split(' ')[1];
        const { accessToken } = req.body;
        if (typeof refreshToken !== 'undefined' && typeof refreshToken === 'string') {
            const { _id, cryptotoken } = await jwt.verify(refreshToken, process.env.JWTSECRET);
            req.body.user = await User.findOne({ _id });
            // Fjern refreshtoken fra db for å hindre at accesstokens oppdateres
            const result = await RefreshToken.findOneAndDelete({ cryptotoken });
            if (!result) {
                console.warn('Tried deleting a refreshtoken, but token was not found in the database!');
            }
        } else {
            feedback = createFeedback(404, ['invalid access token']);
            sendresponse(res, feedback);
            return; // Returnerer for å unngå å sende flere svar
        }

        if (typeof accessToken !== 'undefined' && typeof accessToken === 'string') {
            const { cryptotoken, exp } = await jwt.verify(accessToken, process.env.JWTSECRET);
            console.log(cryptotoken);
            const bantime = exp - Math.ceil((Date.now() / 1000));
            // Ban accesstoken i redis for gjenværende varighet av token
            setTokenBan(cryptotoken, accessToken, bantime);
        } else {
            if (feedback.payload) {
                feedback = createFeedback(404, feedback.payload.push('invalid refresh token'));
            } else {
                feedback = createFeedback(404, 'invalid refresh token');
            }
            sendresponse(res, feedback);
            return; // Returnerer for å unngå å sende flere svar
        }
        next();
    } catch (err) {
        console.error('\nAn error occurred while removing a token\n' +
            '-----------------------------------------------' +
            '\n' + err);
        sendresponse(res, feedback);
    }
}


module.exports={
    authenticate,
    authenticateRefreshToken,
    invalidateTokens
}