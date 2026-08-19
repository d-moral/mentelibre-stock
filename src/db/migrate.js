const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./index');

async function runMigrations() {
    const sqlPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        await pool.query(sql);
        console.log('Esquema actualizado correctamente');
    } catch (error) {
        console.error('Error actualizando el esquema:', error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

runMigrations();