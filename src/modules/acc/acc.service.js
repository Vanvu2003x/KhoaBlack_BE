const { db } = require("../../configs/drizzle");
const { acc } = require("../../db/schema");
const { eq, ilike, and, sql, desc, gte, lte, or } = require("drizzle-orm");

const AccService = {
    getAccByGame: async ({ game_id, keyword, min, max, limit, offset }) => {
        let conditions = [eq(acc.game_id, game_id)];

        if (keyword) {
            const searchTerm = `%${keyword}%`;
            conditions.push(or(ilike(acc.info, searchTerm), sql`CAST(${acc.id} AS CHAR) ILIKE ${searchTerm}`));
        }

        if (min !== undefined) conditions.push(gte(acc.price, min));
        if (max !== undefined) conditions.push(lte(acc.price, max));

        const baseQuery = db.select().from(acc).where(and(...conditions));

        const data = await baseQuery
            .orderBy(desc(acc.id))
            .limit(limit)
            .offset(offset);

        // Separate count query
        const [total] = await db.select({ count: sql`COUNT(*)` })
            .from(acc)
            .where(and(...conditions));

        return {
            total: Number(total.count),
            data: data
        };
    },

    addAcc: async ({ info, image, price, game_id }) => {
        const newAcc = {
            info,
            image,
            price,
            game_id,
            status: 'available'
        };
        const [result] = await db.insert(acc).values(newAcc).returning();
        // Fallback if returning not supported by driver/db version, fetch last
        if (!result) {
            const [fetched] = await db.select().from(acc).orderBy(desc(acc.id)).limit(1);
            return fetched;
        }
        return result;
    },

    updateAcc: async (id, { info, image, price, status, game_id }) => {
        await db.update(acc)
            .set({ info, image, price, status, game_id })
            .where(eq(acc.id, id));

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
