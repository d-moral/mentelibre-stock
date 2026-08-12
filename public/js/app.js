const API = '/api';

// ---------- TABS ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

        if (btn.dataset.tab === 'clientes') {
            cargarClientes();
        }
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

// ---------- PAGINACIÓN ----------
const TAM_PAGINA = 10;

function paginar(items, paginaActual) {
    const totalPaginas = Math.max(1, Math.ceil(items.length / TAM_PAGINA));
    const paginaValida = Math.min(Math.max(1, paginaActual), totalPaginas);
    const inicio = (paginaValida - 1) * TAM_PAGINA;
    return {
        pagina: paginaValida,
        totalPaginas,
        itemsPagina: items.slice(inicio, inicio + TAM_PAGINA),
    };
}

function renderizarControlesPaginacion(contenedorId, pagina, totalPaginas, nombreFuncionCambio) {
    const contenedor = document.getElementById(contenedorId);
    if (totalPaginas <= 1) {
        contenedor.innerHTML = '';
        return;
    }

    contenedor.innerHTML = `
    <button type="button" class="btn-secundario" ${pagina <= 1 ? 'disabled' : ''} onclick="${nombreFuncionCambio}(${pagina - 1})">‹ Anterior</button>
    <span class="paginacion-info">Página ${pagina} de ${totalPaginas}</span>
    <button type="button" class="btn-secundario" ${pagina >= totalPaginas ? 'disabled' : ''} onclick="${nombreFuncionCambio}(${pagina + 1})">Siguiente ›</button>
  `;
}

// ---------- CARGA INICIAL ----------
window.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    cargarPedidos();
    cargarSets();
    cargarClientes();
});

// ---------- PRODUCTOS ----------
let productosCache = [];
let paginaProductos = 1;

document.getElementById('filtro-seccion').addEventListener('change', () => {
    paginaProductos = 1;
    renderizarProductos();
});

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

    select.value = seccionActual;
}

function renderizarProductos() {
    const tbody = document.getElementById('tabla-productos');
    tbody.innerHTML = '';

    const seccionElegida = document.getElementById('filtro-seccion').value;
    const productosFiltrados = seccionElegida
        ? productosCache.filter(p => p.seccion === seccionElegida)
        : productosCache;

    const { pagina, totalPaginas, itemsPagina } = paginar(productosFiltrados, paginaProductos);
    paginaProductos = pagina;

    for (const p of itemsPagina) {
        const tr = document.createElement('tr');
        tr.dataset.productoId = p.id;
        const disponible = p.stock_actual > 0;
        const etiqueta = disponible ? 'disponible' : 'sin stock';
        const claseEstado = disponible ? 'estado-activo' : 'estado-sin_stock';

        tr.innerHTML = `
      <td>${p.nombre}</td>
      <td>${p.seccion || '-'}</td>
      <td>${p.stock_actual}</td>
      <td>${formatearPrecio(p.precio_venta)}</td>
      <td>${p.precio_venta_mayor ? formatearPrecio(p.precio_venta_mayor) : '-'}</td>
      <td class="${claseEstado}">${etiqueta}</td>
      <td class="acciones-cell">
        <button class="btn-secundario" onclick="abrirEditarProducto(${p.id})">Editar</button>
        <button class="btn-secundario" onclick="reponerStock(${p.id})">+ Reponer</button>
        <button class="btn-peligro" onclick="eliminarProducto(${p.id})">Eliminar</button>
        <button class="btn-secundario" onclick="toggleDetalleProducto(${p.id})">⋮</button>
      </td>
    `;
        tbody.appendChild(tr);
    }

    renderizarControlesPaginacion('paginacion-productos', pagina, totalPaginas, 'cambiarPaginaProductos');
}

function cambiarPaginaProductos(nuevaPagina) {
    paginaProductos = nuevaPagina;
    renderizarProductos();
}

