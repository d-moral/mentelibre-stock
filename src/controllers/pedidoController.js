const Pedido = require('../models/pedido');
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
        const { nombre_cliente, direccion, contacto, items } = req.body;

        if (!nombre_cliente) {
            return res.status(400).json({ error: 'nombre_cliente es obligatorio' });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'El pedido debe tener al menos un item' });
        }
        for (const item of items) {
            if (!item.producto_id || !item.cantidad || item.cantidad <= 0) {
                return res.status(400).json({
                    error: 'Cada item debe tener producto_id y cantidad mayor a 0',
                });
            }
        }

        const pedido = await Pedido.crear({ nombre_cliente, direccion, contacto, items });
        res.status(201).json(pedido);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
}

async function cambiarEstado(req, res) {
    try {
        const { estado } = req.body;
        const estadosValidos = ['pendiente', 'confirmado', 'vendido', 'cancelado'];

        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        // Cancelar tiene lógica especial (devuelve stock), se maneja aparte
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

module.exports = { listar, obtenerUno, crear, cambiarEstado, descargarBoleta };