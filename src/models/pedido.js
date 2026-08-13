const pool = require('../db');
const Cliente = require('./cliente');

async function crear({ dni, nombre_cliente, direccion, contacto, items, metodo_pago, destinatario }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let total = 0;
        let ganancia_real = 0;
        const itemsProcesados = [];

        for (const item of items) {
            let precioUnitario = 0;
            let precioCompra = 0;
            let productoNombre = '';
            let setNombre = null;

            if (item.producto_id) {
                const { rows } = await client.query('SELECT * FROM productos WHERE id = $1', [item.producto_id]);
                if (rows.length === 0) throw new Error(`Producto ${item.producto_id} no existe`);
                const prod = rows[0];

                if (prod.stock_actual < item.cantidad) {
                    throw new Error(`Stock insuficiente para el producto: ${prod.nombre}`);
                }

                // Corrige los nombres de campos según el esquema de la base de datos
                precioUnitario = item.es_mayor
                    ? (prod.precio_venta_mayor || prod.precio_venta)
                    : prod.precio_venta;
                precioCompra = prod.precio_compra || 0;
                productoNombre = prod.nombre;

                await client.query('UPDATE productos SET stock_actual = stock_actual - $1 WHERE id = $2', [item.cantidad, item.producto_id]);
            } else if (item.set_id) {
                const { rows } = await client.query('SELECT * FROM sets WHERE id = $1', [item.set_id]);
                if (rows.length === 0) throw new Error(`Set ${item.set_id} no existe`);
                const combo = rows[0];

                if (combo.stock_actual < item.cantidad) {
                    throw new Error(`Stock insuficiente para el set: ${combo.nombre}`);
                }

                // Corrige los nombres de campos para los sets
                precioUnitario = item.es_mayor
                    ? (combo.precio_venta_mayor || combo.precio_venta)
                    : combo.precio_venta;
                precioCompra = combo.costo_unitario || 0;
                setNombre = combo.nombre;
                productoNombre = combo.nombre;

                await client.query('UPDATE sets SET stock_actual = stock_actual - $1 WHERE id = $2', [item.cantidad, item.set_id]);
            }

            total += precioUnitario * item.cantidad;
            ganancia_real += (precioUnitario - precioCompra) * item.cantidad;

            itemsProcesados.push({
                producto_id: item.producto_id || null,
                set_id: item.set_id || null,
                producto_nombre: productoNombre,
                set_nombre: setNombre,
                cantidad: item.cantidad,
                precio_unitario: precioUnitario,
                precio_compra_unitario: precioCompra,
                tipo: item.producto_id ? 'producto' : 'set',
                es_mayor: !!item.es_mayor
            });
        }

        const { rows: pedidoRows } = await client.query(
            `INSERT INTO pedidos (dni, nombre_cliente, direccion, contacto, total, ganancia_real, metodo_pago, destinatario, estado)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendiente')
             RETURNING *`,
            [dni, nombre_cliente, direccion || null, contacto || null, total, ganancia_real, metodo_pago, destinatario || null]
        );

        const nuevoPedido = pedidoRows[0];

        await client.query('ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS es_mayor BOOLEAN DEFAULT false;');

        for (const item of itemsProcesados) {
            await client.query(
                `INSERT INTO pedido_items (pedido_id, producto_id, set_id, producto_nombre, set_nombre, cantidad, precio_unitario, precio_compra_unitario, tipo, es_mayor)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    nuevoPedido.id,
                    item.producto_id,
                    item.set_id,
                    item.producto_nombre,
                    item.set_nombre,
                    item.cantidad,
                    item.precio_unitario,
                    item.precio_compra_unitario,
                    item.tipo,
                    !!item.es_mayor
                ]
            );
        }

        await client.query('COMMIT');
        return nuevoPedido;
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
        `SELECT id, producto_id, set_id, producto_nombre, set_nombre, cantidad, precio_unitario, precio_compra_unitario, tipo, es_mayor
     FROM pedido_items
     WHERE pedido_id = $1`,
        [id]
    );

    for (const item of items) {
        if (item.set_id) {
            const { rows: componentes } = await pool.query(
                `SELECT p.nombre AS producto_nombre, si.cantidad, p.precio_venta
         FROM set_items si
         JOIN productos p ON p.id = si.producto_id
         WHERE si.set_id = $1`,
                [item.set_id]
            );
            item.componentes = componentes;
        }
    }

    return { ...pedido, items };
}

async function cambiarEstado(id, nuevoEstado) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
            `UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING *`,
            [nuevoEstado, id]
        );

        if (rows.length === 0) {
            throw new Error('Pedido no encontrado');
        }

        const pedido = rows[0];

        if (nuevoEstado === 'vendido') {
            const clienteId = await Cliente.guardarDesdePedido(
                pedido.dni,
                pedido.nombre_cliente,
                pedido.direccion,
                pedido.contacto
            );

            await client.query(
                `UPDATE pedidos SET cliente_id = $1 WHERE id = $2`,
                [clienteId, id]
            );

            pedido.cliente_id = clienteId;

            const { rows: itemsMayor } = await client.query(
                `SELECT COALESCE(SUM(cantidad), 0) AS total_mayor
                 FROM pedido_items
                 WHERE pedido_id = $1 AND es_mayor = true`,
                [id]
            );

            const cantidadMayorista = Number(itemsMayor[0].total_mayor);

            if (cantidadMayorista >= 3) {
                await client.query(
                    `UPDATE clientes SET es_revendedor = true, actualizado_en = NOW()
                     WHERE id = $1 AND es_revendedor = false`,
                    [clienteId]
                );
            }
        }

        await client.query('COMMIT');
        return pedido;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
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
            'SELECT producto_id, set_id, cantidad FROM pedido_items WHERE pedido_id = $1',
            [id]
        );

        for (const item of items) {
            if (item.set_id) {
                await client.query(
                    `UPDATE sets
           SET stock_actual = stock_actual + $1,
               actualizado_en = NOW()
           WHERE id = $2`,
                    [item.cantidad, item.set_id]
                );
            } else if (item.producto_id) {
                await client.query(
                    `UPDATE productos
           SET stock_actual = stock_actual + $1,
               actualizado_en = NOW()
           WHERE id = $2`,
                    [item.cantidad, item.producto_id]
                );
            }
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