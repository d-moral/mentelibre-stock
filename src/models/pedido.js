const pool = require('../db');

async function crear({ nombre_cliente, direccion, contacto, items, metodo_pago, destinatario }) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Verificar stock disponible y traer nombre + precio_venta de cada producto
        const productosInfo = [];
        for (const item of items) {

            const { rows } = await client.query(
                'SELECT id, nombre, precio_venta, precio_venta_mayor, precio_compra, precio_compra_mayor, stock_actual FROM productos WHERE id = $1 FOR UPDATE',
                [item.producto_id]
            );

            const producto = rows[0];

            if (!producto) {
                throw new Error(`Producto ${item.producto_id} no existe`);
            }
            if (producto.stock_actual < item.cantidad) {
                throw new Error(`Stock insuficiente para el producto ${item.producto_id}`);
            }

            const esMayor = !!item.es_mayor;
            if (esMayor && producto.precio_venta_mayor == null) {
                throw new Error(`El producto ${item.producto_id} no tiene precio mayorista definido`);
            }

            productosInfo.push({
                ...item,
                producto_nombre: producto.nombre,
                precio_unitario: esMayor ? producto.precio_venta_mayor : producto.precio_venta,
                // si es mayorista pero no tiene costo mayorista cargado, cae al costo normal
                precio_compra_unitario: esMayor && producto.precio_compra_mayor != null
                    ? producto.precio_compra_mayor
                    : producto.precio_compra,
            });

        }

        // 2. Calcular el total y la ganancia real (venta - costo, por cada item)
        const total = productosInfo.reduce(
            (acc, item) => acc + item.cantidad * item.precio_unitario,
            0
        );
        const ganancia = productosInfo.reduce(
            (acc, item) => acc + item.cantidad * (item.precio_unitario - item.precio_compra_unitario),
            0
        );

        // 3. Crear la cabecera del pedido

        const { rows: pedidoRows } = await client.query(
            `INSERT INTO pedidos (nombre_cliente, direccion, contacto, total, ganancia_real, metodo_pago, destinatario)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [nombre_cliente, direccion, contacto, total, ganancia, metodo_pago, destinatario || null]
        );


        const pedido = pedidoRows[0];

        // 4. Crear cada item (con snapshot de nombre y precio) y descontar stock
        for (const item of productosInfo) {
            await client.query(
                `INSERT INTO pedido_items (pedido_id, producto_id, producto_nombre, cantidad, precio_unitario, precio_compra_unitario)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [pedido.id, item.producto_id, item.producto_nombre, item.cantidad, item.precio_unitario, item.precio_compra_unitario]
            );


            await client.query(
                `UPDATE productos
         SET stock_actual = stock_actual - $1,
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

    // Usamos el producto_nombre guardado en pedido_items (la "foto" al momento
    // del pedido), NO un JOIN a productos — así la boleta se ve bien aunque
    // el producto original ya haya sido borrado.
    const { rows: items } = await pool.query(
        `SELECT id, producto_id, producto_nombre, cantidad, precio_unitario
     FROM pedido_items
     WHERE pedido_id = $1`,
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

        // Solo devolvemos stock a productos que todavía existen
        // (producto_id puede ser NULL si el producto fue borrado después)
        const { rows: items } = await client.query(
            'SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = $1 AND producto_id IS NOT NULL',
            [id]
        );

        for (const item of items) {
            await client.query(
                `UPDATE productos
         SET stock_actual = stock_actual + $1,
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
