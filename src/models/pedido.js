const pool = require('../db');

async function crear({ nombre_cliente, direccion, contacto, items }) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Verificar stock disponible y traer precio_venta de cada producto
        const productosInfo = [];
        for (const item of items) {
            const { rows } = await client.query(
                'SELECT id, precio_venta, stock_actual, estado FROM productos WHERE id = $1 FOR UPDATE',
                [item.producto_id]
            );
            const producto = rows[0];

            if (!producto) {
                throw new Error(`Producto ${item.producto_id} no existe`);
            }
            if (producto.estado === 'inactivo') {
                throw new Error(`Producto ${item.producto_id} no está disponible`);
            }
            if (producto.stock_actual < item.cantidad) {
                throw new Error(`Stock insuficiente para el producto ${item.producto_id}`);
            }

            productosInfo.push({ ...item, precio_unitario: producto.precio_venta });
        }

        // 2. Calcular el total
        const total = productosInfo.reduce(
            (acc, item) => acc + item.cantidad * item.precio_unitario,
            0
        );

        // 3. Crear la cabecera del pedido
        const { rows: pedidoRows } = await client.query(
            `INSERT INTO pedidos (nombre_cliente, direccion, contacto, total)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [nombre_cliente, direccion, contacto, total]
        );
        const pedido = pedidoRows[0];

        // 4. Crear cada item y descontar stock
        for (const item of productosInfo) {
            await client.query(
                `INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)`,
                [pedido.id, item.producto_id, item.cantidad, item.precio_unitario]
            );

            await client.query(
                `UPDATE productos
         SET stock_actual = stock_actual - $1,
             estado = CASE WHEN stock_actual - $1 <= 0 THEN 'sin_stock' ELSE estado END,
             actualizado_en = NOW()
         WHERE id = $2`,
                [item.cantidad, item.producto_id]
            );
        }

        await client.query('COMMIT');
        return pedido;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function listar() {
    const result = await pool.query(
        'SELECT * FROM pedidos ORDER BY fecha DESC'
    );
    return result.rows;
}

async function obtenerConItems(id) {
    const { rows: pedidoRows } = await pool.query(
        'SELECT * FROM pedidos WHERE id = $1',
        [id]
    );
    const pedido = pedidoRows[0];
    if (!pedido) return null;

    const { rows: items } = await pool.query(
        `SELECT pi.id, pi.producto_id, p.nombre AS producto_nombre,
            pi.cantidad, pi.precio_unitario
     FROM pedido_items pi
     JOIN productos p ON p.id = pi.producto_id
     WHERE pi.pedido_id = $1`,
        [id]
    );

    return { ...pedido, items };
}

async function cambiarEstado(id, nuevoEstado) {
    const result = await pool.query(
        `UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING *`,
        [nuevoEstado, id]
    );
    return result.rows[0];
}

async function cancelar(id) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { rows: pedidoRows } = await client.query(
            'SELECT * FROM pedidos WHERE id = $1 FOR UPDATE',
            [id]
        );
        const pedido = pedidoRows[0];

        if (!pedido) {
            throw new Error('Pedido no encontrado');
        }
        if (pedido.estado === 'cancelado') {
            throw new Error('El pedido ya está cancelado');
        }

        const { rows: items } = await client.query(
            'SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = $1',
            [id]
        );

        for (const item of items) {
            await client.query(
                `UPDATE productos
         SET stock_actual = stock_actual + $1,
             estado = CASE WHEN estado = 'sin_stock' THEN 'activo' ELSE estado END,
             actualizado_en = NOW()
         WHERE id = $2`,
                [item.cantidad, item.producto_id]
            );
        }

        const { rows: actualizado } = await client.query(
            `UPDATE pedidos SET estado = 'cancelado' WHERE id = $1 RETURNING *`,
            [id]
        );

        await client.query('COMMIT');
        return actualizado[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { crear, listar, obtenerConItems, cambiarEstado, cancelar };
