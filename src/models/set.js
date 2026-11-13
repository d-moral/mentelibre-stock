const pool = require('../db');

async function crear({ nombre, descripcion, precio_venta, precio_venta_mayor, cantidad_armar, items }) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        if (!items || items.length === 0) {
            throw new Error('El combo necesita al menos un producto');
        }
        if (!cantidad_armar || cantidad_armar <= 0) {
            throw new Error('cantidad_armar debe ser mayor a 0');
        }

        // 1. Verificar stock de cada componente y calcular el costo de armar 1 combo
        let costoUnitario = 0;
        const itemsInfo = [];

        for (const item of items) {
            const { rows } = await client.query(
                'SELECT id, precio_compra, stock_actual FROM productos WHERE id = $1 FOR UPDATE',
                [item.producto_id]
            );
            const producto = rows[0];

            if (!producto) {
                throw new Error(`Producto ${item.producto_id} no existe`);
            }

            const necesario = item.cantidad * cantidad_armar;
            if (producto.stock_actual < necesario) {
                throw new Error(`Stock insuficiente para armar el combo con el producto ${item.producto_id}`);
            }

            costoUnitario += producto.precio_compra * item.cantidad;
            itemsInfo.push({ ...item, necesario });
        }

        // 2. Crear la cabecera del combo, ya con el costo y el stock armado
        const { rows: setRows } = await client.query(
            `INSERT INTO sets (nombre, descripcion, stock_actual, costo_unitario, precio_venta, precio_venta_mayor)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [nombre, descripcion, cantidad_armar, costoUnitario, precio_venta, precio_venta_mayor]
        );
        const set = setRows[0];

        // 3. Guardar la composición y descontar stock de cada componente
        for (const item of itemsInfo) {
            await client.query(
                `INSERT INTO set_items (set_id, producto_id, cantidad) VALUES ($1, $2, $3)`,
                [set.id, item.producto_id, item.cantidad]
            );

            await client.query(
                `UPDATE productos
         SET stock_actual = stock_actual - $1,
             actualizado_en = NOW()
         WHERE id = $2`,
                [item.necesario, item.producto_id]
            );
        }

        await client.query('COMMIT');
        return set;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function listar() {
    const result = await pool.query('SELECT * FROM sets ORDER BY nombre ASC');
    return result.rows;
}

async function getById(id) {
    const result = await pool.query('SELECT * FROM sets WHERE id = $1', [id]);
    return result.rows[0];
}

async function obtenerConItems(id) {
    const set = await getById(id);
    if (!set) return null;

    const { rows: items } = await pool.query(
        `SELECT si.producto_id, p.nombre AS producto_nombre, si.cantidad
     FROM set_items si
     LEFT JOIN productos p ON p.id = si.producto_id
     WHERE si.set_id = $1`,
        [id]
    );

    return { ...set, items };
}

async function actualizar(id, { nombre, descripcion, precio_venta, precio_venta_mayor }) {
    const result = await pool.query(
        `UPDATE sets SET
      nombre = $1,
      descripcion = $2,
      precio_venta = $3,
      precio_venta_mayor = $4,
      actualizado_en = NOW()
     WHERE id = $5
     RETURNING *`,
        [nombre, descripcion, precio_venta, precio_venta_mayor, id]
    );
    return result.rows[0];
}

async function cancelar(id) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { rows: setRows } = await client.query(
            'SELECT * FROM sets WHERE id = $1 FOR UPDATE',
            [id]
        );
        const set = setRows[0];

        if (!set) {
            throw new Error('Combo no encontrado');
        }
        if (!set.activo) {
            throw new Error('El combo ya está cancelado');
        }

        // Devolvemos a cada producto componente el stock de las unidades
        // del combo que todavía no se vendieron (set.stock_actual)
        const { rows: items } = await client.query(
            'SELECT producto_id, cantidad FROM set_items WHERE set_id = $1',
            [id]
        );

        for (const item of items) {
            await client.query(
                `UPDATE productos
         SET stock_actual = stock_actual + $1,
             actualizado_en = NOW()
         WHERE id = $2`,
                [item.cantidad * set.stock_actual, item.producto_id]
            );
        }

        const { rows: actualizado } = await client.query(
            `UPDATE sets SET activo = false, stock_actual = 0, actualizado_en = NOW() WHERE id = $1 RETURNING *`,
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

async function reponerStock(id, cantidadReponer) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { rows: setRows } = await client.query(
            'SELECT * FROM sets WHERE id = $1 FOR UPDATE',
            [id]
        );
        const set = setRows[0];

        if (!set) {
            throw new Error('Combo no encontrado');
        }
        if (!set.activo) {
            throw new Error('El combo está cancelado, no se puede reponer stock');
        }
        if (!cantidadReponer || cantidadReponer <= 0) {
            throw new Error('cantidadReponer debe ser mayor a 0');
        }

        const { rows: items } = await client.query(
            'SELECT producto_id, cantidad FROM set_items WHERE set_id = $1',
            [id]
        );

        let costoLoteNuevo = 0;

        for (const item of items) {
            const { rows } = await client.query(
                'SELECT precio_compra, stock_actual FROM productos WHERE id = $1 FOR UPDATE',
                [item.producto_id]
            );
            const producto = rows[0];

            if (!producto) {
                throw new Error(`El producto ${item.producto_id} ya no existe, no se puede reponer`);
            }

            const necesario = item.cantidad * cantidadReponer;
            if (producto.stock_actual < necesario) {
                throw new Error(`Stock insuficiente para reponer el combo con el producto ${item.producto_id}`);
            }

            costoLoteNuevo += producto.precio_compra * item.cantidad;

            await client.query(
                `UPDATE productos
         SET stock_actual = stock_actual - $1,
             actualizado_en = NOW()
         WHERE id = $2`,
                [necesario, item.producto_id]
            );
        }

        // Promedio ponderado entre el stock viejo y el lote nuevo,
        // por si el precio_compra de algún componente cambió mientras tanto
        const stockNuevo = set.stock_actual + cantidadReponer;
        const costoUnitarioNuevo = stockNuevo > 0
            ? ((Number(set.costo_unitario) * set.stock_actual) + (costoLoteNuevo * cantidadReponer)) / stockNuevo
            : 0;

        const { rows: actualizado } = await client.query(
            `UPDATE sets
       SET stock_actual = $1,
           costo_unitario = $2,
           actualizado_en = NOW()
       WHERE id = $3
       RETURNING *`,
            [stockNuevo, costoUnitarioNuevo, id]
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

async function buscar(texto, limite = 5) {
    const result = await pool.query(
        `SELECT id, nombre, stock_actual
         FROM sets
         WHERE nombre ILIKE $1 AND COALESCE(activo, true) = true
         ORDER BY nombre
         LIMIT $2`,
        [`%${texto}%`, limite]
    );
    return result.rows;
}

module.exports = { crear, listar, getById, obtenerConItems, actualizar, cancelar, reponerStock, buscar };
