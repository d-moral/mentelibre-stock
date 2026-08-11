const API = '/api';

// ---------- TABS ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});

// ---------- HELPERS ----------
function formatearPrecio(valor) {
    return `$${Number(valor).toFixed(2)}`;
}

function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-AR');
}

function fechaLocalISO(fechaISO) {
    const d = new Date(fechaISO);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ---------- CARGA INICIAL ----------
window.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    cargarPedidos();
});

// ---------- PRODUCTOS ----------
let productosCache = [];
document.getElementById('filtro-seccion').addEventListener('change', renderizarProductos);

async function cargarProductos() {
    const res = await fetch(`${API}/productos`);
    productosCache = await res.json();
    actualizarFiltroSecciones();
    renderizarProductos();
}

function actualizarFiltroSecciones() {
    const select = document.getElementById('filtro-seccion');
    const seccionActual = select.value;
    const secciones = [...new Set(productosCache.map(p => p.seccion).filter(Boolean))];

    select.innerHTML = '<option value="">Todas</option>' +
        secciones.map(s => `<option value="${s}">${s}</option>`).join('');

    select.value = seccionActual; // mantiene la selección al recargar
}

function renderizarProductos() {
    const grilla = document.getElementById('grilla-productos');
    grilla.innerHTML = '';

    const seccionElegida = document.getElementById('filtro-seccion').value;
    const productosFiltrados = seccionElegida
        ? productosCache.filter(p => p.seccion === seccionElegida)
        : productosCache;

    for (const p of productosFiltrados) {
        const div = document.createElement('div');
        div.className = 'tarjeta-producto';
        const disponible = p.stock_actual > 0;
        const etiqueta = disponible ? 'disponible' : 'sin stock';
        const claseEstado = disponible ? 'estado-activo' : 'estado-sin_stock';

        div.innerHTML = `
      <h3>${p.nombre}</h3>
      ${p.seccion ? `<span class="seccion-tag">${p.seccion}</span>` : ''}
      <p class="descripcion">${p.descripcion || 'Sin descripción'}</p>
      <div class="detalle"><span>Stock:</span><span>${p.stock_actual}</span></div>
      <div class="detalle"><span>Precio venta:</span><span>${formatearPrecio(p.precio_venta)}</span></div>
      ${p.precio_venta_mayor ? `<div class="detalle"><span>Precio mayorista:</span><span>${formatearPrecio(p.precio_venta_mayor)}</span></div>` : ''}
      <div class="detalle"><span>Disponibilidad:</span><span class="${claseEstado}">${etiqueta}</span></div>
      <div class="acciones-tarjeta">
        <button class="btn-secundario" onclick="abrirEditarProducto(${p.id})">Editar</button>
        <button class="btn-secundario" onclick="reponerStock(${p.id})">+ Reponer</button>
        <button class="btn-peligro" onclick="eliminarProducto(${p.id})">Eliminar</button>
      </div>
    `;
        grilla.appendChild(div);
    }
}

const modalProveedores = document.getElementById('modal-proveedores');

document.getElementById('btn-ver-proveedores').addEventListener('click', () => {
    renderizarProveedores();
    modalProveedores.classList.remove('hidden');
});

document.getElementById('btn-cerrar-proveedores').addEventListener('click', () => {
    modalProveedores.classList.add('hidden');
});

