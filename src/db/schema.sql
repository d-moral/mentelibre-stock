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
    total           NUMERIC(10,2) NOT NULL DEFAULT 0
    metodo_pago     VARCHAR(20) NOT NULL DEFAULT 'efectivo', -- 'efectivo' | 'transferencia'
    destinatario    VARCHAR(50) -- 'elias' | 'ludmila', solo aplica si metodo_pago = 'transferencia'
    );
    );

CREATE TABLE IF NOT EXISTS pedido_items (
                                            id              SERIAL PRIMARY KEY,
                                            pedido_id       INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id     INTEGER REFERENCES productos(id) ON DELETE SET NULL,
    producto_nombre VARCHAR(150) NOT NULL,
    cantidad        INTEGER NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL
    );

CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido_id ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_items_producto_id ON pedido_items(producto_id);