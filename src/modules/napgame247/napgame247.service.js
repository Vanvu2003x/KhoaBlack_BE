const axios = require('axios');
const { db } = require("../../configs/drizzle");
const { games, topupPackages } = require("../../db/schema");
const { eq, and } = require("drizzle-orm");
const crypto = require("crypto");

class NapGame247Service {
    constructor() {
        this.baseUrl = 'https://napgame247.vn/api/products';
    }

    getApiKey() {
        return process.env.NAPGAME247_API_KEY;
    }

    async fetchProducts() {
        try {
            const apiKey = this.getApiKey();
            if (!apiKey) {
                console.error("[NapGame247] NAPGAME247_API_KEY is not configured.");
                return null;
            }

            console.log(`[NapGame247] Request: GET ${this.baseUrl}`);
            // API key logging removed for security

            const response = await axios.get(this.baseUrl, {
                params: {
                    api_key: apiKey
                },
                timeout: 15000 // 15 seconds timeout
            });

            console.log(`[NapGame247] Response OK:`, JSON.stringify(response.data).substring(0, 200) + '...');

            return response.data;
        } catch (error) {
            console.error(`[NapGame247] ========== ERROR DETAILS ==========`);
            console.error(`[NapGame247] Status: ${error.response?.status} ${error.response?.statusText}`);
            console.error(`[NapGame247] Response Data:`, JSON.stringify(error.response?.data));
            console.error(`[NapGame247] Response Headers:`, JSON.stringify(error.response?.headers));
            console.error(`[NapGame247] Request URL:`, error.config?.url);
            console.error(`[NapGame247] Request Params:`, JSON.stringify(error.config?.params));
            console.error(`[NapGame247] Error Message:`, error.message);
            console.error(`[NapGame247] ===================================`);
            return null;
        }
    }

    async buyItem(game_id, package_id, quantity = 1, dynamicParams = {}) {
        try {
            const apiKey = this.getApiKey();
            if (!apiKey) throw new Error("Missing API Key");

            if (!game_id) throw new Error("Missing Game ID for NapGame247");
            if (!package_id) throw new Error("Missing Package ID for NapGame247");

            // Params: api_key, game_id, package, quantity, fields_35, fields_34 etc.
            const url = 'https://napgame247.vn/api/product/order';

            const requestParams = {
                api_key: apiKey,
                game_id: game_id,
                package: package_id,
                quantity: quantity,
                ...dynamicParams
            };

            // Log full URL for debugging (Logic roughly stays same for logging, but request is POST)
            const queryString = new URLSearchParams(requestParams).toString();
            console.log(`[NapGame247] FULL API CALL (POST): ${url}`);
            console.log(`[NapGame247] BODY:`, requestParams);

            console.log(`Forwarding order to NapGame247: Game=${game_id}, Pkg=${package_id}, Qty=${quantity}, Dynamics=${JSON.stringify(dynamicParams)}`);

            // API expects POST request now
            // Using URLSearchParams to send as application/x-www-form-urlencoded (standard for PHP-like APIs)
            // If JSON is needed, we would just pass requestParams directly.
            // But usually APIs accepting "GET" params also accept "POST" form-data/urlencoded easily.
            const response = await axios.post(url, new URLSearchParams(requestParams), { timeout: 15000 });

            console.log("NapGame247 Response:", response.data);
            return response.data;

        } catch (error) {
            console.error("Error forwarding order to NapGame247:", error.message);
            return { status: 'error', message: error.message };
        }
    }

    async checkOrderStatus(orderId) {
        try {
            const apiKey = this.getApiKey();
            if (!apiKey) throw new Error("Missing API Key");

            // User provided: https://napgame247.vn/api/product/{product_id}?api_key=API KEY
            const url = `https://napgame247.vn/api/product/${orderId}`;

            // Log full URL check with Key
            const fullUrl = `${url}?api_key=${apiKey}`;
            console.log(`[NapGame247] CHECK STATUS URL: ${fullUrl}`);

            const response = await axios.get(url, {
                params: { api_key: apiKey },
                timeout: 15000
            });

            console.log(`[NapGame247] CHECK RESPONSE:`, JSON.stringify(response.data));

            return response.data;
        } catch (error) {
            console.error(`Error checking status for order ${orderId}:`, error.message);
            return { status: 'error', message: error.message };
        }
    }

