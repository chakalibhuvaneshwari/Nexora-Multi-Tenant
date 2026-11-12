
export const tenantSchema = `

-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
    role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS permissions (
    permission_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    permission_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 3. ROLE_PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
    employee_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    department VARCHAR(100),
    designation VARCHAR(100),
    employment_status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_employment_status
        CHECK (employment_status IN ('ACTIVE', 'INACTIVE'))
);

-- 5. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id BIGINT UNIQUE REFERENCES employees(employee_id) ON DELETE SET NULL,
    role_id BIGINT NOT NULL REFERENCES roles(role_id),
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    product_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_name VARCHAR(150) NOT NULL,
    sku VARCHAR(80) UNIQUE,
    description TEXT,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    product_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_product_status
        CHECK (product_status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

-- 7. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    customer_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. ORDER_HISTORY TABLE
CREATE TABLE IF NOT EXISTS order_history (
    order_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL REFERENCES customers(customer_id),
    order_status VARCHAR(30) NOT NULL DEFAULT 'PLACED',
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_order_status
        CHECK (
            order_status IN (
                'PLACED',
                'PROCESSED',
                'READY_TO_SHIP',
                'SHIPPED',
                'DELIVERED',
                'CANCELLED'
            )
        )
);

-- 9. ORDER_ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES order_history(order_id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(product_id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

-- INDEXES FOR FREQUENT DATABASE QUERIES
CREATE INDEX IF NOT EXISTS idx_users_role_id
    ON users(role_id);

CREATE INDEX IF NOT EXISTS idx_order_customer_id
    ON order_history(customer_id);

CREATE INDEX IF NOT EXISTS idx_order_status
    ON order_history(order_status);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
    ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_products_status
    ON products(product_status);

-- INSERT DEFAULT ROLES
INSERT INTO roles (role_name, description)
VALUES
    ('SUPER_ADMIN', 'Full organization administration access'),
    ('INVENTORY_MANAGER', 'Manages products and inventory'),
    ('ACCOUNT_MANAGER', 'Manages order history and order status')
ON CONFLICT (role_name) DO NOTHING;

-- INSERT DEFAULT PERMISSIONS
INSERT INTO permissions (permission_name, description)
VALUES
    ('products.create', 'Create products'),
    ('products.read', 'View products'),
    ('products.update', 'Update products'),
    ('products.delete', 'Delete products'),
    ('products.publish', 'Publish products'),
    ('orders.read', 'View order history'),
    ('orders.update', 'Update order status'),
    ('employees.manage', 'Manage employees'),
    ('roles.manage', 'Assign and manage roles'),
    ('subscription.manage', 'Manage organization subscription')
ON CONFLICT (permission_name) DO NOTHING;

-- SUPER ADMIN: ALL PERMISSIONS
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

-- INVENTORY MANAGER: PRODUCT MANAGEMENT + ORDER READING
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'INVENTORY_MANAGER'
AND p.permission_name IN (
    'products.create',
    'products.read',
    'products.update',
    'products.delete',
    'products.publish',
    'orders.read'
)
ON CONFLICT DO NOTHING;

-- ACCOUNT MANAGER: ORDER MANAGEMENT
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'ACCOUNT_MANAGER'
AND p.permission_name IN (
    'orders.read',
    'orders.update'
)
ON CONFLICT DO NOTHING;

`;
