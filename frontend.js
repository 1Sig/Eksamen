const express = require('express');
const path = require('path');
const router = express.Router();
const userRouter = require('./routes/api_user_routes');
const { error } = require('console');

const configureFrontend = (app) => {
    // Sett EJS som templating motor
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // Sett opp en statisk mappe for CSS, JS, bilder, etc.
    app.use(express.static(path.join(__dirname, 'public')));
};

const configureRoutes = (app) => {
    // Ruter for visning
    app.get('/', (req, res) => {
       
        // Sjekk om brukeren er logget inn
        const user = req.session.user;
       
        res.render('index', { title: 'Hjemmeside', user: user  });
    });

  // Andre visningsruter
  app.get('/login', (req, res) => {
    // Sjekk om brukeren er logget inn
    const user = req.session.user;
    const errors = req.flash('error');
    res.render('login', { title: 'Log Inn', user: user, errors: errors });
});

app.get('/register', (req, res) => {
    // Sjekk om brukeren er logget inn
    const user = req.session.user;
    const errors = req.flash('error');
    res.render('register', { title: 'Registration side', user: user, errors: errors });
});

app.get('/dashboard', (req, res) => {
    const user = req.session.user;
    if (!user) {
        return res.redirect('/login');
    }

    res.render('dashboard', { title: 'Dashboard', user: user });
});

    // Rute for å opprette plagg
    app.post('/create-plagg', (req, res) => {
        const { productName, kategori, description, imageUrl } = req.body;
        const user = req.session.user;

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const newPlagg = new Plagg({
            productName,
            kategori,
            description,
            imageUrl, // Legg til bilde-URL
            creatorId: user._id
        });

        newPlagg.save()
            .then(plagg => {
                User.findByIdAndUpdate(
                    user._id,
                    { $push: { plaggs: plagg._id } },
                    { new: true }
                ).populate('plaggs').then(updatedUser => {
                    req.session.user = updatedUser; // Oppdater brukersesjonen
                    res.redirect('/dashboard');
                });
            })
            .catch(error => {
                console.error(error);
                res.status(500).json({ message: 'Internal server error' });
            });
    });
};

module.exports = router;
module.exports ={ configureFrontend, configureRoutes }
 ;