const Cliente = require('../models/cliente');

async function listar(req, res) {
    try {
        const { busqueda, limite, pagina, tipo } = req.query;
        const resultado = await Cliente.listar({
            busqueda,
            tipo,
            limite: limite ? parseInt(limite, 10) : 10,
            pagina: pagina ? parseInt(pagina, 10) : 1
        });
        res.json(resultado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al listar clientes' });
    }
}

async function obtenerUno(req, res) {
    try {
        const { id } = req.params;
        const cliente = await Cliente.obtenerPorId(id);
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json(cliente);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el cliente' });
    }
}

module.exports = { listar, obtenerUno };