const Producto = require('../models/producto');
const Cliente = require('../models/cliente');
const SetModel = require('../models/set');
const ProductoDetalle = require('../models/productoDetalle');

async function buscarGlobal(req, res) {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json({ productos: [], clientes: [], sets: [], detalles: [] });
        }

        const texto = q.trim();
        const [productos, clientes, sets, detalles] = await Promise.all([
            Producto.buscar(texto),
            Cliente.buscar(texto),
            SetModel.buscar(texto),
            ProductoDetalle.buscar(texto),
        ]);

        res.json({ productos, clientes, sets, detalles });
    } catch (err) {
        console.error('Error en busquedaGlobal:', err);
        res.status(500).json({ error: 'Error al buscar' });
    }
}

module.exports = { buscarGlobal };