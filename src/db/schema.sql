-- Productos en stock
CREATE TABLE IF NOT EXISTS productos (
                                         id                      SERIAL PRIMARY KEY,
                                         nombre                  VARCHAR(150) NOT NULL,
    descripcion             TEXT,
    stock_actual            INTEGER NOT NULL DEFAULT 0,
    precio_compra           NUMERIC(10,2) NOT NULL,
    precio_compra_mayor     NUMERIC(10,2),
    precio_venta            NUMERIC(10,2) NOT NULL,
    precio_venta_mayor      NUMERIC(10,2),
    proveedor               VARCHAR(150),
    seccion                  VARCHAR(100),
    creado_en               TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en          TIMESTAMP NOT NULL DEFAULT NOW()
    );

-- Cabecera de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
                                       id              SERIAL PRIMARY KEY,
                                       nombre_cliente  VARCHAR(150) NOT NULL,
    direccion       VARCHAR(255),
    contacto        VARCHAR(150),
    fecha           TIMESTAMP NOT NULL DEFAULT NOW(),
    estado          VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- 'pendiente' | 'confirmado' | 'vendido' | 'cancelado'
    total           NUMERIC(10,2) NOT NULL DEFAULT 0,
    ganancia_real   NUMERIC(10,2) NOT NULL DEFAULT 0,
    metodo_pago     VARCHAR(20) NOT NULL DEFAULT 'efectivo', -- 'efectivo' | 'transferencia'
    destinatario    VARCHAR(50) -- 'elias' | 'ludmila', solo aplica si metodo_pago = 'transferencia'
    );

CREATE TABLE IF NOT EXISTS pedido_items (
                                            id              SERIAL PRIMARY KEY,
                                            pedido_id       INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id     INTEGER REFERENCES productos(id) ON DELETE SET NULL,
    producto_nombre VARCHAR(150) NOT NULL,
    cantidad        INTEGER NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL,
    precio_compra_unitario   NUMERIC(10,2) NOT NULL DEFAULT 0
    );

CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido_id ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_items_producto_id ON pedido_items(producto_id);

-- Combos: tienen stock propio (se arma desde el stock de los productos componentes)
CREATE TABLE IF NOT EXISTS sets (
                                    id                  SERIAL PRIMARY KEY,
                                    nombre              VARCHAR(150) NOT NULL,
    descripcion         TEXT,
    stock_actual        INTEGER NOT NULL DEFAULT 0,
    costo_unitario      NUMERIC(10,2) NOT NULL DEFAULT 0, -- snapshot: costo de armar 1 combo, sumando sus componentes
    precio_venta        NUMERIC(10,2) NOT NULL,
    precio_venta_mayor  NUMERIC(10,2),
    activo              BOOLEAN NOT NULL DEFAULT true,
    creado_en           TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMP NOT NULL DEFAULT NOW()
    );

-- Composición: qué productos y en qué cantidad forman cada combo
CREATE TABLE IF NOT EXISTS set_items (
                                         id           SERIAL PRIMARY KEY,
                                         set_id       INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
    producto_id  INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    cantidad     INTEGER NOT NULL
    );

CREATE INDEX IF NOT EXISTS idx_set_items_set_id ON set_items(set_id);
CREATE INDEX IF NOT EXISTS idx_set_items_producto_id ON set_items(producto_id);

-- pedido_items ahora puede referenciar un producto suelto O un combo
ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS set_id INTEGER REFERENCES sets(id) ON DELETE SET NULL;
ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS set_nombre VARCHAR(150);
ALTER TABLE pedido_items ALTER COLUMN producto_id DROP NOT NULL;
ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'minorista';