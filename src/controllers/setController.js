const Set = require('../models/set');

async function listar(req, res) {
    try {
        const sets = await Set.listar();
        res.json(sets);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al listar combos' });
    }
}

async function obtenerUno(req, res) {
    try {
        const set = await Set.obtenerConItems(req.params.id);
        if (!set) {
            return res.status(404).json({ error: 'Combo no encontrado' });
        }
        res.json(set);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener el combo' });
    }
}

async function crear(req, res) {
    try {
        const { nombre, precio_venta, cantidad_armar, items } = req.body;

        if (!nombre || precio_venta == null || !cantidad_armar || !items || items.length === 0) {
            return res.status(400).json({
                error: 'nombre, precio_venta, cantidad_armar y al menos un producto son obligatorios',
            });
        }
        if (precio_venta < 0) {
            return res.status(400).json({ error: 'El precio no puede ser negativo' });
        }

        const nuevoSet = await Set.crear({
            descripcion: null,
            precio_venta_mayor: null,
            ...req.body,
        });
        res.status(201).json(nuevoSet);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message || 'Error al crear el combo' });
    }
}

async function actualizar(req, res) {
    try {
        const existente = await Set.getById(req.params.id);
        if (!existente) {
            return res.status(404).json({ error: 'Combo no encontrado' });
        }

        const datosActualizados = { ...existente, ...req.body };

        if (datosActualizados.precio_venta < 0) {
            return res.status(400).json({ error: 'El precio no puede ser negativo' });
        }

        const setActualizado = await Set.actualizar(req.params.id, datosActualizados);
        res.json(setActualizado);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar el combo' });
    }
}

async function cancelar(req, res) {
    try {
        const existente = await Set.getById(req.params.id);
        if (!existente) {
            return res.status(404).json({ error: 'Combo no encontrado' });
        }

        const setCancelado = await Set.cancelar(req.params.id);
        res.json(setCancelado);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message || 'Error al cancelar el combo' });
    }
}

async function reponerStock(req, res) {
    try {
        const { cantidad } = req.body;

        if (!cantidad || cantidad <= 0) {
            return res.status(400).json({ error: 'cantidad debe ser mayor a 0' });
        }

        const existente = await Set.getById(req.params.id);
        if (!existente) {
            return res.status(404).json({ error: 'Combo no encontrado' });
        }

        const setActualizado = await Set.reponerStock(req.params.id, cantidad);
        res.json(setActualizado);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message || 'Error al reponer stock del combo' });
    }
}

module.exports = { listar, obtenerUno, crear, actualizar, cancelar, reponerStock };