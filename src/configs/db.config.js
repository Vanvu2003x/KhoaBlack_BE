const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',    
  host: 'localhost',      
  database: 'gamerechargedb',  
  password: '080306',
  port: 5432,                
});

module.exports = pool;
