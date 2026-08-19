const pool = require('../db');

async function getAllActivos() {
    const result = await pool.query(
        `SELECT pd.*, COALESCE(pd.nombre_personalizado, p.nombre) AS producto_nombre, p.seccion AS producto_seccion
     FROM productos_detalle pd
     JOIN productos p ON p.id = pd.producto_id
     WHERE pd.cantidad > 0 AND pd.estado = 'activo'
     ORDER BY pd.creado_en DESC`
    );
    return result.rows;
}

async function getByProductoId(producto_id) {
    const result = await pool.query(
        `SELECT pd.*, COALESCE(pd.nombre_personalizado, p.nombre) AS producto_nombre
         FROM productos_detalle pd
         JOIN productos p ON p.id = pd.producto_id
         WHERE pd.producto_id = $1 ORDER BY pd.creado_en DESC`,
        [producto_id]
    );
    return result.rows;
}

async function getById(id) {
    const result = await pool.query(
        `SELECT pd.*, COALESCE(pd.nombre_personalizado, p.nombre) AS producto_nombre, p.seccion AS producto_seccion
         FROM productos_detalle pd
         JOIN productos p ON p.id = pd.producto_id
         WHERE pd.id = $1`,
        [id]
    );
    return result.rows[0];
}

async function crear({ producto_id, cantidad, precio_venta, nota_dano, nombre_personalizado }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows: prodRows } = await client.query('SELECT * FROM productos WHERE id = $1', [producto_id]);
        if (prodRows.length === 0) throw new Error('El producto no existe');
        const producto = prodRows[0];

        if (producto.stock_actual < cantidad) {
            throw new Error(`Stock insuficiente para el producto: ${producto.nombre}`);
        }

        await client.query(
            'UPDATE productos SET stock_actual = stock_actual - $1, actualizado_en = NOW() WHERE id = $2',
            [cantidad, producto_id]
        );

        const { rows: loteRows } = await client.query(
            `INSERT INTO productos_detalle (producto_id, cantidad, cantidad_original, precio_venta, nota_dano, nombre_personalizado, precio_compra_unitario)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [producto_id, cantidad, cantidad, precio_venta, nota_dano || null, nombre_personalizado || null, producto.precio_compra]
        );

        await client.query('COMMIT');
        return loteRows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function actualizar(id, { cantidad, precio_venta, nota_dano, nombre_personalizado }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query('SELECT * FROM productos_detalle WHERE id = $1 FOR UPDATE', [id]);
        if (rows.length === 0) throw new Error('El lote de detalle no existe');
        const loteActual = rows[0];

        const diferencia = cantidad - loteActual.cantidad;

        if (diferencia !== 0) {
            const { rows: prodRows } = await client.query('SELECT * FROM productos WHERE id = $1', [loteActual.producto_id]);
            const producto = prodRows[0];

            if (diferencia > 0 && producto.stock_actual < diferencia) {
                throw new Error(`Stock insuficiente para el producto: ${producto.nombre}`);
            }

            await client.query(
                'UPDATE productos SET stock_actual = stock_actual - $1, actualizado_en = NOW() WHERE id = $2',
                [diferencia, loteActual.producto_id]
            );
        }

        const nuevaCantidadOriginal = Number(loteActual.cantidad_original) + diferencia;

        const { rows: actualizadoRows } = await client.query(
            `UPDATE productos_detalle SET cantidad = $1, cantidad_original = $2, precio_venta = $3, nota_dano = $4, nombre_personalizado = $5 WHERE id = $6 RETURNING *`,
            [cantidad, nuevaCantidadOriginal, precio_venta, nota_dano || null, nombre_personalizado || null, id]
        );

        await client.query('COMMIT');
        return actualizadoRows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function cancelar(id) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query('SELECT * FROM productos_detalle WHERE id = $1', [id]);
        if (rows.length === 0) throw new Error('El lote de detalle no existe');
        const lote = rows[0];

        await client.query(
            'UPDATE productos SET stock_actual = stock_actual + $1, actualizado_en = NOW() WHERE id = $2',
            [lote.cantidad, lote.producto_id]
        );

        await client.query(
            `UPDATE productos_detalle SET estado = 'cancelado' WHERE id = $1`,
            [id]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function descontarStock(id, cantidad, client = pool) {
    const result = await client.query(
        'UPDATE productos_detalle SET cantidad = cantidad - $1 WHERE id = $2 AND cantidad >= $1 RETURNING *',
        [cantidad, id]
    );
    return result.rows[0];
}

async function getTodosConHistorial() {
    const result = await pool.query(
        `SELECT pd.*, COALESCE(pd.nombre_personalizado, p.nombre) AS producto_nombre, p.seccion AS producto_seccion
     FROM productos_detalle pd
     JOIN productos p ON p.id = pd.producto_id
     ORDER BY pd.creado_en DESC`
    );
    return result.rows;
}

async function buscar(texto, limite = 5) {
    const result = await pool.query(
        `SELECT pd.id, pd.producto_id, pd.cantidad, pd.precio_venta,
                COALESCE(pd.nombre_personalizado, p.nombre) AS producto_nombre
         FROM productos_detalle pd
         JOIN productos p ON p.id = pd.producto_id
         WHERE pd.cantidad > 0 AND pd.estado = 'activo'
           AND (pd.nombre_personalizado ILIKE $1 OR p.nombre ILIKE $1 OR pd.nota_dano ILIKE $1)
         ORDER BY COALESCE(pd.nombre_personalizado, p.nombre)
         LIMIT $2`,
        [`%${texto}%`, limite]
    );
    return result.rows;
}

module.exports = { getAllActivos, getByProductoId, getById, crear, actualizar, cancelar, descontarStock, getTodosConHistorial, buscar };
