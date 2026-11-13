# Mentelibre Stock

Sistema web de gestión de **stock, pedidos y clientes** para un mayorista chico. Permite controlar el inventario, armar pedidos (por mayor y por menor), generar boletas en PDF y ver cuánto se gana realmente después de descontar gastos.

## Funcionalidades

- **Stock de productos**: precios de compra y venta (minorista y mayorista), proveedor, sección y filtros por disponibilidad (todos, disponibles, sin stock, con detalle).
- **Pedidos**: ciclo de vida `pendiente → confirmado → vendido`, con opción de cancelar.
  - El stock se descuenta al crear el pedido y se **devuelve** al cancelarlo o editarlo.
  - Solo se pueden editar pedidos pendientes.
  - Pago en efectivo o transferencia.
- **Sets / combos**: packs armados con varios productos, con su propio stock, costo y precio.
- **Productos en detalle**: lotes aparte (por ejemplo, mercadería dañada) con precio y nota propios.
- **Clientes**: agenda por DNI, con distinción entre clientes por mayor, por menor y revendedores, e historial de compras.
- **Boletas en PDF** descargables por pedido.
- **Gastos operativos**: se descuentan para calcular la ganancia real.
- **Estadísticas**: productos más vendidos y rotación de stock.
- **Búsqueda global** de productos, clientes, sets y lotes.


## Estructura del proyecto

```
mentelibre-stock/
├── src/
│   ├── app.js              # Entrada de Express y montaje de rutas
│   ├── routes/             # Definición de endpoints
│   ├── controllers/        # Validación y manejo de requests
│   ├── models/             # Consultas SQL y lógica de negocio
│   ├── db/
│   │   ├── index.js        # Pool de conexión a PostgreSQL
│   │   ├── migrate.js      # Aplica schema.sql
│   │   └── schema.sql      # Esquema completo de la base
│   └── pdf/                # Generación de boletas
├── public/                 # Frontend (index.html, css/, js/, img/)
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Puesta en marcha

### Con Docker

```bash
cp .env.example .env     # y hay que editar DB_PASSWORD
docker compose up -d --build
```

La app queda en <http://localhost:3000>. En el primer arranque, Postgres crea las tablas automáticamente a partir de `src/db/schema.sql`.

### Sin Docker

Necesita Node.js 18+ y un PostgreSQL corriendo.

```bash
npm install
cp .env.example .env     # poné DB_HOST=localhost y tus credenciales
npm run migrate          # crea / actualiza las tablas
npm run dev              # modo desarrollo con recarga (o npm start)
```

### Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `DB_HOST` | Host de PostgreSQL (`db` en Docker, `localhost` sin Docker) | `db` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de la base | `stock_mayorista` |
| `DB_USER` | Usuario | `postgres` |
| `DB_PASSWORD` | Contraseña | `changeme` |

## Modelo de datos

- `productos`: inventario y precios.
- `clientes`: agenda (DNI único, flag de revendedor).
- `pedidos` y `pedido_items`: ventas, con precios y costos congelados al momento de la venta.
- `sets` y `set_items`: combos y su composición.
- `productos_detalle`: lotes de mercadería con precio propio.
- `gastos`: gastos operativos.

## Notas

- Las boletas toman el nombre y el contacto del negocio desde `src/pdf/boleta.js`, y el logo desde `src/pdf/assets/logo.png`.
- No hay autenticación: está pensado para uso interno o en red local. Si se expone a internet, conviene ponerlo detrás de un proxy con login.
- Nunca subas el archivo `.env` al repositorio (ya está en `.gitignore`).
