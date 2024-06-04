const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const PASSWORD_LENGTH = 8;

// Define Plagg Schema
const plaggSchema = new mongoose.Schema({
    plaggId: { type: mongoose.Types.ObjectId, required: true, unique: true },
    productName: { type: String, required: true },
    kategori: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    timestamps: { type: Date, default: Date.now },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

// Define Cart Schema
const cartSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cartPlagg: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Plagg' }]
});

// Define User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, lowercase: true, unique: true },
    role: { type: String, required: true, enum: ['user', 'admin'], default: 'user' },
    password: { type: String, required: true, minlength: [6, 'Passwords must have at least 6 characters'] }
});


userSchema.pre('save', hashPassword);

userSchema.statics.login = login;
userSchema.methods.changeUserRole = changeUserRole;

async function login(username, password) {
    let loginresult = null;
    const user = await this.findOne({ username });
    if (user) {
        const auth = await bcrypt.compare(password, user.password);
        if (auth) loginresult = user;
    }
    return loginresult;
}

async function hashPassword(next) {
    if (this.isModified('password')) {
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
const Cart = mongoose.model('Cart', cartSchema);

module.exports = { User, Plagg, Cart };