const { db } = require("../../configs/drizzle");
const { accOrders, acc, users, games } = require("../../db/schema");
const { eq, sql, desc, and } = require("drizzle-orm");

// Helper for complex select
const buildAccOrderQuery = () => {
    return {
        selection: {
            id: accOrders.id,
            acc_id: accOrders.acc_id,
            user_id: accOrders.user_id,
            price: accOrders.price,
            status: accOrders.status,
            contact_info: accOrders.contact_info,
            created_at: accOrders.created_at,
            updated_at: accOrders.updated_at,
            acc_image: acc.image,
            user_name: users.name,
            user_email: users.email,
            game_thumbnail: games.thumbnail
        },
        from: accOrders,
        joins: (qb) => {
            return qb
                .innerJoin(acc, eq(accOrders.acc_id, acc.id))
                .innerJoin(users, eq(accOrders.user_id, users.id))
                .innerJoin(games, eq(acc.game_id, games.id));
        }
    };
};

const AccOrderService = {
    createOrder: async ({ acc_id, user_id, price, status, contact_info }) => {
        return await db.transaction(async (tx) => {
            const newOrder = {
                acc_id,
                user_id,
                price,
                status: status || "pending",
                contact_info: contact_info || {}
            };

            const [result] = await tx.insert(accOrders).values(newOrder); // Drizzle MySQL insert result structure varies
            // Assuming we need to fetch it back
            const [created] = await tx.select().from(accOrders).orderBy(desc(accOrders.id)).limit(1);

            await tx.update(acc).set({ status: 'sold' }).where(eq(acc.id, acc_id));

            return created;
        });
    },

    cancelOrder: async (orderId) => {
        return await db.transaction(async (tx) => {
            const [order] = await tx.select().from(accOrders).where(eq(accOrders.id, orderId));
            if (!order) throw new Error("Order không tồn tại");

            await tx.update(accOrders)
                .set({ status: 'canceled', updated_at: new Date() })
                .where(eq(accOrders.id, orderId));

            await tx.update(acc)
                .set({ status: 'selling' }) // logic from old model said 'selling'
                .where(eq(acc.id, order.acc_id));

            const [updated] = await tx.select().from(accOrders).where(eq(accOrders.id, orderId));
            return updated;
        });
    },

    updateStatus: async (id, status) => {
        await db.update(accOrders)
            .set({ status: status, updated_at: new Date() })
            .where(eq(accOrders.id, id));
        const [updated] = await db.select().from(accOrders).where(eq(accOrders.id, id));
        return updated;
    },

    updateContactInfo: async (id, partialContactInfo) => {
        // partial json update
        // MySQL JSON_MERGE_PATCH equivalent needed or simple fetch-modify-save
        // Drizzle sql operator:

        await db.update(accOrders)
            .set({
                contact_info: sql`JSON_MERGE_PATCH(${accOrders.contact_info}, ${JSON.stringify(partialContactInfo)})`,
                updated_at: new Date()
            })
            .where(eq(accOrders.id, id));

        const [updated] = await db.select().from(accOrders).where(eq(accOrders.id, id));
        return updated;
    },

    getByUserId: async (userId) => {
        const base = buildAccOrderQuery();
        const data = await base.joins(
            db.select(base.selection).from(base.from)
        )
            .where(eq(accOrders.user_id, userId))
            .orderBy(desc(accOrders.created_at));
        return data;
    },

    // Alias for getAllByUserId
    getAllByUserId: async (userId) => {
        return AccOrderService.getByUserId(userId);
    },

    getById: async (id) => {
        const base = buildAccOrderQuery();
        const [data] = await base.joins(
            db.select(base.selection).from(base.from)
        ).where(eq(accOrders.id, id));
        return data;
    },

    getByAccId: async (accId) => {
        const base = buildAccOrderQuery();
        const data = await base.joins(
            db.select(base.selection).from(base.from)
        )
            .where(eq(accOrders.acc_id, accId))
            .orderBy(desc(accOrders.created_at));
        return data;
    },

    getAll: async () => {
        const base = buildAccOrderQuery();
        const data = await base.joins(
            db.select(base.selection).from(base.from)
        )
            .orderBy(desc(accOrders.created_at));
        return data;
    },

    updateStatusTo: async (id, newStatus) => {
        return AccOrderService.updateStatus(id, newStatus);
    },

    findByContact: async ({ phone, email }) => {
        const base = buildAccOrderQuery();
        const conditions = [];

        // MySQL JSON extraction ->> equivalent is ->> or JSON_UNQUOTE(JSON_EXTRACT(...))
        // Drizzle: sql operator

        if (phone) {
            conditions.push(sql`JSON_UNQUOTE(JSON_EXTRACT(${accOrders.contact_info}, '$.phone')) = ${phone}`);
        }
        if (email) {
            conditions.push(sql`LOWER(JSON_UNQUOTE(JSON_EXTRACT(${accOrders.contact_info}, '$.email'))) = LOWER(${email})`);
        }

        if (conditions.length === 0) return [];

        const data = await base.joins(
            db.select(base.selection).from(base.from)
        )
            .where(and(...conditions))
            .orderBy(desc(accOrders.created_at));

        return data;
    }
};

module.exports = AccOrderService;
