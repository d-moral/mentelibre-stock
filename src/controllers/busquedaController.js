const Producto = require('../models/producto');
const Cliente = require('../models/cliente');

async function buscarGlobal(req, res) {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json({ productos: [], clientes: [] });
        }

        const texto = q.trim();
        const [productos, clientes] = await Promise.all([
            Producto.buscar(texto),
            Cliente.buscar(texto),
        ]);

        res.json({ productos, clientes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al buscar' });
    }
}

module.exports = { buscarGlobal };
