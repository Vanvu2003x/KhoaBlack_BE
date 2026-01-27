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
            api_id: topupPackages.api_id,
            package_name: topupPackages.package_name,
            game_id: topupPackages.game_id,
            price: topupPackages.price,
            price_basic: topupPackages.price_basic,
            price_pro: topupPackages.price_pro,
            price_plus: topupPackages.price_plus,
            profit_percent_user: topupPackages.profit_percent_user,
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
            thumbnailPath = `/uploads/${file.filename}`;
        }

        // Fetch Game Settings for Pricing
        const [game] = await db.select().from(games).where(eq(games.id, data.game_id));
        if (!game) throw new Error("Game not found");

        const originPrice = parseInt(data.origin_price || 0);

        // USE GAME PERCENTAGES (Master Rule)
        // USE PACKAGE PERCENTAGES IF PROVIDED, ELSE GAME DEFAULTS
        const percentBasic = data.profit_percent_basic !== undefined ? Number(data.profit_percent_basic) : (game.profit_percent_basic || 0);
        const percentPro = data.profit_percent_pro !== undefined ? Number(data.profit_percent_pro) : (game.profit_percent_pro || 0);
        const percentPlus = data.profit_percent_plus !== undefined ? Number(data.profit_percent_plus) : (game.profit_percent_plus || 0);
        const percentUser = data.profit_percent_user !== undefined ? Number(data.profit_percent_user) : 0;

        const priceBasic = Math.ceil(originPrice * (1 + percentBasic / 100));
        const pricePro = Math.ceil(originPrice * (1 + percentPro / 100));
        const pricePlus = Math.ceil(originPrice * (1 + percentPlus / 100));
        // Default price is often User Price or Basic Price. Let's assume Price = User Price if defined, else Basic.
        // But usually 'price' column is the default display price.
        // If we have a specific user percentage, maybe we should calculate a price for it?
        // Let's assume price = origin * (1 + percentUser/100) if percentUser is set, otherwise use basic.
        // Or just save it.
        // The user request is "not saving % user". So we definitely need to save it.
        // Does it affect the main 'price'?
        // "Price" column seems to be the one shown to normal users.
        const priceUser = Math.ceil(originPrice * (1 + percentUser / 100));

        const newPackage = {
            id: crypto.randomUUID(),
            api_id: data.api_id, // Store external ID
            package_name: data.package_name,
            game_id: data.game_id,
            origin_price: originPrice,

            profit_percent_basic: percentBasic,
            profit_percent_pro: percentPro,
            profit_percent_plus: percentPlus,
            profit_percent_user: percentUser,

            price: priceUser > originPrice ? priceUser : priceBasic, // Default price logic: Use User price if valid calculation, else Basic
            price_basic: priceBasic,
            price_pro: pricePro,
            price_plus: pricePlus,

            thumbnail: thumbnailPath,
            package_type: data.package_type,
            id_server: data.id_server,
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
        const currentPkg = await PackageService.getPackageById(id);
        if (!currentPkg) throw new Error("Gói không tồn tại");

        // Fetch Game to get current percentages
        const [game] = await db.select().from(games).where(eq(games.id, currentPkg.game_id));
        if (!game) throw new Error("Game associated with this package not found");

        const updateData = {};
        if (data.package_name !== undefined) updateData.package_name = data.package_name;
        if (data.api_id !== undefined) updateData.api_id = data.api_id;
        if (data.package_type !== undefined) updateData.package_type = data.package_type;
        if (data.id_server !== undefined) updateData.id_server = data.id_server;
        if (data.sale !== undefined) updateData.sale = data.sale;

        // Pricing Logic
        const originPrice = data.origin_price !== undefined ? parseInt(data.origin_price) : currentPkg.origin_price;

        const percentBasic = data.profit_percent_basic !== undefined ? Number(data.profit_percent_basic)
            : (currentPkg.profit_percent_basic !== null ? currentPkg.profit_percent_basic : (game.profit_percent_basic || 0));

        const percentPro = data.profit_percent_pro !== undefined ? Number(data.profit_percent_pro)
            : (currentPkg.profit_percent_pro !== null ? currentPkg.profit_percent_pro : (game.profit_percent_pro || 0));

        const percentPlus = data.profit_percent_plus !== undefined ? Number(data.profit_percent_plus)
            : (currentPkg.profit_percent_plus !== null ? currentPkg.profit_percent_plus : (game.profit_percent_plus || 0));

        const percentUser = data.profit_percent_user !== undefined ? Number(data.profit_percent_user)
            : (currentPkg.profit_percent_user !== null ? currentPkg.profit_percent_user : 0);

        // Update stored values to match Game
        updateData.origin_price = originPrice;
        updateData.profit_percent_basic = percentBasic;
        updateData.profit_percent_pro = percentPro;
        updateData.profit_percent_plus = percentPlus;
        updateData.profit_percent_user = percentUser;

        // Recalculate Prices
        updateData.price_basic = Math.ceil(originPrice * (1 + percentBasic / 100));
        updateData.price_pro = Math.ceil(originPrice * (1 + percentPro / 100));
        updateData.price_plus = Math.ceil(originPrice * (1 + percentPlus / 100));
        const priceUser = Math.ceil(originPrice * (1 + percentUser / 100));
        updateData.price = priceUser > originPrice ? priceUser : updateData.price_basic;

        // Thumbnail
        if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
        if (file) {
            updateData.thumbnail = `/uploads/${file.filename}`;
            if (currentPkg.thumbnail) {
                deleteFile(currentPkg.thumbnail);
            }
        }

        // FileAPI
        if (data.fileAPI !== undefined) {
            try {
                updateData.fileAPI = typeof data.fileAPI === 'string' ? JSON.parse(data.fileAPI) : data.fileAPI;
            } catch (e) {
                updateData.fileAPI = null;
            }
        }

        if (Object.keys(updateData).length === 0) {
            throw new Error("Không có dữ liệu nào để cập nhật");
        }

        await db.update(topupPackages).set(updateData).where(eq(topupPackages.id, id));
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
