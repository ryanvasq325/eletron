const { Pool } = require('pg');

const pool = new Pool({
  user: 'senac',
  host: 'localhost', 
  database: 'calango',
  password: 'senac',
  port: 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};