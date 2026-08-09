const pool = require('../db');

async function getAll() {
    const result = await pool.query(
        'SELECT * FROM productos ORDER BY nombre ASC'
    );
    return result.rows;
}

async function getById(id) {
    const result = await pool.query(
        'SELECT * FROM productos WHERE id = $1',
        [id]
    );
    return result.rows[0];
}

async function create(producto) {
    const {
        nombre,
        descripcion,
        stock_actual,
        precio_compra,
        precio_compra_mayor,
        precio_venta,
        precio_venta_mayor,
        proveedor,
    } = producto;

    const result = await pool.query(
        `INSERT INTO productos
      (nombre, descripcion, stock_actual, precio_compra, precio_compra_mayor,
       precio_venta, precio_venta_mayor, proveedor)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
        [nombre, descripcion, stock_actual, precio_compra, precio_compra_mayor,
            precio_venta, precio_venta_mayor, proveedor]
    );
    return result.rows[0];
}

async function update(id, producto) {
    const {
        nombre,
        descripcion,
        stock_actual,
        precio_compra,
        precio_compra_mayor,
        precio_venta,
        precio_venta_mayor,
        proveedor,
        estado,
    } = producto;

    const result = await pool.query(
        `UPDATE productos SET
      nombre = $1,
      descripcion = $2,
      stock_actual = $3,
      precio_compra = $4,
      precio_compra_mayor = $5,
      precio_venta = $6,
      precio_venta_mayor = $7,
      proveedor = $8,
      estado = $9,
      actualizado_en = NOW()
     WHERE id = $10
     RETURNING *`,
        [nombre, descripcion, stock_actual, precio_compra, precio_compra_mayor,
            precio_venta, precio_venta_mayor, proveedor, estado, id]
    );
    return result.rows[0];
}

async function remove(id) {
    // Baja lógica: no borramos el producto (podría tener pedidos asociados),
    // solo lo marcamos como inactivo.
    const result = await pool.query(
        `UPDATE productos SET estado = 'inactivo', actualizado_en = NOW()
     WHERE id = $1
     RETURNING *`,
        [id]
    );
    return result.rows[0];
}

module.exports = { getAll, getById, create, update, remove };