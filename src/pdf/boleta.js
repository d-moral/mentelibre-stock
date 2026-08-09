const PDFDocument = require('pdfkit');

const NEGOCIO = {
    nombre: 'MI NEGOCIO',
    cuit: 'XX-XXXXXXXX-X',
    direccion: 'Dirección / Datos de contacto',
};

function formatearNumero(id) {
    return String(id).padStart(8, '0');
}

function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-AR');
}

function generarBoleta(pedido, res) {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
        'Content-Disposition',
        `attachment; filename=boleta-${formatearNumero(pedido.id)}.pdf`
    );

    doc.pipe(res);

    // Encabezado del negocio
    doc.fontSize(16).text(NEGOCIO.nombre, { align: 'center' });
    doc.fontSize(10).text(`CUIT: ${NEGOCIO.cuit}`, { align: 'center' });
    doc.text(NEGOCIO.direccion, { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Título
    doc.fontSize(14).text('BOLETA DE PEDIDO', { align: 'center' });
    doc.moveDown();

    // Datos del pedido
    doc.fontSize(10);
    doc.text(`N°: ${formatearNumero(pedido.id)}`);
    doc.text(`Fecha: ${formatearFecha(pedido.fecha)}`);
    doc.text(`Cliente: ${pedido.nombre_cliente}`);
    if (pedido.direccion) doc.text(`Dirección: ${pedido.direccion}`);
    if (pedido.contacto) doc.text(`Contacto: ${pedido.contacto}`);
    doc.moveDown();

    // Tabla de productos
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    const colProducto = 50;
    const colCantidad = 320;
    const colPrecio = 420;

    doc.font('Helvetica-Bold');
    doc.text('Producto', colProducto, doc.y, { continued: false });
    doc.text('Cant.', colCantidad, doc.y - doc.currentLineHeight());
    doc.text('Precio', colPrecio, doc.y - doc.currentLineHeight());
    doc.font('Helvetica');
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    for (const item of pedido.items) {
        const y = doc.y;
        doc.text(item.producto_nombre, colProducto, y);
        doc.text(String(item.cantidad), colCantidad, y);
        doc.text(`$${Number(item.precio_unitario).toFixed(2)}`, colPrecio, y);
        doc.moveDown(0.5);
    }

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Total
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(`TOTAL: $${Number(pedido.total).toFixed(2)}`, { align: 'right' });
    doc.font('Helvetica');
    doc.moveDown();

    // Estado
    doc.fontSize(10).text(`Estado: ${pedido.estado.toUpperCase()}`);
    doc.moveDown(2);

    doc.fontSize(11).text('¡Gracias por su compra!', { align: 'center' });

    doc.end();
}

module.exports = { generarBoleta };