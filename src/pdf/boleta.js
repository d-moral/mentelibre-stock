const PDFDocument = require('pdfkit');

const path = require('path');

const NEGOCIO = {
    nombre: 'MENTELIBRE',
    contacto: '2224511201',
    logo: path.join(__dirname, 'assets', 'logo.png'),
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
    const inicioEncabezado = doc.y;
    const anchoLogo = 50;

    doc.image(
        NEGOCIO.logo,
        doc.page.width - doc.page.margins.right - anchoLogo,
        inicioEncabezado,
        { width: anchoLogo }
    );

    doc.fontSize(16).text(NEGOCIO.nombre, doc.page.margins.left, inicioEncabezado);
    doc.fontSize(10).text(`Contacto: ${NEGOCIO.contacto}`, doc.page.margins.left, doc.y);

    doc.moveDown(2);
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

    function renderLinea(nombre, cantidad, precio, indentado) {
        const y = doc.y;
        const x = indentado ? colProducto + 15 : colProducto;
        if (indentado) doc.fontSize(9).fillColor('#555555');
        doc.text(nombre, x, y);
        doc.text(String(cantidad), colCantidad, y);
        doc.text(`$${Number(precio).toFixed(2)}`, colPrecio, y);
        if (indentado) doc.fontSize(10).fillColor('#000000');
        doc.moveDown(0.5);
    }

    // Combos primero (con sus componentes indentados debajo), después los
    // productos sueltos por separado
    const itemsCombos = pedido.items.filter(i => i.set_id);
    const itemsProductos = pedido.items.filter(i => !i.set_id);

    for (const item of itemsCombos) {
        renderLinea(item.set_nombre, item.cantidad, item.precio_unitario, false);
        for (const comp of item.componentes || []) {
            renderLinea(`- ${comp.producto_nombre}`, comp.cantidad * item.cantidad, comp.precio_venta, true);
        }
    }

    for (const item of itemsProductos) {
        renderLinea(item.producto_nombre, item.cantidad, item.precio_unitario, false);
    }
    

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Total
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(`TOTAL: $${Number(pedido.total).toFixed(2)}`, { align: 'right' });
    doc.font('Helvetica');
    doc.moveDown();

    // Método de pago
    const metodoTexto = pedido.metodo_pago === 'transferencia' ? 'Transferencia' : 'Efectivo';
    doc.fontSize(10).text(`Método de pago: ${metodoTexto}`);
    doc.moveDown(2);


    doc.fontSize(11).text('¡Gracias por su compra!', { align: 'center' });

    doc.end();
}

module.exports = { generarBoleta };