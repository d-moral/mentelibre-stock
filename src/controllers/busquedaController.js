const Producto = require('../models/producto');
const Cliente = require('../models/cliente');
const SetModel = require('../models/set');

async function buscarGlobal(req, res) {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json({ productos: [], clientes: [], sets: [] });
        }

        const texto = q.trim();
        const [productos, clientes, sets] = await Promise.all([
            Producto.buscar(texto),
            Cliente.buscar(texto),
            SetModel.buscar(texto),
        ]);

        res.json({ productos, clientes, sets });
    } catch (err) {
        console.error('Error en busquedaGlobal:', err);
        res.status(500).json({ error: 'Error al buscar' });
    }
}

module.exports = { buscarGlobal };