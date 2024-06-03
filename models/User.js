const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const PASSWORD_LENGTH = 8;

// Cart Schema
const cartSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cartPlagg: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Plagg' }],
    cartId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, default: () => new mongoose.Types.ObjectId() }
});

// Plagg Schema
const plaggSchema = new mongoose.Schema({
    plaggId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    productName: { type: String, required: true },
    kategori: { type: String, required: true },
    description: { type: String, required: true },
    timestamps: { type: Date, default: Date.now },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

// User Schema
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        lowercase: true,
        unique: true
    },
    role: {
        type: String,
        required: true,
        enum: ['user', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: true,
        minlength: [PASSWORD_LENGTH, `Passwords must have at least this many letters: ${PASSWORD_LENGTH}`]
    },
    cart: [cartSchema]
});

userSchema.pre('save', hashPassword);

userSchema.statics.login = login;
userSchema.methods.changeUserRole = changeUserRole;

async function login(username, password){
    let loginresult = null;
    const user = await this.findOne({username});
    if(user){
        const auth = await bcrypt.compare(password, user.password);
        if(auth) loginresult=user;
    }
    return loginresult;
}


async function hashPassword(next){
    if(this.isModified('password')){
        const salt = await bcrypt.genSalt();
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
}

/**
 * This function downgrades users by default. This is to ensure that any upgrade is
 * an explicit choice. 
 * @param {Boolean} isDowngrade if false, will upgrade 
 */
async function changeUserRole(isDowngrade = true) {
    let updatedUser = null;
    if (isDowngrade) {
        this.role = 'user';
    } else {
        this.role = 'admin';
    }
    try {
        updatedUser = await this.save();
    } catch (error) {
        throw error;
    }
    return updatedUser;
}

const User = mongoose.model('User', userSchema);
const Plagg = mongoose.model('Plagg', plaggSchema);

module.exports = { User, Plagg };