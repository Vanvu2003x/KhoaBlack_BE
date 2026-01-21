const redis = require('redis');

const client = redis.createClient({
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

client.connect()
    .then(() => console.log("Redis connected!"))
    .catch(err => console.error("Redis connection error:", err));

module.exports = client;