function renderizarProveedores() {
    const contenedor = document.getElementById('lista-proveedores');

    const proveedores = {};
    for (const p of productosCache) {
        if (!p.proveedor) continue;
        if (!proveedores[p.proveedor]) proveedores[p.proveedor] = [];
        proveedores[p.proveedor].push(p.nombre);
    }

    const nombres = Object.keys(proveedores).sort();

    if (nombres.length === 0) {
        contenedor.innerHTML = '<p>Todavía no cargaste ningún proveedor.</p>';
        return;
    }

    contenedor.innerHTML = nombres.map(nombre => `
    <div class="proveedor-item">
      <h4>${nombre}</h4>
      <ul>
        ${proveedores[nombre].map(prod => `<li>${prod}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}

async function reponerStock(id) {
    const cantidad = prompt('¿Cuántas unidades querés agregar al stock?');
    if (cantidad === null) return; // canceló

    const numero = Number(cantidad);
    if (!numero || numero <= 0) {
        alert('Ingresá un número mayor a 0');
        return;
    }

    await fetch(`${API}/productos/${id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: numero }),
    });
    cargarProductos();
}

async function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
    await fetch(`${API}/productos/${id}`, { method: 'DELETE' });
    cargarProductos();
}

// ---------- MODAL PRODUCTO ----------
const modalProducto = document.getElementById('modal-producto');
const formProducto = document.getElementById('form-producto');

document.getElementById('btn-nuevo-producto').addEventListener('click', () => {
    formProducto.reset();
    document.getElementById('producto-id').value = '';
    document.getElementById('modal-producto-titulo').textContent = 'Nuevo producto';
    modalProducto.classList.remove('hidden');
});

document.getElementById('btn-cancelar-producto').addEventListener('click', () => {
    modalProducto.classList.add('hidden');
});

function abrirEditarProducto(id) {
    const p = productosCache.find(x => x.id === id);
    if (!p) return;

    document.getElementById('producto-id').value = p.id;
    document.getElementById('producto-nombre').value = p.nombre;
    document.getElementById('producto-descripcion').value = p.descripcion || '';
    document.getElementById('producto-stock').value = p.stock_actual;
    document.getElementById('producto-precio-compra').value = p.precio_compra;
    document.getElementById('producto-precio-venta').value = p.precio_venta;
    document.getElementById('producto-precio-venta-mayor').value = p.precio_venta_mayor || '';
    document.getElementById('producto-proveedor').value = p.proveedor || '';
    document.getElementById('producto-seccion').value = p.seccion || '';
    document.getElementById('modal-producto-titulo').textContent = 'Editar producto';
    modalProducto.classList.remove('hidden');
}

formProducto.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('producto-id').value;
    const datos = {
        nombre: document.getElementById('producto-nombre').value,
        descripcion: document.getElementById('producto-descripcion').value || null,
        stock_actual: Number(document.getElementById('producto-stock').value),
        precio_compra: Number(document.getElementById('producto-precio-compra').value),
        precio_venta: Number(document.getElementById('producto-precio-venta').value),
        precio_venta_mayor: document.getElementById('producto-precio-venta-mayor').value
            ? Number(document.getElementById('producto-precio-venta-mayor').value)
            : null,
        proveedor: document.getElementById('producto-proveedor').value || null,
        seccion: document.getElementById('producto-seccion').value || null,
    };

    if (id) {
        await fetch(`${API}/productos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos),
        });
    } else {
        await fetch(`${API}/productos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos),
        });
    }

    modalProducto.classList.add('hidden');
    cargarProductos();
});

// ---------- PEDIDOS ----------
let pedidosCache = [];
let subEstadoPedidosActivo = 'pendiente';
let fechaFiltroActiva = '';
async function cargarPedidos() {
    const res = await fetch(`${API}/pedidos`);
    pedidosCache = await res.json();
    renderizarPedidos();
}

function renderizarPedidos() {
    const tbody = document.getElementById('tabla-pedidos');
    tbody.innerHTML = '';

    const pedidosFiltrados = pedidosCache.filter(p => {
        const coincideEstado = subEstadoPedidosActivo === 'realizado'
            ? (p.estado === 'confirmado' || p.estado === 'vendido')
            : p.estado === subEstadoPedidosActivo;

        const coincideFecha = fechaFiltroActiva
            ? fechaLocalISO(p.fecha) === fechaFiltroActiva
            : true;

        return coincideEstado && coincideFecha;
    });

    for (const p of pedidosFiltrados) {
        const tr = document.createElement('tr');
        const esPendiente = p.estado === 'pendiente';

        const iniciales = p.metodo_pago === 'transferencia'
            ? `Transf. (${p.destinatario === 'elias' ? 'E' : 'L'})`
            : 'Efectivo';

        tr.innerHTML = `
      <td>${esPendiente ? `<input type="checkbox" onchange="marcarComoRealizado(${p.id})">` : ''}</td>
      <td>${p.nombre_cliente}</td>
      <td>${formatearFecha(p.fecha)}</td>
      <td>${formatearPrecio(p.total)}</td>
      <td>${iniciales}</td>
      <td class="estado-${p.estado}">${p.estado}</td>
      <td class="acciones-cell">
      
        <a href="${API}/pedidos/${p.id}/boleta" target="_blank">
          <button class="btn-secundario" type="button">Boleta</button>
        </a>
        ${esPendiente ? `<button class="btn-peligro" onclick="cancelarPedido(${p.id})">Cancelar</button>` : ''}
      </td>
    `;
        tbody.appendChild(tr);
    }

    actualizarGananciaDia();
}

function actualizarGananciaDia() {
    const span = document.getElementById('ganancia-dia');

    if (!fechaFiltroActiva) {
        span.textContent = '';
        return;
    }

    const pedidosDelDia = pedidosCache.filter(p =>
        fechaLocalISO(p.fecha) === fechaFiltroActiva &&
        (p.estado === 'confirmado' || p.estado === 'vendido')
    );
    
    const total = pedidosDelDia.reduce((acc, p) => acc + Number(p.total), 0);

    const totalElias = pedidosDelDia
        .filter(p => p.destinatario === 'elias')
        .reduce((acc, p) => acc + Number(p.total), 0);

    const totalLudmila = pedidosDelDia
        .filter(p => p.destinatario === 'ludmila')
        .reduce((acc, p) => acc + Number(p.total), 0);

    span.textContent =
        `Ganancia del día: ${formatearPrecio(total)} ` +
        `(Elías: ${formatearPrecio(totalElias)}, Ludmila: ${formatearPrecio(totalLudmila)})`;
}

async function cancelarPedido(id) {
    if (!confirm('¿Cancelar este pedido? Se devolverá el stock.')) return;
    await fetch(`${API}/pedidos/${id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'cancelado' }),
    });
    cargarPedidos();
    cargarProductos(); // el stock cambió, refrescamos también esta tabla
}

