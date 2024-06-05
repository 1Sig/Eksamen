const express = require('express');
const path = require('path');
const router = express.Router();
const userRouter = require('./routes/api_user_routes');
const { error } = require('console');
const { createPlagg, getNewestPlaggPerCategory, getCategoryPlaggs, addToCart, getPlaggByProductName, getAllPlaggs, updatePlagg  } = require('./controllers/usercontroller');

const configureFrontend = (app) => {
    // Set EJS as templating engine
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // Set up a static folder for CSS, JS, images, etc.
    app.use(express.static(path.join(__dirname, 'public')));
};

const configureRoutes = (app) => {
    // View routes
    app.get('/', getNewestPlaggPerCategory, (req, res) => {
        // Check if the user is logged in
        const user = req.session.user;
        res.render('index', { title: 'Hjemmeside', user: user });
    });

    app.get('/login', (req, res) => {
        // Check if the user is logged in
        const user = req.session.user;
        const errors = req.flash('error');
        res.render('login', { title: 'Log Inn', user: user, errors: errors });
    });

    app.get('/register', (req, res) => {
        // Check if the user is logged in
        const user = req.session.user;
        const errors = req.flash('error');
        res.render('register', { title: 'Registration side', user: user, errors: errors });
    });

    app.get('/dashboard', getAllPlaggs, (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/login');
        }
        if (user.role !== 'admin') {
            return res.redirect('/'); // Redirect to home page if not admin
        }
        res.render('dashboard', { title: 'Dashboard', user: user, plaggs: res.locals.plaggs });
    });

    // Routes for categories
    app.get('/t-skjorte', getCategoryPlaggs('t-skjorte'), (req, res) => {
        const user = req.session.user;
        res.render('t-skjorte', { title: 'T-skjorter', user: user, plaggs: res.locals.plaggs });
    });

    app.get('/genser', getCategoryPlaggs('genser'), (req, res) => {
        const user = req.session.user;
        res.render('genser', { title: 'Gensere', user: user, plaggs: res.locals.plaggs });
    });

    app.get('/:productName', getPlaggByProductName, (req, res) => {
        const user = req.session.user;
        if (user && user.role === 'admin') {
            res.render('edit-plagg', { title: 'Edit Plagg', user: user, plagg: res.locals.plagg });
        } else {
            res.render('/');
        }
    });

    // Route to create plagg
    app.post('/create-plagg', createPlagg);
    
    // Route to add plagg to cart
    app.post('/add-to-cart', addToCart);

    // Route to update plagg
    app.post('/update-plagg/:productName', updatePlagg);
    
};


module.exports = router;
module.exports ={ configureFrontend, configureRoutes }
 ;