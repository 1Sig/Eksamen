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

    // Ruter for statiske filer
    app.get('/login', (req, res) => {
        // Sjekk om brukeren er logget inn
        const user = req.session.user;
        
        let errors = [];
        if (error) {
            errors.push('Feilmelding her...');
        }

        res.render('login', { title: 'Log Inn' , user: user, errors: errors  });
    });

    // Ruter for statiske filer
    app.get('/register', (req, res) => {
        // Sjekk om brukeren er logget inn
        const user = req.session.user;
        
        let errors = [];
        if (error) {
            errors.push('Feilmelding her...');
        }

        res.render('register', { title: 'Registration side' , user: user, errors: errors });
    });

    // Ruter for statiske filer
    app.get('/dashbord', (req, res) => {
        // Sjekk om brukeren er logget inn
        const user = req.session.user;

        res.render('dashbord', { title: 'Dashbord' , user: user  });
    });

    // Andre statiske filruter
};

module.exports = router;
module.exports ={ configureFrontend, configureRoutes }
 ;