async function marcarComoRealizado(id) {
    await fetch(`${API}/pedidos/${id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'vendido' }),
    });
    cargarPedidos();
}

// ---------- MODAL PEDIDO ----------
const modalPedido = document.getElementById('modal-pedido');
const formPedido = document.getElementById('form-pedido');
const itemsContainer = document.getElementById('pedido-items');

document.getElementById('btn-nuevo-pedido').addEventListener('click', () => {
    formPedido.reset();
    itemsContainer.innerHTML = '';
    document.getElementById('label-destinatario').classList.add('hidden');
    agregarItemPedido();
    modalPedido.classList.remove('hidden');
});

document.getElementById('btn-cancelar-pedido').addEventListener('click', () => {
    modalPedido.classList.add('hidden');
});

document.getElementById('btn-agregar-item').addEventListener('click', agregarItemPedido);

function agregarItemPedido() {
    const div = document.createElement('div');
    div.className = 'item-pedido';

    const opciones = productosCache
        .map(p => {
            const noDisponible = p.stock_actual <= 0;
            return `<option value="${p.id}" ${noDisponible ? 'disabled' : ''}>
        ${p.nombre} ${noDisponible ? '(sin stock)' : ''}
      </option>`;
        })
        .join('');

    div.innerHTML = `
    <select class="item-producto">${opciones}</select>
    <input type="number" class="item-cantidad" min="1" value="1">
    <label class="checkbox-mayor"><input type="checkbox" class="item-es-mayor"> ¿Mayor?</label>
    <button type="button" class="btn-peligro" onclick="this.parentElement.remove()">×</button>
  `;

    itemsContainer.appendChild(div);
}

formPedido.addEventListener('submit', async (e) => {
    e.preventDefault();

    const metodo_pago = document.getElementById('pedido-metodo-pago').value;
    const destinatario = document.getElementById('pedido-destinatario').value;

    if (!metodo_pago) {
        alert('Elegí un método de pago');
        return;
    }
    if (metodo_pago === 'transferencia' && !destinatario) {
        alert('Elegí el destinatario de la transferencia');
        return;
    }

    const items = Array.from(itemsContainer.querySelectorAll('.item-pedido')).map(div => ({
        producto_id: Number(div.querySelector('.item-producto').value),
        cantidad: Number(div.querySelector('.item-cantidad').value),
        es_mayor: div.querySelector('.item-es-mayor').checked,
    }));

    const datos = {
        nombre_cliente: document.getElementById('pedido-cliente').value,
        direccion: document.getElementById('pedido-direccion').value || null,
        contacto: document.getElementById('pedido-contacto').value || null,
        metodo_pago,
        destinatario: destinatario || null,
        items,
    };

    const res = await fetch(`${API}/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });

    if (!res.ok) {
        const error = await res.json();
        alert(`Error: ${error.error}`);
        return;
    }

    modalPedido.classList.add('hidden');
    cargarPedidos();
    cargarProductos(); // el stock cambió
});

document.querySelectorAll('.subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        subEstadoPedidosActivo = btn.dataset.substate;
        renderizarPedidos();
    });
});


document.getElementById('filtro-fecha').addEventListener('change', (e) => {
    fechaFiltroActiva = e.target.value;
    renderizarPedidos();
});

document.getElementById('btn-limpiar-fecha').addEventListener('click', () => {
    fechaFiltroActiva = '';
    document.getElementById('filtro-fecha').value = '';
    renderizarPedidos();
});

document.getElementById('pedido-metodo-pago').addEventListener('change', (e) => {
    const labelDestinatario = document.getElementById('label-destinatario');
    if (e.target.value === 'transferencia') {
        labelDestinatario.classList.remove('hidden');
    } else {
        labelDestinatario.classList.add('hidden');
        document.getElementById('pedido-destinatario').value = '';
    }
});