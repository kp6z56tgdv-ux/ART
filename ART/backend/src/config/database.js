const mysql = require('mysql2/promise');
const path = require('path');
const config = require('../../config.json');

const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  waitForConnections: true,
  connectionLimit: config.database.connectionLimit,
  queueLimit: 0
});

async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password
  });

  try {
    await connection.query('CREATE DATABASE IF NOT EXISTS art_db');
    console.log('Base de datos art_db verificada');
  } catch (err) {
    console.error('Error al crear la base de datos:', err);
  }

  await connection.end();
  return pool;
}

module.exports = { initializeDatabase, pool };