function toggleDetalleProducto(id) {
    const filaExistente = document.getElementById(`detalle-producto-${id}`);
    if (filaExistente) {
        filaExistente.remove();
        return;
    }

    document.querySelectorAll('.fila-detalle-producto').forEach(f => f.remove());

    const p = productosCache.find(x => x.id === id);
    const filaProducto = document.querySelector(`tr[data-producto-id="${id}"]`);
    if (!p || !filaProducto) return;

    const filaDetalle = document.createElement('tr');
    filaDetalle.id = `detalle-producto-${id}`;
    filaDetalle.className = 'fila-detalle-producto';
    filaDetalle.innerHTML = `
    <td colspan="7">
      <p class="detalle-descripcion">${p.descripcion || 'Sin descripción'}</p>
    </td>
  `;

    filaProducto.insertAdjacentElement('afterend', filaDetalle);
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
    if (cantidad === null) return;

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
        nombre: document.getElementById('producto-nombre').value.trim(),
        descripcion: document.getElementById('producto-descripcion').value.trim() || null,
        stock_actual: Number(document.getElementById('producto-stock').value),
        precio_compra: Number(document.getElementById('producto-precio-compra').value),
        precio_venta: Number(document.getElementById('producto-precio-venta').value),
        precio_venta_mayor: document.getElementById('producto-precio-venta-mayor').value
            ? Number(document.getElementById('producto-precio-venta-mayor').value)
            : null,
        proveedor: document.getElementById('producto-proveedor').value.trim() || null,
        seccion: document.getElementById('producto-seccion').value.trim() || null,
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
let paginaPedidos = 1;

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

    const { pagina, totalPaginas, itemsPagina } = paginar(pedidosFiltrados, paginaPedidos);
    paginaPedidos = pagina;

    for (const p of itemsPagina) {
        const tr = document.createElement('tr');
        const esPendiente = p.estado === 'pendiente';

        const iniciales = p.metodo_pago === 'transferencia'
            ? `Transf. (${p.destinatario === 'elias' ? 'E' : 'L'})`
            : 'Efectivo';

        const esRealizado = p.estado === 'confirmado' || p.estado === 'vendido';
        const esCancelado = p.estado === 'cancelado';
        tr.dataset.pedidoId = p.id;

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
        ${(esRealizado || esCancelado) ? `<button class="btn-secundario" onclick="toggleDetallePedido(${p.id})">⋮</button>` : ''}
      </td>
    `;
        tbody.appendChild(tr);
    }

    renderizarControlesPaginacion('paginacion-pedidos', pagina, totalPaginas, 'cambiarPaginaPedidos');
    actualizarGananciaDia();
}

function cambiarPaginaPedidos(nuevaPagina) {
    paginaPedidos = nuevaPagina;
    renderizarPedidos();
}

async function toggleDetallePedido(id) {
    const filaExistente = document.getElementById(`detalle-pedido-${id}`);
    if (filaExistente) {
        filaExistente.remove();
        return;
    }

    document.querySelectorAll('.fila-detalle-pedido').forEach(f => f.remove());

    const filaPedido = document.querySelector(`tr[data-pedido-id="${id}"]`);
    if (!filaPedido) return;

    const res = await fetch(`${API}/pedidos/${id}`);
    const pedido = await res.json();
    const esCancelado = pedido.estado === 'cancelado';

    const filasItems = pedido.items.map(item => {
        const etiqueta = item.set_id ? `${item.set_nombre} (set)` : item.producto_nombre;

        if (esCancelado) {
            return `<tr>
        <td>${etiqueta}</td>
        <td>${item.cantidad}</td>
      </tr>`;
        }

        const ganancia = (Number(item.precio_unitario) - Number(item.precio_compra_unitario)) * item.cantidad;
        return `<tr>
      <td>${etiqueta}</td>
      <td>${item.cantidad}</td>
      <td>${formatearPrecio(ganancia)}</td>
    </tr>`;
    }).join('');

    const encabezado = esCancelado
        ? '<tr><th>Producto</th><th>Cant. cancelada</th></tr>'
        : '<tr><th>Producto</th><th>Cant.</th><th>Ganancia</th></tr>';

    const filaDetalle = document.createElement('tr');
    filaDetalle.id = `detalle-pedido-${id}`;
    filaDetalle.className = 'fila-detalle-pedido';
    filaDetalle.innerHTML = `
    <td colspan="7">
      <table class="detalle-ganancia-items">
        <thead>${encabezado}</thead>
        <tbody>${filasItems}</tbody>
      </table>
    </td>
  `;

    filaPedido.insertAdjacentElement('afterend', filaDetalle);
}

function actualizarGananciaDia() {
    const tarjeta = document.getElementById('tarjeta-ganancia');

    if (!fechaFiltroActiva) {
        tarjeta.classList.add('hidden');
        return;
    }

    const pedidosDelDia = pedidosCache.filter(p =>
        fechaLocalISO(p.fecha) === fechaFiltroActiva &&
        (p.estado === 'confirmado' || p.estado === 'vendido')
    );

    const total = pedidosDelDia.reduce((acc, p) => acc + Number(p.total), 0);
    const gananciaReal = pedidosDelDia.reduce((acc, p) => acc + Number(p.ganancia_real), 0);

    const totalElias = pedidosDelDia
        .filter(p => p.destinatario === 'elias')
        .reduce((acc, p) => acc + Number(p.total), 0);

    const totalLudmila = pedidosDelDia
        .filter(p => p.destinatario === 'ludmila')
        .reduce((acc, p) => acc + Number(p.total), 0);

    document.getElementById('ganancia-total-valor').textContent = formatearPrecio(total);
    document.getElementById('ganancia-real-valor').textContent = formatearPrecio(gananciaReal);
    document.getElementById('ganancia-elias-valor').textContent = formatearPrecio(totalElias);
    document.getElementById('ganancia-ludmila-valor').textContent = formatearPrecio(totalLudmila);

    tarjeta.classList.remove('hidden');
}

async function cancelarPedido(id) {
    if (!confirm('¿Cancelar este pedido? Se devolverá el stock.')) return;
    await fetch(`${API}/pedidos/${id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'cancelado' }),
    });
    cargarPedidos();
    cargarSets();
    cargarProductos();
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
const itemsComboContainer = document.getElementById('pedido-items-combos');

