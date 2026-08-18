const ProductoDetalle = require('../models/productoDetalle');

async function listarActivos(req, res) {
    try {
        const lotes = await ProductoDetalle.getAllActivos();
        res.json(lotes);
    } catch (error) {
        console.error('Error al listar activos:', error);
        res.status(500).json({ error: error.message });
    }
}

async function listarPorProducto(req, res) {
    try {
        const { producto_id } = req.params;
        const lotes = await ProductoDetalle.getByProductoId(producto_id);
        res.json(lotes);
    } catch (error) {
        console.error('Error al listar por producto:', error);
        res.status(500).json({ error: error.message });
    }
}

async function crear(req, res) {
    try {
        const producto_id = Number(req.params.id);
        const { cantidad, precio_venta, nota_dano, nombre_personalizado } = req.body;

        if (!producto_id) {
            return res.status(400).json({ error: 'Producto inválido' });
        }

        if (cantidad <= 0) {
            return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
        }
        if (precio_venta < 0) {
            return res.status(400).json({ error: 'El precio de venta no puede ser negativo' });
        }

        const nuevoLote = await ProductoDetalle.crear({
            producto_id,
            cantidad,
            precio_venta,
            nota_dano,
            nombre_personalizado
        });

        res.status(201).json(nuevoLote);
    } catch (error) {
        console.error('Error al crear detalle:', error);
        res.status(500).json({ error: error.message });
    }
}

async function actualizar(req, res) {
    try {
        const { id } = req.params;
        const { cantidad, precio_venta, nota_dano, nombre_personalizado } = req.body;

        if (cantidad <= 0) {
            return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
        }
        if (precio_venta < 0) {
            return res.status(400).json({ error: 'El precio de venta no puede ser negativo' });
        }

        const loteActualizado = await ProductoDetalle.actualizar(id, {
            cantidad,
            precio_venta,
            nota_dano,
            nombre_personalizado
        });

        res.json(loteActualizado);
    } catch (error) {
        console.error('Error al actualizar detalle:', error);
        res.status(500).json({ error: error.message });
    }
}

async function cancelar(req, res) {
    try {
        const { id } = req.params;
        await ProductoDetalle.cancelar(id);
        res.json({ message: 'Lote de detalle cancelado/eliminado correctamente' });
    } catch (error) {
        console.error('Error al cancelar detalle:', error);
        res.status(500).json({ error: error.message });
    }
}

async function listarHistorial(req, res) {
    try {
        const lotes = await ProductoDetalle.getTodosConHistorial();
        res.json(lotes);
    } catch (error) {
        console.error('Error al listar historial:', error);
        res.status(500).json({ error: error.message });
    }
}

async function obtenerPorId(req, res) {
    try {
        const { id } = req.params;
        const lote = await ProductoDetalle.getById(id);
        if (!lote) return res.status(404).json({ error: 'Lote de detalle no encontrado' });
        res.json(lote);
    } catch (error) {
        console.error('Error al obtener detalle:', error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = {listarActivos, listarPorProducto, crear, actualizar, cancelar, listarHistorial, obtenerPorId};