// //9. May 2024 Geir Hilmersen
// const redis = require('redis')
// const client = redis.createClient();

// client.on('connect', ()=>{
//     console.info('Connection to redis successfully established')
// })
// client.on('error', err=> {
//     console.error('Error! Could not connect to redis!\n-------------------------------------------\n',err,'\n');
// })

// async function enableRedis(connection){
//     try {
//         await client.connect();
//     } catch (err){
//         console.error('Error!\n-------------------------------------------\n',err,'\n')
//     }
// }

// async function setTokenBan(tokenID, token, expireIn){
//     try {
//         const result = await client.setEx(tokenID, expireIn, token);
//     } catch(err){
//         console.log(err)
//     }
// }

// // Assumes that the token has a false identity
// // returns true if token is not found in the DB
// async function isTokenBanned(tokenID){
//     let result = true;
//     try {
//         const token = await client.get(tokenID);
//         if(!token){
//             result=false;
//         }
//     } catch(error){
//         console.log('error', error)
//     }
//     return result;
// }

// async function cleanUp(){
//     try {
//         await client.disconnect();
//         console.info('redisclient disconnected!')
//     } catch (err){
//         console.error(
//             'Error while disconnecting from redis:\n'+
//             '-------------------------------------\n'+
//             err,
//             '-------------------------------------\n');
//     }
// }
// module.exports={
//     enableRedis,
//     isTokenBanned,
//     setTokenBan,
//     cleanUp
// };