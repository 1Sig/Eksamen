const router = require('express').Router();
const {
    authenticate,
    authenticateRefreshToken,
    invalidateTokens,
    authorizeAdmin
} = require('../middleware/authorization');

const {
    createuser,
    loginuser,
    logoutuser,
    createtodo,
    deleteuser,
    upgradeuser,
    refreshUser
} = require('../controllers/usercontroller');

//Authentication
router.post('/create-user', createuser);
router.post('/loginuser', loginuser);
router.post('/refreshuser', authenticateRefreshToken, refreshUser);
router.post('/logout', invalidateTokens, logoutuser)


//Protected routes
router.post('/create-todo', authenticate, createtodo);
router.delete('/delete-user', authenticate, authorizeAdmin, deleteuser);
router.patch('/create-admin', authenticate, authorizeAdmin, upgradeuser);

module.exports=router;