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

// ---------- CARGA INICIAL ----------
window.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    cargarPedidos();
});

// ---------- PRODUCTOS ----------
let productosCache = [];

async function cargarProductos() {
    const res = await fetch(`${API}/productos`);
    productosCache = await res.json();
    renderizarProductos();
}

function renderizarProductos() {
    const tbody = document.getElementById('tabla-productos');
    tbody.innerHTML = '';

    for (const p of productosCache) {
        const tr = document.createElement('tr');
        const disponible = p.stock_actual > 0;
        const etiqueta = disponible ? 'disponible' : 'sin stock';
        const claseEstado = disponible ? 'estado-activo' : 'estado-sin_stock';

        tr.innerHTML = `
      <td>${p.nombre}</td>
      <td>${p.stock_actual}</td>
      <td>${formatearPrecio(p.precio_venta)}</td>
      <td class="${claseEstado}">${etiqueta}</td>
      <td class="acciones-cell">
        <button class="btn-secundario" onclick="abrirEditarProducto(${p.id})">Editar</button>
        <button class="btn-secundario" onclick="reponerStock(${p.id})">+ Reponer</button>
        <button class="btn-peligro" onclick="eliminarProducto(${p.id})">Eliminar</button>
      </td>
    `;
        tbody.appendChild(tr);
    }
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
    document.getElementById('producto-proveedor').value = p.proveedor || '';
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
        proveedor: document.getElementById('producto-proveedor').value || null,
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

async function cargarPedidos() {
    const res = await fetch(`${API}/pedidos`);
    pedidosCache = await res.json();
    renderizarPedidos();
}

function renderizarPedidos() {
    const tbody = document.getElementById('tabla-pedidos');
    tbody.innerHTML = '';

    for (const p of pedidosCache) {
        const tr = document.createElement('tr');
        const puedeCancel = p.estado !== 'cancelado';

        tr.innerHTML = `
      <td>${p.nombre_cliente}</td>
      <td>${formatearFecha(p.fecha)}</td>
      <td>${formatearPrecio(p.total)}</td>
      <td class="estado-${p.estado}">${p.estado}</td>
      <td class="acciones-cell">
        <a href="${API}/pedidos/${p.id}/boleta" target="_blank">
          <button class="btn-secundario" type="button">Boleta</button>
        </a>
        ${puedeCancel ? `<button class="btn-peligro" onclick="cancelarPedido(${p.id})">Cancelar</button>` : ''}
      </td>
    `;
        tbody.appendChild(tr);
    }
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

// ---------- MODAL PEDIDO ----------
const modalPedido = document.getElementById('modal-pedido');
const formPedido = document.getElementById('form-pedido');
const itemsContainer = document.getElementById('pedido-items');

document.getElementById('btn-nuevo-pedido').addEventListener('click', () => {
    formPedido.reset();
    itemsContainer.innerHTML = '';
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
    <button type="button" class="btn-peligro" onclick="this.parentElement.remove()">×</button>
  `;

    itemsContainer.appendChild(div);
}

formPedido.addEventListener('submit', async (e) => {
    e.preventDefault();

    const items = Array.from(itemsContainer.querySelectorAll('.item-pedido')).map(div => ({
        producto_id: Number(div.querySelector('.item-producto').value),
        cantidad: Number(div.querySelector('.item-cantidad').value),
    }));

    const datos = {
        nombre_cliente: document.getElementById('pedido-cliente').value,
        direccion: document.getElementById('pedido-direccion').value || null,
        contacto: document.getElementById('pedido-contacto').value || null,
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

