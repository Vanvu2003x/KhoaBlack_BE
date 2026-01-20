const { db } = require("../../configs/drizzle");
const { acc } = require("../../db/schema");
const { eq, ilike, and, sql, desc, gte, lte, or } = require("drizzle-orm");

const AccService = {
    getAccById: async (id) => {
        const [result] = await db.select().from(acc).where(eq(acc.id, id));
        return result;
    },

    getAccByGame: async ({ game_id, keyword, min, max, limit, offset }) => {
        let conditions = [eq(acc.game_id, game_id)];

        if (keyword) {
            const searchTerm = `%${keyword}%`;
            conditions.push(or(ilike(acc.info, searchTerm), sql`CAST(${acc.id} AS CHAR) ILIKE ${searchTerm}`));
        }

        if (min !== undefined) conditions.push(gte(acc.price, min));
        if (max !== undefined) conditions.push(lte(acc.price, max));

        const baseQuery = db.select().from(acc).where(and(...conditions));

        // IMPORTANT: MySQL requires limit/offset to be numbers, not strings
        const data = await baseQuery
            .orderBy(desc(acc.id))
            .limit(parseInt(limit) || 10)
            .offset(parseInt(offset) || 0);

        // Separate count query
        const [total] = await db.select({ count: sql`COUNT(*)` })
            .from(acc)
            .where(and(...conditions));

        return {
            total: Number(total.count),
            data: data
        };
    },

    createAcc: async ({ info, image, price, game_id, price_basic, price_pro, price_plus }) => {
        // Validate required fields
        if (!info || info.trim() === '') {
            throw new Error('Account info is required');
        }
        if (!price || price <= 0) {
            throw new Error('Valid price is required');
        }
        if (!game_id) {
            throw new Error('Game ID is required');
        }
        if (!image) {
            throw new Error('Account image is required');
        }

        const newAcc = {
            info,
            image,
            price: parseInt(price),
            price_basic: price_basic ? parseInt(price_basic) : null,
            price_pro: price_pro ? parseInt(price_pro) : null,
            price_plus: price_plus ? parseInt(price_plus) : null,
            game_id,
            status: 'selling' // Default status to 'selling' instead of 'available'
        };

        // MySQL doesn't support RETURNING clause - insert then fetch
        const insertResult = await db.insert(acc).values(newAcc);

        // Get the last inserted record using insertId
        const insertId = insertResult[0]?.insertId;
        if (insertId) {
            const [created] = await db.select().from(acc).where(eq(acc.id, insertId));
            return created;
        }

        // Fallback: get most recent record matching our data
        const [fetched] = await db.select().from(acc)
            .where(and(
                eq(acc.game_id, game_id),
                eq(acc.image, image)
            ))
            .orderBy(desc(acc.id))
            .limit(1);
        return fetched;
    },

    updateAcc: async (id, data) => {
        // Build update object with only provided fields
        const updateData = {};
        if (data.info !== undefined) updateData.info = data.info;
        if (data.image !== undefined) updateData.image = data.image;
        if (data.price !== undefined) {
            if (data.price <= 0) throw new Error('Price must be greater than 0');
            updateData.price = parseInt(data.price);
        }
        if (data.price_basic !== undefined) updateData.price_basic = data.price_basic ? parseInt(data.price_basic) : null;
        if (data.price_pro !== undefined) updateData.price_pro = data.price_pro ? parseInt(data.price_pro) : null;
        if (data.price_plus !== undefined) updateData.price_plus = data.price_plus ? parseInt(data.price_plus) : null;

        if (data.status !== undefined) {
            if (!['selling', 'sold', 'available'].includes(data.status)) {
                throw new Error('Invalid status value');
            }
            updateData.status = data.status;
        }
        if (data.game_id !== undefined) updateData.game_id = data.game_id;

        // Check if account exists
        const [existing] = await db.select().from(acc).where(eq(acc.id, id));
        if (!existing) {
            throw new Error('Account not found');
        }

        // Only update if there are fields to update
        if (Object.keys(updateData).length > 0) {
            await db.update(acc)
                .set(updateData)
                .where(eq(acc.id, id));
        }

        const [updated] = await db.select().from(acc).where(eq(acc.id, id));
        return updated;
    },

    deleteAcc: async (id) => {
        const [deleted] = await db.select().from(acc).where(eq(acc.id, id));
        await db.delete(acc).where(eq(acc.id, id));
        return deleted;
    },

    updateStatus: async (id, status) => {
        await db.update(acc)
            .set({ status })
            .where(eq(acc.id, id));

        const [updated] = await db.select().from(acc).where(eq(acc.id, id));
        return updated;
    },

    getAccStats: async () => {
        const [counts] = await db.execute(sql`
             SELECT 
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'available') AS available,
              COUNT(*) FILTER (WHERE status = 'selling') AS selling,
              COUNT(*) FILTER (WHERE status = 'sold') AS sold
            FROM acc
        `);
        // Note: COUNT(*) FILTER is Postgres syntax, for MySQL use SUM(CASE WHEN ...)

        // Let's rewrite for MySQL compatibility if needed, though some MySQL versions support filter
        // Safer MySQL:
        const [mysqlCounts] = await db.execute(sql`
             SELECT 
              COUNT(*) AS total,
              SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available,
              SUM(CASE WHEN status = 'selling' THEN 1 ELSE 0 END) AS selling,
              SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) AS sold
            FROM acc
        `);

        return mysqlCounts[0];
    },

    getPriceById: async (id) => {
        const [result] = await db.select({ price: acc.price, info: acc.info }).from(acc).where(eq(acc.id, id));
        return result || null;
    }
};

module.exports = AccService;
