
const {
    mysqlTable,
    serial,
    varchar,
    int,
    timestamp,
    json,
    boolean,
    text,
    double
} = require('drizzle-orm/mysql-core');
const { relations, sql } = require('drizzle-orm');

// Users Table
const users = mysqlTable('users', {
    id: varchar('id', { length: 36 }).primaryKey(), // UUID
    name: varchar('name', { length: 50 }).notNull(),
    email: varchar('email', { length: 100 }).unique().notNull(),
    hash_password: varchar('hash_password', { length: 60 }).notNull(),
    role: varchar('role', { length: 40 }).default('user'),
    level: int('level').default(1), // 1=Basic, 2=Pro, 3=Plus
    balance: int('balance').default(0),
    status: varchar('status', { length: 20 }).default('active'), // Enum-like: active, banned
    created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
    updated_at: timestamp('updated_at').onUpdateNow(),
});

// Games Table
const games = mysqlTable('games', {
    id: varchar('id', { length: 36 }).primaryKey(), // UUID
    api_id: int('api_id'), // ID from external API/Cron
    api_source: varchar('api_source', { length: 50 }), // 'napgame247', 'morishop'
    name: varchar('name', { length: 50 }).notNull(),
    thumbnail: varchar('thumbnail', { length: 500 }),
    server: json('server'), // Array of servers
    input_fields: json('input_fields'), // Store external form fields config (IDs for UID, Server, etc.)
    gamecode: varchar('gamecode', { length: 50 }).unique(),
    publisher: varchar('publisher', { length: 50 }),
    origin_markup_percent: double('origin_markup_percent').default(0), // % markup from API price to origin price
    profit_percent_basic: int('profit_percent_basic').default(0),
    profit_percent_pro: int('profit_percent_pro').default(0),
    profit_percent_plus: int('profit_percent_plus').default(0),
});

// Topup Packages Table
const topupPackages = mysqlTable('topup_packages', {
    id: varchar('id', { length: 36 }).primaryKey(), // UUID
    api_id: int('api_id'), // ID from external API/Cron
    package_name: varchar('package_name', { length: 255 }).notNull(),
    game_id: varchar('game_id', { length: 36 }).notNull(), // FK to games
    price: int('price').notNull(), // Default price (used as fallback)
    price_basic: int('price_basic'), // Price for level 1 (Basic)
    price_pro: int('price_pro'),     // Price for level 2 (Pro)
    price_plus: int('price_plus'),   // Price for level 3 (Plus)
    thumbnail: varchar('thumbnail', { length: 500 }),
    package_type: varchar('package_type', { length: 50 }),
    status: varchar('status', { length: 20 }).default('active'),
    api_price: int('api_price'),     // Price from supplier API (harga)
    origin_price: int('origin_price'), // Our base price = api_price × (1 + origin_markup%)
    fileAPI: json('fileAPI'),
    id_server: boolean('id_server').default(false),
    sale: boolean('sale').default(false),
    profit_percent_basic: int('profit_percent_basic').default(0),
    profit_percent_pro: int('profit_percent_pro').default(0),
    profit_percent_plus: int('profit_percent_plus').default(0),
    profit_percent_user: int('profit_percent_user').default(0),
});

// Orders Table
const orders = mysqlTable('orders', {
    id: serial('id').primaryKey(),
    api_id: varchar('api_id', { length: 50 }), // External Order ID (NapGame247/Morishop)
    user_id: varchar('user_id', { length: 36 }).notNull(), // FK to users
    package_id: varchar('package_id', { length: 36 }).notNull(), // FK to topup_packages
    amount: int('amount').notNull(),
    quantity: int('quantity').default(1),
    status: varchar('status', { length: 50 }).default('pending'),
    account_info: json('account_info'),
    profit: int('profit').default(0),
    user_id_nap: varchar('user_id_nap', { length: 36 }),
    created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
    updated_at: timestamp('updated_at').onUpdateNow(),
});

// Wallet Logs Table
const walletLogs = mysqlTable('topup_wallet_logs', {
    id: varchar('id', { length: 20 }).primaryKey(), // Transaction ID?
    user_id: varchar('user_id', { length: 36 }).notNull(), // FK to users
    amount: int('amount').notNull(),
    status: varchar('status', { length: 50 }).default('pending'),
    created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
    updated_at: timestamp('updated_at').onUpdateNow(),
});

// Acc Table (Account Market)
const acc = mysqlTable('acc', {
    id: serial('id').primaryKey(),
    game_id: varchar('game_id', { length: 36 }).notNull(), // FK to games
    info: text('info'),
    image: varchar('image', { length: 255 }),
    price: int('price').notNull(), // Default price (fallback)
    price_basic: int('price_basic'), // Price for level 1 (Basic)
    price_pro: int('price_pro'),     // Price for level 2 (Pro)
    price_plus: int('price_plus'),   // Price for level 3 (Plus)
    status: varchar('status', { length: 50 }).default('available'),
});

// Acc Orders Table
const accOrders = mysqlTable('acc_orders', {
    id: serial('id').primaryKey(),
    acc_id: int('acc_id').notNull(), // FK to acc
    user_id: varchar('user_id', { length: 36 }).notNull(), // FK to users
    price: int('price').notNull(),
    status: varchar('status', { length: 50 }).default('pending'),
    contact_info: json('contact_info'),
    created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
    updated_at: timestamp('updated_at').onUpdateNow(),
});

// Balance History Table
const balanceHistory = mysqlTable('balance_history', {
    id: serial('id').primaryKey(),
    user_id: varchar('user_id', { length: 36 }).notNull(), // FK to users
    amount: int('amount').notNull(), // Amount change (+ or -)
    balance_before: int('balance_before').notNull(),
    balance_after: int('balance_after').notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }), // 'credit', 'debit', 'refund', etc.
    created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Relations
const usersRelations = relations(users, ({ many }) => ({
    orders: many(orders),
    walletLogs: many(walletLogs),
    accOrders: many(accOrders),
    balanceHistory: many(balanceHistory),
}));

const gamesRelations = relations(games, ({ many }) => ({
    packages: many(topupPackages),
    accs: many(acc),
}));

const packagesRelations = relations(topupPackages, ({ one }) => ({
    game: one(games, {
        fields: [topupPackages.game_id],
        references: [games.id],
    }),
}));

const ordersRelations = relations(orders, ({ one }) => ({
    user: one(users, {
        fields: [orders.user_id],
        references: [users.id],
    }),
    package: one(topupPackages, {
        fields: [orders.package_id],
        references: [topupPackages.id],
    }),
}));

const accRelations = relations(acc, ({ one }) => ({
    game: one(games, {
        fields: [acc.game_id],
        references: [games.id],
    }),
}));

const accOrdersRelations = relations(accOrders, ({ one }) => ({
    user: one(users, {
        fields: [accOrders.user_id],
        references: [users.id],
    }),
    acc: one(acc, {
        fields: [accOrders.acc_id],
        references: [acc.id],
    }),
}));

const balanceHistoryRelations = relations(balanceHistory, ({ one }) => ({
    user: one(users, {
        fields: [balanceHistory.user_id],
        references: [users.id],
    }),
}));


module.exports = {
    users,
    games,
    topupPackages,
    orders,
    walletLogs,
    acc,
    accOrders,
    balanceHistory,

    usersRelations,
    gamesRelations,
    packagesRelations,
    ordersRelations,
    accRelations,
    accOrdersRelations,
    balanceHistoryRelations
};