    async syncGame(targetId, cachedData = null) {
        let responseCallback = cachedData;

        if (!responseCallback) {
            console.log(`[Sync] Fetching fresh data for Game ID: ${targetId}...`);
            responseCallback = await this.fetchProducts();
        } else {
            console.log(`[Sync] Using cached data for Game ID: ${targetId}...`);
        }

        if (!responseCallback || responseCallback.status !== 'success') {
            console.error("Failed to fetch data from NapGame247");
            return;
        }

        let targetGameData = null;

        // Traverse categories
        for (const category of responseCallback.data) {
            if (category.games) {
                for (const game of category.games) {
                    if (game.id === targetId) {
                        targetGameData = game;
                        break;
                    }
                }
            }
            if (targetGameData) break;
        }

        if (!targetGameData) {
            console.error(`Game ID ${targetId} not found in response.`);
            return;
        }

        // --- SYNC EACH GAME ---
        console.log(`Syncing Game: ${targetGameData.name} (ID: ${targetGameData.id})`);

        // Extract Server List and Input Fields from form_fields
        let serverList = [];
        let inputFields = []; // Store raw form_fields logic

        if (targetGameData.form_fields && Array.isArray(targetGameData.form_fields)) {
            inputFields = targetGameData.form_fields.map(f => ({
                id: f.id,
                name: f.name,
                type: f.type,
                options: f.options
            }));

            const serverField = targetGameData.form_fields.find(f => f.name === 'Server' || f.name === 'server' || f.name === 'Máy chủ');
            if (serverField && serverField.options && Array.isArray(serverField.options)) {
                serverList = serverField.options.map(opt => opt.value);
            }
        }

        // 1. Check/Create Game in DB by Name
        let [existingGame] = await db.select().from(games).where(eq(games.name, targetGameData.name));

        if (!existingGame) {
            console.log(`Creating Game: ${targetGameData.name}`);
            const newGameId = crypto.randomUUID();
            await db.insert(games).values({
                id: newGameId,
                api_id: targetGameData.id,
                api_source: 'napgame247',
                name: targetGameData.name,
                gamecode: targetGameData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                thumbnail: '/uploads/default-game.png',
                publisher: 'Auto-Sync',
                server: serverList,
                input_fields: inputFields // Save input configs
            });
            [existingGame] = await db.select().from(games).where(eq(games.id, newGameId));
        } else {
            // Update api_id, servers, and input_fields
            await db.update(games)
                .set({
                    api_id: targetGameData.id,
                    api_source: 'napgame247',
                    server: serverList,
                    input_fields: inputFields
                })
                .where(eq(games.id, existingGame.id));
        }

        // 2. Sync Packages (Items)
        const items = targetGameData.items || [];
        console.log(`Found ${items.length} items.`);

        for (const item of items) {
            // Match by api_id to avoid duplicates
            let [existingPackage] = await db.select().from(topupPackages).where(
                and(
                    eq(topupPackages.game_id, existingGame.id),
                    eq(topupPackages.api_id, item.id)
                )
            );

            // Fallback: match by name if api_id not found (for legacy data)
            if (!existingPackage) {
                [existingPackage] = await db.select().from(topupPackages).where(
                    and(
                        eq(topupPackages.game_id, existingGame.id),
                        eq(topupPackages.package_name, item.name)
                    )
                );
            }

            // Calculate origin price from API price (markupCoefficient is stored as multiplier, e.g. 1.55 = 55% markup)
            const apiPrice = item.price;
            const markupCoefficient = existingGame.origin_markup_percent || 1;
            const originPrice = Math.ceil(apiPrice * markupCoefficient);

            if (existingPackage) {
                // UPDATE: Recalculate prices from new origin_price using existing package percentages
                const pkgPercentBasic = existingPackage.profit_percent_basic ?? (existingGame.profit_percent_basic || 0);
                const pkgPercentPro = existingPackage.profit_percent_pro ?? (existingGame.profit_percent_pro || 0);
                const pkgPercentPlus = existingPackage.profit_percent_plus ?? (existingGame.profit_percent_plus || 0);
                const pkgPercentUser = existingPackage.profit_percent_user ?? 0;

                const newPriceBasic = Math.ceil(originPrice * (1 + pkgPercentBasic / 100));
                const newPricePro = Math.ceil(originPrice * (1 + pkgPercentPro / 100));
                const newPricePlus = Math.ceil(originPrice * (1 + pkgPercentPlus / 100));
                const newPriceUser = Math.ceil(originPrice * (1 + pkgPercentUser / 100));

                console.log(`Updating package: ${item.name} - API: ${apiPrice}, Origin: ${originPrice}, Basic: ${newPriceBasic}, Pro: ${newPricePro}, Plus: ${newPricePlus}`);

                await db.update(topupPackages)
                    .set({
                        api_id: item.id,
                        api_price: apiPrice,
                        origin_price: originPrice,
                        price: newPriceUser > originPrice ? newPriceUser : newPriceBasic,
                        price_basic: newPriceBasic,
                        price_pro: newPricePro,
                        price_plus: newPricePlus,
                        fileAPI: { nap_id: item.id, game_api_id: targetGameData.id }
                        // Preserve: profit_percent_*, package_name, status, etc.
                    })
                    .where(eq(topupPackages.id, existingPackage.id));
            } else {
                // CREATE: New package with full data
                console.log(`Creating NEW package: ${item.name}`);

                // Use game percentages for new packages
                const percentBasic = existingGame.profit_percent_basic || 0;
                const percentPro = existingGame.profit_percent_pro || 0;
                const percentPlus = existingGame.profit_percent_plus || 0;

                const priceBasic = Math.ceil(originPrice * (1 + percentBasic / 100));
                const pricePro = Math.ceil(originPrice * (1 + percentPro / 100));
                const pricePlus = Math.ceil(originPrice * (1 + percentPlus / 100));

                await db.insert(topupPackages).values({
                    id: crypto.randomUUID(),
                    api_id: item.id,
                    game_id: existingGame.id,
                    package_name: item.name,
                    api_price: apiPrice,
                    origin_price: originPrice,

                    profit_percent_basic: percentBasic,
                    profit_percent_pro: percentPro,
                    profit_percent_plus: percentPlus,

                    price: priceBasic,
                    price_basic: priceBasic,
                    price_pro: pricePro,
                    price_plus: pricePlus,

                    status: 'active',
                    package_type: 'uid',
                    thumbnail: '/uploads/default-package.png',
                    fileAPI: { nap_id: item.id, game_api_id: targetGameData.id }
                });
            }
        }
        console.log(`Sync completed for Game ID: ${targetId}.`);
    }

    async syncAllGames() {
        console.log("Starting Sync for All Configured Games...");

        // Fetch ONCE for all games
        const allData = await this.fetchProducts();

        if (!allData || allData.status !== 'success') {
            console.error("Failed to fetch data from NapGame247. Sync Aborted.");
            return;
        }

        const targetGameNames = [
            "Identity V",
            "Love And Deepspace",
            "Honkai Impact 3"
        ];

        console.log(`[NapGame247] Searching for games matching: ${JSON.stringify(targetGameNames)}`);

        // Traverse all categories and games
        if (allData.data && Array.isArray(allData.data)) {
            for (const category of allData.data) {
                if (category.games && Array.isArray(category.games)) {
                    for (const game of category.games) {
                        const gameName = game.name;
                        // Check if game name matches any target
                        const isTarget = targetGameNames.some(target =>
                            gameName.toLowerCase().includes(target.toLowerCase())
                        );

                        if (isTarget) {
                            console.log(`[NapGame247] Found target game: ${gameName} (ID: ${game.id})`);
                            await this.syncGame(game.id, allData);
                        }
                    }
                }
            }
        }

        console.log("All Games Sync Completed.");
    }
}

module.exports = new NapGame247Service();
