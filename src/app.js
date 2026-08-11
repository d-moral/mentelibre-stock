const express = require('express');
require('dotenv').config();

const productosRouter = require('./routes/productos');
const pedidosRouter = require('./routes/pedidos');
const setsRouter = require('./routes/sets');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/productos', productosRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/sets', setsRouter);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});