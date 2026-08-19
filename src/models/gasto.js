const pool = require('../db');

async function getAll() {
    const result = await pool.query('SELECT * FROM gastos ORDER BY fecha DESC');
    return result.rows;
}

async function crear({ descripcion, monto, fecha }) {
    const result = await pool.query(
        `INSERT INTO gastos (descripcion, monto, fecha)
     VALUES ($1, $2, COALESCE($3, NOW()))
     RETURNING *`,
        [descripcion, monto, fecha || null]
    );
    return result.rows[0];
}

async function eliminar(id) {
    await pool.query('DELETE FROM gastos WHERE id = $1', [id]);
}

async function totalEnRango(desde, hasta) {
    const result = await pool.query(
        `SELECT COALESCE(SUM(monto), 0)::NUMERIC AS total
     FROM gastos
     WHERE fecha >= $1::date AND fecha < ($2::date + INTERVAL '1 day')`,
        [desde, hasta]
    );
    return Number(result.rows[0].total);
}

module.exports = { getAll, crear, eliminar, totalEnRango };