const mongoose = require('mongoose');
const DBNAME="Eksamen";

const mongoConnect = URI =>{
    let state = 'unresolved'
    console.info(`Attempting to connect to mongo database @ URI: \n${URI}`)
    mongoose.connect(URI, {
        DBNAME
    })
        .then(result => {
            state = 'established!'
        })
        .catch(err=>{
            console.error('\n',err,'\n');
            state= 'unresolved!'
        })
        .finally(()=>{
            console.info(`Connection to database ${state}`)
        })
}

async function cleanUp(){
    try{
        await mongoose.disconnect();
        console.info('mongoclient disconnected!');
    } catch(err){
        console.error(
            'Error while disconnecting from redis:\n'+
            '-------------------------------------\n'+
            err,
            '-------------------------------------\n');
    }
}

module.exports={
    mongoConnect,
    cleanUp
}