document.getElementById('btn-nuevo-pedido').addEventListener('click', () => {
    formPedido.reset();
    itemsContainer.innerHTML = '';
    itemsComboContainer.innerHTML = '';
    document.getElementById('label-destinatario').classList.add('hidden');
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

document.getElementById('btn-agregar-item-combo').addEventListener('click', agregarItemCombo);

function agregarItemCombo() {
    const combosDisponibles = setsCache.filter(s => s.activo);

    if (combosDisponibles.length === 0) {
        alert('Todavía no tenés sets armados');
        return;
    }

    const div = document.createElement('div');
    div.className = 'item-pedido item-combo';

    const opciones = combosDisponibles
        .map(s => {
            const noDisponible = s.stock_actual <= 0;
            return `<option value="${s.id}" ${noDisponible ? 'disabled' : ''}>
        ${s.nombre} ${noDisponible ? '(sin stock)' : ''}
      </option>`;
        })
        .join('');

    div.innerHTML = `
    <select class="item-combo-set">${opciones}</select>
    <input type="number" class="item-combo-cantidad" min="1" value="1">
    <label class="checkbox-mayor"><input type="checkbox" class="item-combo-es-mayor"> ¿Mayor?</label>
    <button type="button" class="btn-peligro" onclick="this.parentElement.remove()">×</button>
  `;

    itemsComboContainer.appendChild(div);
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

    const itemsProductos = Array.from(itemsContainer.querySelectorAll('.item-pedido')).map(div => ({
        producto_id: Number(div.querySelector('.item-producto').value),
        cantidad: Number(div.querySelector('.item-cantidad').value),
        es_mayor: div.querySelector('.item-es-mayor').checked,
    }));

    const itemsCombos = Array.from(itemsComboContainer.querySelectorAll('.item-combo')).map(div => ({
        set_id: Number(div.querySelector('.item-combo-set').value),
        cantidad: Number(div.querySelector('.item-combo-cantidad').value),
        es_mayor: div.querySelector('.item-combo-es-mayor').checked,
    }));

    const items = [...itemsProductos, ...itemsCombos];

    if (items.length === 0) {
        alert('Agregá al menos un producto o un combo');
        return;
    }

    const datos = {
        dni: document.getElementById('pedido-dni').value.trim(),
        nombre_cliente: document.getElementById('pedido-cliente').value.trim(),
        direccion: document.getElementById('pedido-direccion').value.trim() || null,
        contacto: document.getElementById('pedido-contacto').value.trim() || null,
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
    cargarSets();
    cargarProductos();
});

document.querySelectorAll('.subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        subEstadoPedidosActivo = btn.dataset.substate;
        paginaPedidos = 1;
        renderizarPedidos();
    });
});

