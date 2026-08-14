const pool = require('../db');

class Cliente {
    static async guardarDesdePedido(dni, nombre, direccion, telefono) {
        const query = `
            INSERT INTO clientes (dni, nombre, direccion, telefono, creado_en, actualizado_en)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (dni) DO UPDATE
            SET nombre = EXCLUDED.nombre,
                direccion = COALESCE(EXCLUDED.direccion, clientes.direccion),
                telefono = COALESCE(EXCLUDED.telefono, clientes.telefono),
                actualizado_en = NOW()
            RETURNING id;
        `;

        const values = [dni, nombre, direccion, telefono];
        const { rows } = await pool.query(query, values);

        return rows[0].id;
    }

    static async listar({ busqueda = '', tipo = '', limite = 10, pagina = 1 }) {
        await pool.query('ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS es_mayor BOOLEAN DEFAULT false;');
        await pool.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS es_revendedor BOOLEAN NOT NULL DEFAULT false;');

        const offset = (pagina - 1) * limite;
        const whereConditions = [];
        const params = [];

        // Búsqueda orientada solo a DNI y Nombre
        if (busqueda) {
            params.push(`%${busqueda}%`);
            whereConditions.push(`(c.nombre ILIKE $${params.length} OR c.dni ILIKE $${params.length})`);
        }

        if (tipo === 'revendedor') {
            whereConditions.push(`c.es_revendedor = true`);
        }

        const havingConditions = [];
        if (tipo === 'mayor') {
            havingConditions.push(`COUNT(CASE WHEN pi.es_mayor = true THEN 1 END) > 0`);
        } else if (tipo === 'menor') {
            havingConditions.push(`COUNT(CASE WHEN pi.es_mayor = false THEN 1 END) > 0`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const havingClause = havingConditions.length > 0 ? `HAVING ${havingConditions.join(' AND ')}` : '';

        const queryBase = `
            FROM clientes c
            LEFT JOIN pedidos p ON (p.cliente_id = c.id OR p.dni = c.dni) AND p.estado = 'vendido'
            LEFT JOIN pedido_items pi ON pi.pedido_id = p.id
            ${whereClause}
            GROUP BY c.id
            ${havingClause}
        `;

        const countQuery = `SELECT COUNT(*)::INT FROM (SELECT c.id ${queryBase}) AS subquery`;
        const { rows: countRows } = await pool.query(countQuery, params);
        const total = countRows[0] ? countRows[0].count : 0;

        const limitParamIndex = params.length + 1;
        const offsetParamIndex = params.length + 2;
        params.push(limite, offset);

        const dataQuery = `
            SELECT 
                c.*,
                COALESCE(SUM(DISTINCT p.total), 0)::NUMERIC AS total_gastado,
                COUNT(DISTINCT p.id)::INT AS total_pedidos,
                CASE 
                    WHEN COUNT(CASE WHEN pi.es_mayor = true THEN 1 END) > 0 AND COUNT(CASE WHEN pi.es_mayor = false THEN 1 END) > 0 THEN 'Mayor y Menor'
                    WHEN COUNT(CASE WHEN pi.es_mayor = true THEN 1 END) > 0 THEN 'Por Mayor'
                    WHEN COUNT(CASE WHEN pi.es_mayor = false THEN 1 END) > 0 THEN 'Por Menor'
                    ELSE 'Sin compras'
                END AS tipo_compra
            ${queryBase}
            ORDER BY c.actualizado_en DESC
            LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
        `;

        const { rows } = await pool.query(dataQuery, params);

        return {
            datos: rows,
            paginacion: {
                total,
                pagina: Number(pagina),
                limite: Number(limite),
                totalPaginas: Math.ceil(total / limite) || 1
            }
        };
    }
    static async obtenerPorDni(dni) {
        const { rows } = await pool.query('SELECT * FROM clientes WHERE dni = $1', [dni]);
        return rows[0] || null;
    }

    static async marcarComoRevendedor(id) {
        const { rows } = await pool.query(
            `UPDATE clientes SET es_revendedor = true, actualizado_en = NOW()
             WHERE id = $1 AND es_revendedor = false
             RETURNING *`,
            [id]
        );
        return rows[0] || null;
    }

    static async actualizarRevendedor(id, esRevendedor) {
        const { rows } = await pool.query(
            `UPDATE clientes SET es_revendedor = $1, actualizado_en = NOW()
             WHERE id = $2
             RETURNING *`,
            [esRevendedor, id]
        );
        return rows[0] || null;
    }

    static async obtenerPorId(id) {
        const { rows } = await pool.query('SELECT * FROM clientes WHERE id = $1', [id]);
        return rows[0] || null;
    }

    static async obtenerHistorial(id) {
        const { rows: pedidos } = await pool.query(
            `SELECT p.id, p.fecha, p.total, p.estado
                 FROM pedidos p
                 JOIN clientes c ON (p.cliente_id = c.id OR p.dni = c.dni)
                 WHERE c.id = $1
                 ORDER BY p.fecha DESC`,
            [id]
        );

        const { rows: topProductos } = await pool.query(
            `SELECT
                    COALESCE(pi.set_nombre, pi.producto_nombre) AS nombre,
                    SUM(pi.cantidad)::INT AS total_comprado
                 FROM pedidos p
                 JOIN pedido_items pi ON pi.pedido_id = p.id
                 JOIN clientes c ON (p.cliente_id = c.id OR p.dni = c.dni)
                 WHERE c.id = $1 AND p.estado = 'vendido'
                 GROUP BY COALESCE(pi.set_nombre, pi.producto_nombre)
                 ORDER BY total_comprado DESC
                 LIMIT 5`,
            [id]
        );

        return { pedidos, topProductos };
    }

    static async buscar(texto, limite = 5) {
        const { rows } = await pool.query(
            `SELECT id, dni, nombre
             FROM clientes
             WHERE nombre ILIKE $1 OR dni ILIKE $1
             ORDER BY nombre
             LIMIT $2`,
            [`%${texto}%`, limite]
        );
        return rows;
    }
}


module.exports = Cliente;