require('dotenv').config();
const appEventHandler = require('./handlers/appEventHandler');
const express = require('express');
const session = require('express-session');
const app = express();
const flash = require('connect-flash');
const default_routes=require('./routes/default_routes');
const user_api=require('./routes/api_user_routes');
const {startScheduler}=require('./services/scheduler');
const { configureFrontend, configureRoutes } = require('./frontend');

// const {enableRedis}=require('./handlers/redishandler')

const {
    mongoConnect
} = require('./handlers/dbhandler');

const PORT = process.env.PORT || 3000;
const DBURI = process.env.DBURI || '';

// Konfigurer sessionsstøtte
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'hemmelig_nokkel_her', // Secret key for signing session
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Use true for HTTPS
}));

app.use(flash());

// Configure frontend and routes
configureFrontend(app);
configureRoutes(app);


app.use(default_routes);
app.use(user_api);

app.listen(PORT, ()=>{
    console.log(`Revving engine...`);
    console.log(`Server started at port ${PORT}\n------------------------------------`);
    mongoConnect(DBURI);   
    // enableRedis(); 
    
    startScheduler();
});