-- 1. Productos en stock
CREATE TABLE IF NOT EXISTS productos (
                                         id                  SERIAL PRIMARY KEY,
                                         nombre              VARCHAR(150) NOT NULL,
    descripcion         TEXT,
    stock_actual        INTEGER NOT NULL DEFAULT 0,
    precio_compra       NUMERIC(10,2) NOT NULL,
    precio_compra_mayor NUMERIC(10,2),
    precio_venta        NUMERIC(10,2) NOT NULL,
    precio_venta_mayor  NUMERIC(10,2),
    proveedor           VARCHAR(150),
    seccion             VARCHAR(100),
    creado_en           TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMP NOT NULL DEFAULT NOW()
    );

-- 2. Agenda de clientes
CREATE TABLE IF NOT EXISTS clientes (
                                        id              SERIAL PRIMARY KEY,
                                        dni             VARCHAR(20) NOT NULL UNIQUE,
    nombre          VARCHAR(150) NOT NULL,
    direccion       VARCHAR(255),
    telefono        VARCHAR(150),
    es_revendedor   BOOLEAN NOT NULL DEFAULT false,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMP NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_clientes_dni ON clientes(dni);

-- 3. Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
                                       id              SERIAL PRIMARY KEY,
                                       dni             VARCHAR(20) NOT NULL,
    nombre_cliente  VARCHAR(150) NOT NULL,
    direccion       VARCHAR(255),
    contacto        VARCHAR(150),
    fecha           TIMESTAMP NOT NULL DEFAULT NOW(),
    estado          VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    total           NUMERIC(10,2) NOT NULL DEFAULT 0,
    ganancia_real   NUMERIC(10,2) NOT NULL DEFAULT 0,
    metodo_pago     VARCHAR(20) NOT NULL DEFAULT 'efectivo',
    destinatario    VARCHAR(50),
    registrar_revendedor BOOLEAN NOT NULL DEFAULT false,
    cliente_id      INTEGER REFERENCES clientes(id) ON DELETE SET NULL
    );

CREATE INDEX IF NOT EXISTS idx_pedidos_dni ON pedidos(dni);

-- 4. Ítems del pedido
CREATE TABLE IF NOT EXISTS pedido_items (
                                            id                      SERIAL PRIMARY KEY,
                                            pedido_id               INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id             INTEGER REFERENCES productos(id) ON DELETE SET NULL,
    producto_nombre         VARCHAR(150) NOT NULL,
    cantidad                INTEGER NOT NULL,
    precio_unitario         NUMERIC(10,2) NOT NULL,
    precio_compra_unitario  NUMERIC(10,2) NOT NULL DEFAULT 0
    );

CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido_id ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_items_producto_id ON pedido_items(producto_id);

-- 5. Sets/Combos
CREATE TABLE IF NOT EXISTS sets (
                                    id                  SERIAL PRIMARY KEY,
                                    nombre              VARCHAR(150) NOT NULL,
    descripcion         TEXT,
    stock_actual        INTEGER NOT NULL DEFAULT 0,
    costo_unitario      NUMERIC(10,2) NOT NULL DEFAULT 0,
    precio_venta        NUMERIC(10,2) NOT NULL,
    precio_venta_mayor  NUMERIC(10,2),
    activo              BOOLEAN NOT NULL DEFAULT true,
    creado_en           TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMP NOT NULL DEFAULT NOW()
    );

-- 6. Composición de Sets
CREATE TABLE IF NOT EXISTS set_items (
                                         id           SERIAL PRIMARY KEY,
                                         set_id       INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
    producto_id  INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    cantidad     INTEGER NOT NULL
    );

CREATE INDEX IF NOT EXISTS idx_set_items_set_id ON set_items(set_id);
CREATE INDEX IF NOT EXISTS idx_set_items_producto_id ON set_items(producto_id);

-- 7. Modificaciones para compatibilidad de Sets en pedido_items
ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS set_id INTEGER REFERENCES sets(id) ON DELETE SET NULL;
ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS set_nombre VARCHAR(150);
ALTER TABLE pedido_items ALTER COLUMN producto_id DROP NOT NULL;
ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'minorista';


-- 8. Lotes de productos en detalle (dañados, precio propio)
CREATE TABLE IF NOT EXISTS productos_detalle (
                                                 id              SERIAL PRIMARY KEY,
                                                 producto_id     INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    cantidad        INTEGER NOT NULL,
    precio_venta    NUMERIC(10,2) NOT NULL,
    nota_dano       TEXT,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_productos_detalle_producto_id ON productos_detalle(producto_id);
ALTER TABLE productos_detalle ADD COLUMN IF NOT EXISTS precio_compra_unitario NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE productos_detalle ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'activo';
ALTER TABLE productos_detalle ADD COLUMN IF NOT EXISTS cantidad_original INTEGER;

-- 9. Ítems de pedido que provienen de un lote de detalle
ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS producto_detalle_id INTEGER REFERENCES productos_detalle(id) ON DELETE SET NULL;
ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS producto_detalle_nota TEXT;
ALTER TABLE productos_detalle ADD COLUMN IF NOT EXISTS nombre_personalizado VARCHAR(150);