document.getElementById('filtro-fecha').addEventListener('change', (e) => {
    fechaFiltroActiva = e.target.value;
    paginaPedidos = 1;
    renderizarPedidos();
});

document.getElementById('btn-limpiar-fecha').addEventListener('click', () => {
    fechaFiltroActiva = '';
    document.getElementById('filtro-fecha').value = '';
    paginaPedidos = 1;
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

// ---------- COMBOS ----------
let setsCache = [];
let paginaSets = 1;

async function cargarSets() {
    const res = await fetch(`${API}/sets`);
    setsCache = await res.json();
    renderizarSets();
}

function renderizarSets() {
    const tbody = document.getElementById('tabla-sets');
    tbody.innerHTML = '';

    const setsActivos = setsCache.filter(s => s.activo);
    const { pagina, totalPaginas, itemsPagina } = paginar(setsActivos, paginaSets);
    paginaSets = pagina;

    for (const s of itemsPagina) {
        const tr = document.createElement('tr');
        tr.dataset.setId = s.id;
        const disponible = s.stock_actual > 0;
        const etiqueta = disponible ? 'disponible' : 'sin stock';
        const claseEstado = disponible ? 'estado-activo' : 'estado-sin_stock';

        tr.innerHTML = `
      <td>${s.nombre}</td>
      <td>${s.stock_actual}</td>
      <td>${formatearPrecio(s.precio_venta)}</td>
      <td>${s.precio_venta_mayor ? formatearPrecio(s.precio_venta_mayor) : '-'}</td>
      <td class="${claseEstado}">${etiqueta}</td>
      <td class="acciones-cell">
        <button class="btn-secundario" onclick="abrirEditarSet(${s.id})">Editar</button>
        <button class="btn-secundario" onclick="reponerStockSet(${s.id})">+ Reponer</button>
        <button class="btn-peligro" onclick="cancelarSet(${s.id})">Eliminar</button>
        <button class="btn-secundario" onclick="toggleDetalleSet(${s.id})">⋮</button>
      </td>
    `;
        tbody.appendChild(tr);
    }

    renderizarControlesPaginacion('paginacion-sets', pagina, totalPaginas, 'cambiarPaginaSets');
}

function cambiarPaginaSets(nuevaPagina) {
    paginaSets = nuevaPagina;
    renderizarSets();
}

async function toggleDetalleSet(id) {
    const filaExistente = document.getElementById(`detalle-set-${id}`);
    if (filaExistente) {
        filaExistente.remove();
        return;
    }

    document.querySelectorAll('.fila-detalle-set').forEach(f => f.remove());

    const filaSet = document.querySelector(`tr[data-set-id="${id}"]`);
    if (!filaSet) return;

    const res = await fetch(`${API}/sets/${id}`);
    const set = await res.json();

    const filasComponentes = (set.items || []).map(item => `
        <tr>
          <td>${item.producto_nombre}</td>
          <td>${item.cantidad}</td>
        </tr>
      `).join('');

    const filaDetalle = document.createElement('tr');
    filaDetalle.id = `detalle-set-${id}`;
    filaDetalle.className = 'fila-detalle-set';
    filaDetalle.innerHTML = `
    <td colspan="6">
      <p class="detalle-descripcion">${set.descripcion || 'Sin descripción'}</p>
      <table class="detalle-ganancia-items">
        <thead><tr><th>Producto</th><th>Cant.</th></tr></thead>
        <tbody>${filasComponentes}</tbody>
      </table>
    </td>
  `;

    filaSet.insertAdjacentElement('afterend', filaDetalle);
}

async function cancelarSet(id) {
    if (!confirm('¿Cancelar este set? El stock sin vender vuelve a los productos que lo componen.')) return;

    const res = await fetch(`${API}/sets/${id}/cancelar`, { method: 'PATCH' });
    if (!res.ok) {
        const error = await res.json();
        alert(`Error: ${error.error}`);
        return;
    }

    cargarSets();
    cargarProductos();
}

async function reponerStockSet(id) {
    const cantidad = prompt('¿Cuántas unidades querés agregar al stock del set?');
    if (cantidad === null) return;

    const numero = Number(cantidad);
    if (!numero || numero <= 0) {
        alert('Ingresá un número mayor a 0');
        return;
    }

    const res = await fetch(`${API}/sets/${id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: numero }),
    });

    if (!res.ok) {
        const error = await res.json();
        alert(`Error: ${error.error}`);
        return;
    }

    cargarSets();
    cargarProductos();
}

// ---------- MODAL COMBO ----------
const modalSet = document.getElementById('modal-set');
const formSet = document.getElementById('form-set');
const setItemsContainer = document.getElementById('set-items');

document.getElementById('btn-nuevo-set').addEventListener('click', () => {
    formSet.reset();
    document.getElementById('set-id').value = '';
    document.getElementById('modal-set-titulo').textContent = 'Nuevo set';
    document.getElementById('label-set-cantidad-armar').classList.remove('hidden');
    document.getElementById('bloque-set-items').classList.remove('hidden');
    setItemsContainer.innerHTML = '';
    agregarSetItem();
    modalSet.classList.remove('hidden');
});

document.getElementById('btn-cancelar-set').addEventListener('click', () => {
    modalSet.classList.add('hidden');
});

document.getElementById('btn-agregar-set-item').addEventListener('click', agregarSetItem);

function agregarSetItem() {
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
    <select class="set-item-producto">${opciones}</select>
    <input type="number" class="set-item-cantidad" min="1" value="1">
    <button type="button" class="btn-peligro" onclick="this.parentElement.remove()">×</button>
  `;

    setItemsContainer.appendChild(div);
}

function abrirEditarSet(id) {
    const s = setsCache.find(x => x.id === id);
    if (!s) return;

    document.getElementById('set-id').value = s.id;
    document.getElementById('set-nombre').value = s.nombre;
    document.getElementById('set-descripcion').value = s.descripcion || '';
    document.getElementById('set-precio-venta').value = s.precio_venta;
    document.getElementById('set-precio-venta-mayor').value = s.precio_venta_mayor || '';
    document.getElementById('modal-set-titulo').textContent = 'Editar set';

    document.getElementById('label-set-cantidad-armar').classList.add('hidden');
    document.getElementById('bloque-set-items').classList.add('hidden');

    modalSet.classList.remove('hidden');
}

formSet.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('set-id').value;
    const precio_venta_mayor = document.getElementById('set-precio-venta-mayor').value
        ? Number(document.getElementById('set-precio-venta-mayor').value)
        : null;

    if (id) {
        const datos = {
            nombre: document.getElementById('set-nombre').value.trim(),
            descripcion: document.getElementById('set-descripcion').value.trim() || null,
            precio_venta: Number(document.getElementById('set-precio-venta').value),
            precio_venta_mayor,
        };

        const res = await fetch(`${API}/sets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos),
        });

        if (!res.ok) {
            const error = await res.json();
            alert(`Error: ${error.error}`);
            return;
        }
    } else {
        const items = Array.from(setItemsContainer.querySelectorAll('.item-pedido')).map(div => ({
            producto_id: Number(div.querySelector('.set-item-producto').value),
            cantidad: Number(div.querySelector('.set-item-cantidad').value),
        }));

        const datos = {
            nombre: document.getElementById('set-nombre').value.trim(),
            descripcion: document.getElementById('set-descripcion').value.trim() || null,
            precio_venta: Number(document.getElementById('set-precio-venta').value),
            precio_venta_mayor,
            cantidad_armar: Number(document.getElementById('set-cantidad-armar').value),
            items,
        };

        const res = await fetch(`${API}/sets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos),
        });

        if (!res.ok) {
            const error = await res.json();
            alert(`Error: ${error.error}`);
            return;
        }
    }

    modalSet.classList.add('hidden');
    cargarSets();
    cargarProductos();
});

