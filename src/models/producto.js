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
      actualizado_en = NOW()
     WHERE id = $9
     RETURNING *`,
    [nombre, descripcion, stock_actual, precio_compra, precio_compra_mayor,
     precio_venta, precio_venta_mayor, proveedor, id]
  );
  return result.rows[0];
}

async function reponerStock(id, cantidad) {
  const result = await pool.query(
    `UPDATE productos
     SET stock_actual = stock_actual + $1, actualizado_en = NOW()
     WHERE id = $2
     RETURNING *`,
    [cantidad, id]
  );
  return result.rows[0];
}

async function remove(id) {
  // Borrado real: pedido_items.producto_id queda en NULL para pedidos
  // viejos gracias al ON DELETE SET NULL, pero conservan producto_nombre
  // y precio_unitario, así que la boleta histórica no se rompe.
  const result = await pool.query(
    'DELETE FROM productos WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0];
}

function estaDisponible(producto) {
  return producto.stock_actual > 0;
}

module.exports = { getAll, getById, create, update, reponerStock, remove, estaDisponible };
