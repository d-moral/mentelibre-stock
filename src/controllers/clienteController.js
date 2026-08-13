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

async function obtenerPorDni(req, res) {
    try {
        const { dni } = req.params;
        const cliente = await Cliente.obtenerPorDni(dni);
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json(cliente);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el cliente' });
    }
}

async function actualizarRevendedor(req, res) {
    try {
        const { id } = req.params;
        const { es_revendedor } = req.body;

        if (typeof es_revendedor !== 'boolean') {
            return res.status(400).json({ error: 'es_revendedor debe ser true o false' });
        }

        const cliente = await Cliente.actualizarRevendedor(id, es_revendedor);
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json(cliente);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el cliente' });
    }
}

async function obtenerHistorial(req, res) {
    try {
        const { id } = req.params;
        const historial = await Cliente.obtenerHistorial(id);
        res.json(historial);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el historial del cliente' });
    }
}

module.exports = { listar, obtenerUno, obtenerPorDni, actualizarRevendedor, obtenerHistorial };