// ---------- CLIENTES (AGENDA) ----------
let paginaClientes = 1;
let tipoClienteFiltro = '';

async function cargarClientes() {
    const inputBusqueda = document.getElementById('filtro-cliente-busqueda');
    const busqueda = inputBusqueda ? inputBusqueda.value.trim() : '';

    try {
        const res = await fetch(`${API}/clientes?pagina=${paginaClientes}&limite=10&busqueda=${encodeURIComponent(busqueda)}&tipo=${tipoClienteFiltro}`);
        if (!res.ok) return;

        const { datos, paginacion } = await res.json();
        renderizarClientes(datos, paginacion);
    } catch (err) {
        console.error('Error al cargar clientes:', err);
    }
}

function renderizarClientes(clientes, paginacion) {
    const tbody = document.getElementById('tabla-clientes');
    if (!tbody) return;
    tbody.innerHTML = '';

    for (const c of clientes) {
        const tr = document.createElement('tr');
        const pedidosTexto = c.total_pedidos === 1 ? '1 pedido' : `${c.total_pedidos || 0} pedidos`;

        tr.innerHTML = `
            <td>${c.dni || '-'}</td>
            <td>${c.nombre || '-'}</td>
            <td>${c.direccion || '-'}</td>
            <td>${c.telefono || '-'}</td>
            <td><span class="badge">${c.tipo_compra || 'Sin compras'}</span></td>
            <td><strong>${formatearPrecio(c.total_gastado)}</strong> <small style="color:#666;">(${pedidosTexto})</small></td>
            <td>
                <button class="btn-secundario btn-pedido-cliente" 
                        data-dni="${c.dni || ''}" 
                        data-nombre="${c.nombre || ''}" 
                        data-direccion="${c.direccion || ''}" 
                        data-telefono="${c.telefono || ''}">
                    + Nuevo Pedido
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    }

    renderizarControlesPaginacion('paginacion-clientes', paginacion.pagina, paginacion.totalPaginas, 'cambiarPaginaClientes');
}

function cambiarPaginaClientes(nuevaPagina) {
    paginaClientes = nuevaPagina;
    cargarClientes();
}

// Búsqueda en vivo
document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'filtro-cliente-busqueda') {
        paginaClientes = 1;
        cargarClientes();
    }
});

// Eventos de Subtabs (Todos / Por Mayor / Por Menor)
document.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('subtab-btn-cliente')) {
        document.querySelectorAll('.subtab-btn-cliente').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        tipoClienteFiltro = e.target.dataset.subtipo;
        paginaClientes = 1;
        cargarClientes();
    }

    // Botón "+ Nuevo Pedido" desde la Agenda
    if (e.target && e.target.classList.contains('btn-pedido-cliente')) {
        const { dni, nombre, direccion, telefono } = e.target.dataset;
        crearPedidoParaCliente(dni, nombre, direccion, telefono);
    }
});

function crearPedidoParaCliente(dni, nombre, direccion, contacto) {
    const modal = document.getElementById('modal-pedido');
    if (!modal) return;

    // Reinicia el formulario y limpia las listas de productos y combos
    formPedido.reset();
    itemsContainer.innerHTML = '';
    itemsComboContainer.innerHTML = '';
    document.getElementById('label-destinatario').classList.add('hidden');

    // Pre-completa los datos del cliente
    document.getElementById('pedido-dni').value = dni;
    document.getElementById('pedido-cliente').value = nombre;
    document.getElementById('pedido-direccion').value = direccion;
    document.getElementById('pedido-contacto').value = contacto;

    modal.classList.remove('hidden');
}