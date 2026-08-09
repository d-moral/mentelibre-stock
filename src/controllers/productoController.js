const Producto = require('../models/producto');

async function listar(req, res) {
    try {
        const productos = await Producto.getAll();
        res.json(productos);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al listar productos' });
    }
}

async function obtenerUno(req, res) {
    try {
        const producto = await Producto.getById(req.params.id);
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(producto);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener el producto' });
    }
}

async function crear(req, res) {
    try {
        const { nombre, precio_compra, precio_venta } = req.body;

        if (!nombre || precio_compra == null || precio_venta == null) {
            return res.status(400).json({
                error: 'nombre, precio_compra y precio_venta son obligatorios',
            });
        }
        if (precio_compra < 0 || precio_venta < 0) {
            return res.status(400).json({ error: 'Los precios no pueden ser negativos' });
        }

        const nuevoProducto = await Producto.create({
            stock_actual: 0,
            descripcion: null,
            precio_compra_mayor: null,
            precio_venta_mayor: null,
            proveedor: null,
            ...req.body,
        });
        res.status(201).json(nuevoProducto);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear el producto' });
    }
}

async function actualizar(req, res) {
    try {
        const existente = await Producto.getById(req.params.id);
        if (!existente) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const datosActualizados = { ...existente, ...req.body };

        if (datosActualizados.precio_compra < 0 || datosActualizados.precio_venta < 0) {
            return res.status(400).json({ error: 'Los precios no pueden ser negativos' });
        }

        const productoActualizado = await Producto.update(req.params.id, datosActualizados);
        res.json(productoActualizado);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar el producto' });
    }
}

async function eliminar(req, res) {
    try {
        const existente = await Producto.getById(req.params.id);
        if (!existente) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const productoEliminado = await Producto.remove(req.params.id);
        res.json(productoEliminado);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar el producto' });
    }
}

module.exports = { listar, obtenerUno, crear, actualizar, eliminar };