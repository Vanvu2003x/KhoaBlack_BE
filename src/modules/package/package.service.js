const { db } = require("../../configs/drizzle");
const { topupPackages, games } = require("../../db/schema");
const { eq, and, ilike, asc, desc, sql, like } = require("drizzle-orm");
const crypto = require("crypto");
const { deleteFile } = require("../../utils/file.util");

const PackageService = {
    getAllPackages: async () => {
        return await db.select().from(topupPackages).orderBy(asc(topupPackages.price));
    },

    getPackageById: async (id) => {
        const [result] = await db.select().from(topupPackages).where(eq(topupPackages.id, id));
        return result || null;
    },

    getPackagesByGameCode: async (game_code, id_server = null) => {
        let query = db.select({
            id: topupPackages.id,
            package_name: topupPackages.package_name,
            game_id: topupPackages.game_id,
            price: topupPackages.price,
            price_basic: topupPackages.price_basic,
            price_pro: topupPackages.price_pro,
            price_plus: topupPackages.price_plus,
            thumbnail: topupPackages.thumbnail,
            package_type: topupPackages.package_type,
            status: topupPackages.status,
            origin_price: topupPackages.origin_price,
            fileAPI: topupPackages.fileAPI,
            id_server: topupPackages.id_server,
            sale: topupPackages.sale
        })
            .from(topupPackages)
            .innerJoin(games, eq(topupPackages.game_id, games.id))
            .where(eq(games.gamecode, game_code));

        if (id_server) {
            // Note: id_server in schema is boolean, but function implies matching a value mechanism or boolean filter?
            // Original code: AND tp.id_server = $2 -> passed id_server param
            // Schema has id_server: boolean('id_server').default(false)
            // If the param is meant to filter true/false, simple eq.
            query.where(eq(topupPackages.id_server, id_server));
        }

        const result = await query.orderBy(asc(topupPackages.price));
        return result;
    },

    createPackage: async (data, file) => {
        let parsedFileAPI = null;
        if (data.fileAPI) {
            try {
                parsedFileAPI = typeof data.fileAPI === 'string' ? JSON.parse(data.fileAPI) : data.fileAPI;
            } catch (error) {
                console.error("Invalid JSON in fileAPI:", error.message);
                parsedFileAPI = null;
            }
        }

        // Handle File
        let thumbnailPath = data.thumbnail; // fallback
        if (file) {
            // Adjust this path prefix based on your upload config (e.g., /uploads/ or /images/)
            // Assuming the uploader stores it in a public accessible folder and file.filename is generated
            thumbnailPath = `/uploads/${file.filename}`;
        }

        const newPackage = {
            id: crypto.randomUUID(),
            package_name: data.package_name,
            game_id: data.game_id,
            price: data.price,
            origin_price: data.origin_price,
            price_basic: data.price_basic || null,
            price_pro: data.price_pro || null,
            price_plus: data.price_plus || null,
            thumbnail: thumbnailPath,
            package_type: data.package_type,
            id_server: data.id_server, // boolean
            sale: data.sale || false,
            fileAPI: parsedFileAPI,
        };

        await db.insert(topupPackages).values(newPackage);
        const [created] = await db.select().from(topupPackages).where(eq(topupPackages.id, newPackage.id));
        return created;
    },

    patchPackage: async (id, newStatus) => {
        await db.update(topupPackages)
            .set({ status: newStatus })
            .where(eq(topupPackages.id, id));
        const [updated] = await db.select().from(topupPackages).where(eq(topupPackages.id, id));
        return updated;
    },

    updatePackage: async (id, data, file) => {
        const updateData = {};
        if (data.package_name !== undefined) updateData.package_name = data.package_name;
        if (data.price !== undefined) updateData.price = parseInt(data.price);
        if (data.origin_price !== undefined) updateData.origin_price = parseInt(data.origin_price);
        if (data.price_basic !== undefined) updateData.price_basic = data.price_basic ? parseInt(data.price_basic) : null;
        if (data.price_pro !== undefined) updateData.price_pro = data.price_pro ? parseInt(data.price_pro) : null;
        if (data.price_plus !== undefined) updateData.price_plus = data.price_plus ? parseInt(data.price_plus) : null;
        if (data.package_type !== undefined) updateData.package_type = data.package_type;
        if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
        if (data.id_server !== undefined) updateData.id_server = data.id_server;
        if (data.sale !== undefined) updateData.sale = data.sale;

        if (file) {
            updateData.thumbnail = `/uploads/${file.filename}`;

            // Cleanup old file
            const oldPkg = await PackageService.getPackageById(id);
            if (oldPkg && oldPkg.thumbnail) {
                deleteFile(oldPkg.thumbnail);
            }
        }

        if (data.fileAPI !== undefined) {
            try {
                updateData.fileAPI = typeof data.fileAPI === 'string' ? JSON.parse(data.fileAPI) : data.fileAPI;
            } catch (e) {
                console.error("Invalid JSON during update:", e.message);
                updateData.fileAPI = null;
            }
        }

        if (Object.keys(updateData).length === 0) {
            throw new Error("Không có dữ liệu nào để cập nhật");
        }

        await db.update(topupPackages)
            .set(updateData)
            .where(eq(topupPackages.id, id));

        const [updated] = await db.select().from(topupPackages).where(eq(topupPackages.id, id));
        return updated;
    },

    getPackagesByType: async (type) => {
        return await db.select()
            .from(topupPackages)
            .where(eq(topupPackages.package_type, type))
            .orderBy(asc(topupPackages.price));
    },

    delPackages: async (id) => {
        const [deleted] = await db.select().from(topupPackages).where(eq(topupPackages.id, id));
        await db.delete(topupPackages).where(eq(topupPackages.id, id));

        // Cleanup file
        if (deleted && deleted.thumbnail) {
            deleteFile(deleted.thumbnail);
        }

        return deleted;
    },

    searchPackages: async ({ keyword = "", game_id = null, id_server = null, sale = null }) => {
        let conditions = [sql`1=1`]; // Base true condition

        if (keyword) {
            conditions.push(ilike(topupPackages.package_name, `%${keyword}%`));
        }
        if (game_id) {
            conditions.push(eq(topupPackages.game_id, game_id));
        }
        if (id_server !== null) {
            conditions.push(eq(topupPackages.id_server, id_server));
        }
        if (sale !== null) {
            conditions.push(eq(topupPackages.sale, sale));
        }

        return await db.select()
            .from(topupPackages)
            .where(and(...conditions))
            .orderBy(asc(topupPackages.price));
    },

    getPackagePriceById: async (id) => {
        const [result] = await db.select({ id: topupPackages.id, price: topupPackages.price, package_name: topupPackages.package_name }).from(topupPackages).where(eq(topupPackages.id, id));
        return result || null;
    },

    getPackageProfitById: async (id) => {
        const [result] = await db.select({
            profit: sql`(${topupPackages.price} - ${topupPackages.origin_price})`
        }).from(topupPackages).where(eq(topupPackages.id, id));
        return result ? result.profit : null;
    },

    getPackageAmountById: async (id) => {
        const [result] = await db.select({ price: topupPackages.price }).from(topupPackages).where(eq(topupPackages.id, id));
        return result ? result.price : null;
    },
    // Aliases & Missing matches
    getPackagesByGameSlug: async (game_code, id_server = null, isAdmin) => {
        // reuse getPackagesByGameCode
        return await PackageService.getPackagesByGameCode(game_code, id_server);
    },

    deletePackage: async (id) => {
        return await PackageService.delPackages(id);
    },

    updateStatus: async (id, newStatus) => {
        return await PackageService.patchPackage(id, newStatus);
    },

    updateSale: async (id, sale) => {
        await db.update(topupPackages)
            .set({ sale: sale })
            .where(eq(topupPackages.id, id));
        const [updated] = await db.select().from(topupPackages).where(eq(topupPackages.id, id));
        return updated;
    },

    getLogTypePackages: async () => {
        // Fallback implementation based on inferred intent
        return await PackageService.getAllPackages();
    }
};

module.exports = PackageService;
