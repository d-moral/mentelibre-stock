const Pedido = require('../models/pedido');
const Cliente = require('../models/cliente');
const { generarBoleta } = require('../pdf/boleta');

async function listar(req, res) {
    try {
        const pedidos = await Pedido.listar();
        res.json(pedidos);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al listar pedidos' });
    }
}

async function obtenerUno(req, res) {
    try {
        const pedido = await Pedido.obtenerConItems(req.params.id);
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        res.json(pedido);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener el pedido' });
    }
}

async function crear(req, res) {
    try {
        const { dni, nombre_cliente, direccion, contacto, items, metodo_pago, destinatario, registrar_revendedor } = req.body;

        if (!dni) {
            return res.status(400).json({ error: 'dni es obligatorio' });
        }
        if (!nombre_cliente) {
            return res.status(400).json({ error: 'nombre_cliente es obligatorio' });
        }
        if (!['efectivo', 'transferencia'].includes(metodo_pago)) {
            return res.status(400).json({ error: 'metodo_pago debe ser "efectivo" o "transferencia"' });
        }
        if (metodo_pago === 'transferencia' && !['elias', 'ludmila'].includes(destinatario)) {
            return res.status(400).json({ error: 'destinatario es obligatorio y debe ser "elias" o "ludmila" cuando el método es transferencia' });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'El pedido debe tener al menos un item' });
        }

        for (const item of items) {
            const tieneProducto = !!item.producto_id;
            const tieneSet = !!item.set_id;

            if (tieneProducto === tieneSet) {
                return res.status(400).json({
                    error: 'Cada item debe tener producto_id O set_id (uno solo), y cantidad mayor a 0',
                });
            }
            if (!item.cantidad || item.cantidad <= 0) {
                return res.status(400).json({
                    error: 'Cada item debe tener cantidad mayor a 0',
                });
            }
            if (item.es_mayor !== undefined && typeof item.es_mayor !== 'boolean') {
                return res.status(400).json({
                    error: 'es_mayor debe ser true o false',
                });
            }
        }

        const pedido = await Pedido.crear({ dni, nombre_cliente, direccion, contacto, items, metodo_pago, destinatario, registrar_revendedor });

        res.status(201).json(pedido);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
}

async function actualizar(req, res) {
    try {
        const { dni, nombre_cliente, direccion, contacto, items, metodo_pago, destinatario, registrar_revendedor } = req.body;

        if (!dni || !nombre_cliente || !metodo_pago) {
            return res.status(400).json({ error: 'dni, nombre_cliente y metodo_pago son obligatorios' });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Debe incluir al menos un item' });
        }

        for (const item of items) {
            const tieneProducto = !!item.producto_id;
            const tieneSet = !!item.set_id;

            if (tieneProducto === tieneSet) {
                return res.status(400).json({
                    error: 'Cada item debe tener producto_id O set_id (uno solo), y cantidad mayor a 0',
                });
            }
            if (!item.cantidad || item.cantidad <= 0) {
                return res.status(400).json({
                    error: 'Cada item debe tener cantidad mayor a 0',
                });
            }
            if (item.es_mayor !== undefined && typeof item.es_mayor !== 'boolean') {
                return res.status(400).json({
                    error: 'es_mayor debe ser true o false',
                });
            }
        }

        const pedido = await Pedido.actualizar(req.params.id, { dni, nombre_cliente, direccion, contacto, items, metodo_pago, destinatario, registrar_revendedor });
        res.json(pedido);
    } catch (err) {
        console.error(err);
        if (err.message === 'Pedido no encontrado') {
            return res.status(404).json({ error: err.message });
        }
        if (err.message === 'Solo se pueden editar pedidos pendientes') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message || 'Error al actualizar el pedido' });
    }
}

async function cambiarEstado(req, res) {
    try {
        const { estado } = req.body;
        const estadosValidos = ['pendiente', 'confirmado', 'vendido', 'cancelado'];

        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        if (estado === 'cancelado') {
            const pedido = await Pedido.cancelar(req.params.id);
            return res.json(pedido);
        }

        const pedido = await Pedido.cambiarEstado(req.params.id, estado);
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        res.json(pedido);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
}

async function descargarBoleta(req, res) {
    try {
        const pedido = await Pedido.obtenerConItems(req.params.id);
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        generarBoleta(pedido, res);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al generar la boleta' });
    }
}

module.exports = { listar, obtenerUno, crear, cambiarEstado, descargarBoleta, actualizar };