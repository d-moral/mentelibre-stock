const pool = require('../db');
const Cliente = require('./cliente');

async function crear({ dni, nombre_cliente, direccion, contacto, items, metodo_pago, destinatario, registrar_revendedor }) {
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
            let detalleNota = null;

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
            } else if (item.producto_detalle_id) {
                const { rows } = await client.query('SELECT * FROM productos_detalle WHERE id = $1', [item.producto_detalle_id]);
                if (rows.length === 0) throw new Error(`Lote de detalle ${item.producto_detalle_id} no existe`);
                const lote = rows[0];

                if (lote.cantidad < item.cantidad) {
                    throw new Error(`Stock insuficiente en el lote de detalle (id ${lote.id})`);
                }

                const { rows: prodRows } = await client.query('SELECT * FROM productos WHERE id = $1', [lote.producto_id]);
                const prodOriginal = prodRows[0];

                precioUnitario = lote.precio_venta;
                precioCompra = Number(lote.precio_compra_unitario) || 0;
                productoNombre = lote.nombre_personalizado || (prodOriginal ? prodOriginal.nombre : 'Producto en detalle');
                detalleNota = lote.nota_dano;

                await client.query('UPDATE productos_detalle SET cantidad = cantidad - $1 WHERE id = $2', [item.cantidad, item.producto_detalle_id]);
            }

            total += precioUnitario * item.cantidad;
            ganancia_real += (precioUnitario - precioCompra) * item.cantidad;

            itemsProcesados.push({
                producto_id: item.producto_id || null,
                set_id: item.set_id || null,
                producto_detalle_id: item.producto_detalle_id || null,
                producto_detalle_nota: detalleNota,
                producto_nombre: productoNombre,
                set_nombre: setNombre,
                cantidad: item.cantidad,
                precio_unitario: precioUnitario,
                precio_compra_unitario: precioCompra,
                tipo: item.producto_detalle_id ? 'detalle' : (item.producto_id ? 'producto' : 'set'),
                es_mayor: item.producto_detalle_id ? false : !!item.es_mayor
            });
        }

        const { rows: pedidoRows } = await client.query(
            `INSERT INTO pedidos (dni, nombre_cliente, direccion, contacto, total, ganancia_real, metodo_pago, destinatario, estado, registrar_revendedor)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendiente', $9)
             RETURNING *`,
            [dni, nombre_cliente, direccion || null, contacto || null, total, ganancia_real, metodo_pago, destinatario || null, !!registrar_revendedor]
        );

        const nuevoPedido = pedidoRows[0];

        for (const item of itemsProcesados) {
            await client.query(
                `INSERT INTO pedido_items (pedido_id, producto_id, set_id, producto_detalle_id, producto_detalle_nota, producto_nombre, set_nombre, cantidad, precio_unitario, precio_compra_unitario, tipo, es_mayor)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    nuevoPedido.id,
                    item.producto_id,
                    item.set_id,
                    item.producto_detalle_id,
                    item.producto_detalle_nota,
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
        `SELECT id, producto_id, set_id, producto_detalle_id, producto_detalle_nota, producto_nombre, set_nombre, cantidad, precio_unitario, precio_compra_unitario, tipo, es_mayor
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

            if (pedido.registrar_revendedor) {
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
            'SELECT producto_id, set_id, producto_detalle_id, cantidad FROM pedido_items WHERE pedido_id = $1',
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
            } else if (item.producto_detalle_id) {
                await client.query(
                    `UPDATE productos_detalle SET cantidad = cantidad + $1 WHERE id = $2`,
                    [item.cantidad, item.producto_detalle_id]
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

async function actualizar(id, { dni, nombre_cliente, direccion, contacto, items, metodo_pago, destinatario, registrar_revendedor }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows: pedidoRows } = await client.query('SELECT * FROM pedidos WHERE id = $1', [id]);
        const pedidoExistente = pedidoRows[0];

        if (!pedidoExistente) {
            throw new Error('Pedido no encontrado');
        }
        if (pedidoExistente.estado !== 'pendiente') {
            throw new Error('Solo se pueden editar pedidos pendientes');
        }

        // Devuelve el stock de los items actuales antes de reemplazarlos
        const { rows: itemsActuales } = await client.query(
            'SELECT * FROM pedido_items WHERE pedido_id = $1',
            [id]
        );

        for (const item of itemsActuales) {
            if (item.producto_id) {
                await client.query('UPDATE productos SET stock_actual = stock_actual + $1 WHERE id = $2', [item.cantidad, item.producto_id]);
            } else if (item.set_id) {
                await client.query('UPDATE sets SET stock_actual = stock_actual + $1 WHERE id = $2', [item.cantidad, item.set_id]);
            } else if (item.producto_detalle_id) {
                await client.query('UPDATE productos_detalle SET cantidad = cantidad + $1 WHERE id = $2', [item.cantidad, item.producto_detalle_id]);
            }
        }

        await client.query('DELETE FROM pedido_items WHERE pedido_id = $1', [id]);

        // Vuelve a calcular precios, stock y totales con los items nuevos (misma lógica que crear())
        let total = 0;
        let ganancia_real = 0;
        const itemsProcesados = [];

        for (const item of items) {
            let precioUnitario = 0;
            let precioCompra = 0;
            let productoNombre = '';
            let setNombre = null;
            let detalleNota = null;

            if (item.producto_id) {
                const { rows } = await client.query('SELECT * FROM productos WHERE id = $1', [item.producto_id]);
                if (rows.length === 0) throw new Error(`Producto ${item.producto_id} no existe`);
                const prod = rows[0];

                if (prod.stock_actual < item.cantidad) {
                    throw new Error(`Stock insuficiente para el producto: ${prod.nombre}`);
                }

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

                precioUnitario = item.es_mayor
                    ? (combo.precio_venta_mayor || combo.precio_venta)
                    : combo.precio_venta;
                precioCompra = combo.costo_unitario || 0;
                setNombre = combo.nombre;
                productoNombre = combo.nombre;

                await client.query('UPDATE sets SET stock_actual = stock_actual - $1 WHERE id = $2', [item.cantidad, item.set_id]);
            } else if (item.producto_detalle_id) {
                const { rows } = await client.query('SELECT * FROM productos_detalle WHERE id = $1', [item.producto_detalle_id]);
                if (rows.length === 0) throw new Error(`Lote de detalle ${item.producto_detalle_id} no existe`);
                const lote = rows[0];

                if (lote.cantidad < item.cantidad) {
                    throw new Error(`Stock insuficiente en el lote de detalle (id ${lote.id})`);
                }

                const { rows: prodRows } = await client.query('SELECT * FROM productos WHERE id = $1', [lote.producto_id]);
                const prodOriginal = prodRows[0];
                precioUnitario = lote.precio_venta;
                precioCompra = Number(lote.precio_compra_unitario) || 0;
                productoNombre = lote.nombre_personalizado || (prodOriginal ? prodOriginal.nombre : 'Producto en detalle');
                detalleNota = lote.nota_dano;

                await client.query('UPDATE productos_detalle SET cantidad = cantidad - $1 WHERE id = $2', [item.cantidad, item.producto_detalle_id]);
            }

            total += precioUnitario * item.cantidad;
            ganancia_real += (precioUnitario - precioCompra) * item.cantidad;

            itemsProcesados.push({
                producto_id: item.producto_id || null,
                set_id: item.set_id || null,
                producto_detalle_id: item.producto_detalle_id || null,
                producto_detalle_nota: detalleNota,
                producto_nombre: productoNombre,
                set_nombre: setNombre,
                cantidad: item.cantidad,
                precio_unitario: precioUnitario,
                precio_compra_unitario: precioCompra,
                tipo: item.producto_detalle_id ? 'detalle' : (item.producto_id ? 'producto' : 'set'),
                es_mayor: item.producto_detalle_id ? false : !!item.es_mayor
            });
        }

        const { rows: pedidoActualizadoRows } = await client.query(
            `UPDATE pedidos
             SET dni = $1, nombre_cliente = $2, direccion = $3, contacto = $4,
                 total = $5, ganancia_real = $6, metodo_pago = $7, destinatario = $8,
                 registrar_revendedor = $9
             WHERE id = $10
             RETURNING *`,
            [dni, nombre_cliente, direccion || null, contacto || null, total, ganancia_real, metodo_pago, destinatario || null, !!registrar_revendedor, id]
        );

        const pedidoActualizado = pedidoActualizadoRows[0];

        for (const item of itemsProcesados) {
            await client.query(
                `INSERT INTO pedido_items (pedido_id, producto_id, set_id, producto_detalle_id, producto_detalle_nota, producto_nombre, set_nombre, cantidad, precio_unitario, precio_compra_unitario, tipo, es_mayor)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    id,
                    item.producto_id,
                    item.set_id,
                    item.producto_detalle_id,
                    item.producto_detalle_nota,
                    item.producto_nombre,
                    item.set_nombre,
                    item.cantidad,
                    item.precio_unitario,
                    item.precio_compra_unitario,
                    item.tipo,
                    item.es_mayor
                ]
            );
        }

        await client.query('COMMIT');
        return pedidoActualizado;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { crear, listar, obtenerConItems, cambiarEstado, cancelar, actualizar };