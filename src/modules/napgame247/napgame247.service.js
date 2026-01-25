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

    async fetchProducts(id = 12) {
        try {
            const apiKey = this.getApiKey();
            if (!apiKey) {
                console.error("[NapGame247] NAPGAME247_API_KEY is not configured.");
                return null;
            }

            const requestUrl = `${this.baseUrl}?id=${id}`;
            console.log(`[NapGame247][${new Date().toISOString()}] Request: GET ${requestUrl}`);

            const response = await axios.get(this.baseUrl, {
                params: {
                    api_key: apiKey,
                    id: id
                }
            });

            console.log(`[NapGame247][${new Date().toISOString()}] Response:`, JSON.stringify(response.data).substring(0, 500) + '...');

            return response.data;
        } catch (error) {
            console.error(`[NapGame247][${new Date().toISOString()}] Error fetching products:`, error.response?.data || error.message);
            console.error(`[NapGame247] Full error:`, error.response?.status, error.response?.statusText);
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
            const response = await axios.post(url, new URLSearchParams(requestParams));

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
                params: { api_key: apiKey }
            });

            console.log(`[NapGame247] CHECK RESPONSE:`, JSON.stringify(response.data));

            return response.data;
        } catch (error) {
            console.error(`Error checking status for order ${orderId}:`, error.message);
            return { status: 'error', message: error.message };
        }
    }

    async syncIdentityV() {
        console.log("Starting Identity V Sync...");
        const responseCallback = await this.fetchProducts(12);

        if (!responseCallback || responseCallback.status !== 'success') {
            console.error("Failed to fetch data from NapGame247");
            return;
        }

        // The API returns a structure where data is an array of categories (Game PC, Game Mobile).
        // We need to traverse to find the game with id=12.
        // Based on user provided JSON:
        // data: [ { games: [ { id: 12, name: 'Identity V (UID)', items: [...] } ] } ]

        let targetGameData = null;

        // Traverse categories
        for (const category of responseCallback.data) {
            if (category.games) {
                for (const game of category.games) {
                    if (game.id === 12) {
                        targetGameData = game;
                        break;
                    }
                }
            }
            if (targetGameData) break;
        }

        if (!targetGameData) {
            console.error("Game ID 12 (Identity V) not found in response.");
            return;
        }

        // --- SYNC EACH GAME ---
        console.log(`Syncing Game: ${targetGameData.name} (ID: ${targetGameData.id})`);

        // Extract Server List and Input Fields from form_fields
        let serverList = [];
        let inputFields = []; // Store raw form_fields logic

        if (targetGameData.form_fields && Array.isArray(targetGameData.form_fields)) {
            // Save the entire form_fields array or simplified version
            // We need 'id' and 'name' mapping. e.g. "Game ID" -> id: 35
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
                gamecode: Date.now().toString(), // Improved slug generation needed, but using unique for now
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

        // 2. Sync Packges (Items)
        const items = targetGameData.items || [];
        console.log(`Found ${items.length} items.`);

        for (const item of items) {
            // Check if package exists for this game AND has the same name
            const [existingPackage] = await db.select().from(topupPackages).where(
                and(
                    eq(topupPackages.game_id, existingGame.id),
                    eq(topupPackages.package_name, item.name)
                )
            );

            if (existingPackage) {
                // Update origin_price and Recalculate selling prices
                console.log(`Updating package: ${item.name} - Origin: ${item.price}`);

                // USE GAME PERCENTAGES (Master Rule)
                const percentBasic = existingGame.profit_percent_basic || 0;
                const percentPro = existingGame.profit_percent_pro || 0;
                const percentPlus = existingGame.profit_percent_plus || 0;

                // Calculate Rule: price = origin * (1 + percent/100)
                const newPriceBasic = Math.ceil(item.price * (1 + percentBasic / 100));
                const newPricePro = Math.ceil(item.price * (1 + percentPro / 100));
                const newPricePlus = Math.ceil(item.price * (1 + percentPlus / 100));

                await db.update(topupPackages)
                    .set({
                        api_id: item.id, // Save external Package ID
                        origin_price: item.price,
                        price: newPriceBasic, // Default/fallback price
                        price_basic: newPriceBasic,
                        price_pro: newPricePro,
                        price_plus: newPricePlus,
                        fileAPI: { nap_id: item.id, game_api_id: targetGameData.id }, // Update nap_id AND game_api_id
                        // Sync package columns to match game for consistency
                        profit_percent_basic: percentBasic,
                        profit_percent_pro: percentPro,
                        profit_percent_plus: percentPlus
                    })
                    .where(eq(topupPackages.id, existingPackage.id));
            } else {
                // Create new package
                console.log(`Creating package: ${item.name}`);

                // USE GAME PERCENTAGES (Master Rule)
                const percentBasic = existingGame.profit_percent_basic || 0;
                const percentPro = existingGame.profit_percent_pro || 0;
                const percentPlus = existingGame.profit_percent_plus || 0;

                const priceBasic = Math.ceil(item.price * (1 + percentBasic / 100));
                const pricePro = Math.ceil(item.price * (1 + percentPro / 100));
                const pricePlus = Math.ceil(item.price * (1 + percentPlus / 100));

                await db.insert(topupPackages).values({
                    id: crypto.randomUUID(),
                    api_id: item.id, // Save external Package ID
                    game_id: existingGame.id,
                    package_name: item.name,
                    origin_price: item.price,

                    // Percentages
                    profit_percent_basic: percentBasic,
                    profit_percent_pro: percentPro,
                    profit_percent_plus: percentPlus,

                    // Calculated Prices
                    price: priceBasic, // Fallback
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
        console.log("Sync completed.");
    }
}

module.exports = new NapGame247Service();
