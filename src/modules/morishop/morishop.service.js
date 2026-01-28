const axios = require('axios');
const crypto = require('crypto');
const { db } = require('../../configs/drizzle');
const { games, topupPackages } = require('../../db/schema');
const { eq, and } = require('drizzle-orm');

class MorishopService {
    constructor() {
        this.baseUrl = 'https://api.morishopdiamond.com';
    }

    getApiKey() {
        // Prefer the key from environment variables, or allow passing it if needed in future
        return process.env.MORISHOP_API_KEY;
    }

    async makeRequest(endpoint, payload = {}) {
        try {
            const apiKey = this.getApiKey();
            if (!apiKey) {
                throw new Error("MORISHOP_API_KEY is not configured on the server.");
            }

            const response = await axios.post(`${this.baseUrl}${endpoint}`, {
                api_key: apiKey,
                ...payload
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 15000 // 15s timeout
            });

            return response.data;
        } catch (error) {
            console.error(`[Morishop] Error ${endpoint}:`, error.response?.data || error.message);
            return {
                status: false,
                msg: error.response?.data?.msg || error.message || 'Internal Server Error',
                data: null
            };
        }
    }

    async checkSaldo() {
        return await this.makeRequest('/saldo');
    }

    async getServices() {
        return await this.makeRequest('/service');
    }

    /**
     * @param {Object} data
     * @param {string} data.service_id
     * @param {string} data.target
     * @param {string} [data.kontak]
     * @param {string} [data.idtrx]
     */
    async createOrder(data) {
        return await this.makeRequest('/order', data);
    }

    /**
     * @param {string} orderId 
     */
    async checkStatus(orderId) {
        return await this.makeRequest('/status', { order_id: orderId });
    }

    /**
     * Sync specific games from Morishop API to database
     * @param {string[]} allowedGameNames - List of game names to sync
     */
    async syncGames(allowedGameNames = []) {
        console.log('[Morishop] Starting game sync...');
        console.log('[Morishop] Allowed games:', allowedGameNames);

        const response = await this.getServices();

        if (!response || !response.status || !response.data) {
            console.error('[Morishop] Failed to fetch services:', response?.msg);
            return;
        }

        // Morishop returns: { status: true, data: [{ id, nama_layanan, kategori, harga, status }] }
        // kategori = game name, nama_layanan = package name, id = service_id
        const allServices = response.data;
        console.log(`[Morishop] Found ${allServices.length} services in API`);

        // Group services by kategori (game name)
        const gameGroups = {};
        for (const service of allServices) {
            const gameName = service.kategori;
            if (!gameGroups[gameName]) {
                gameGroups[gameName] = [];
            }
            gameGroups[gameName].push(service);
        }

        console.log(`[Morishop] Found ${Object.keys(gameGroups).length} unique games`);

        for (const gameName of Object.keys(gameGroups)) {
            // Skip if not in allowed list
            if (!allowedGameNames.includes(gameName)) {
                continue;
            }

            console.log(`[Morishop] Syncing Game: ${gameName}`);

            // Check if game exists
            let [existingGame] = await db.select().from(games).where(eq(games.name, gameName));

            if (!existingGame) {
                // Create new game
                console.log(`[Morishop] Creating Game: ${gameName}`);
                const newGameId = crypto.randomUUID();
                const gamecode = gameName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

                await db.insert(games).values({
                    id: newGameId,
                    api_source: 'morishop',
                    name: gameName,
                    gamecode: gamecode,
                    thumbnail: '/uploads/default-game.png',
                    publisher: 'Morishop',
                    input_fields: [
                        { id: 'user_id', name: 'User ID', type: 'text' },
                        { id: 'server_id', name: 'Server ID', type: 'text' }
                    ]
                });

                [existingGame] = await db.select().from(games).where(eq(games.id, newGameId));
            } else {
                // Update existing game
                await db.update(games)
                    .set({
                        api_source: 'morishop',
                        input_fields: [{ id: 'target', name: 'User ID', type: 'text' }]
                    })
                    .where(eq(games.id, existingGame.id));
            }

            // Sync packages for this game
            const packages = gameGroups[gameName];
            console.log(`[Morishop] Found ${packages.length} packages for ${gameName}`);

            for (const pkg of packages) {
                // Skip inactive packages
                if (pkg.status !== 'aktif') {
                    continue;
                }

                // IDR to VND Exchange Rate (Hardcoded for now, can be moved to DB/Env)
                const IDR_TO_VND_RATE = 1.56;

                const serviceId = pkg.id;
                const packageName = pkg.nama_layanan?.trim();

                // Convert IDR (Rp) to VND
                const apiPrice = Math.ceil(pkg.harga_pro * IDR_TO_VND_RATE);

                if (!packageName) continue;

                // Check if package exists
                const [existingPackage] = await db.select().from(topupPackages).where(
                    and(
                        eq(topupPackages.game_id, existingGame.id),
                        eq(topupPackages.package_name, packageName)
                    )
                );

                // Get game markup and profit percentages
                const originMarkup = (existingGame.origin_markup_percent && existingGame.origin_markup_percent > 0) ? existingGame.origin_markup_percent : 1;
                const percentBasic = existingGame.profit_percent_basic || 0;
                const percentPro = existingGame.profit_percent_pro || 0;
                const percentPlus = existingGame.profit_percent_plus || 0;

                // Step 1: Calculate origin price from API price (VND)
                const originPrice = Math.ceil(apiPrice * originMarkup);

                // Step 2: Calculate selling prices from origin price
                const priceBasic = Math.ceil(originPrice * (1 + percentBasic / 100));
                const pricePro = Math.ceil(originPrice * (1 + percentPro / 100));
                const pricePlus = Math.ceil(originPrice * (1 + percentPlus / 100));

                if (existingPackage) {
                    // Update package
                    await db.update(topupPackages)
                        .set({
                            api_price: apiPrice,
                            origin_price: originPrice,
                            price: priceBasic,
                            price_basic: priceBasic,
                            price_pro: pricePro,
                            price_plus: pricePlus,
                            fileAPI: { service_id: serviceId, api_source: 'morishop' },
                            profit_percent_basic: percentBasic,
                            profit_percent_pro: percentPro,
                            profit_percent_plus: percentPlus
                        })
                        .where(eq(topupPackages.id, existingPackage.id));
                } else {
                    // Create new package
                    console.log(`[Morishop] Creating package: ${packageName}`);

                    await db.insert(topupPackages).values({
                        id: crypto.randomUUID(),
                        game_id: existingGame.id,
                        package_name: packageName,
                        api_price: apiPrice,
                        origin_price: originPrice,
                        price: priceBasic,
                        price_basic: priceBasic,
                        price_pro: pricePro,
                        price_plus: pricePlus,
                        profit_percent_basic: percentBasic,
                        profit_percent_pro: percentPro,
                        profit_percent_plus: percentPlus,
                        status: 'active',
                        package_type: 'uid',
                        thumbnail: '/uploads/default-package.png',
                        fileAPI: { service_id: serviceId, api_source: 'morishop' }
                    });
                }
            }
        }

        console.log('[Morishop] Game sync completed.');
    }

    /**
     * Forward order to Morishop API
     * @param {string} serviceId - The service_id from fileAPI
     * @param {string} userId - User ID from account_info
     * @param {string} serverId - Server ID from account_info
     * @param {string} [idtrx] - Optional internal transaction ID (order ID from our system)
     * @param {string} [kontak] - Optional contact phone
     */
    async buyItem(serviceId, userId, serverId, idtrx = null, kontak = null) {
        // Format target as uid|server_id if serverId exists, otherwise just uid
        const target = serverId ? `${userId}|${serverId}` : userId;
        console.log(`[Morishop] Forwarding order: service=${serviceId}, target=${target}, idtrx=${idtrx}`);

        if (!serviceId) {
            console.error('[Morishop] Missing serviceId for buyItem');
            return { status: false, msg: 'Missing serviceId' };
        }

        const orderData = {
            service_id: serviceId, // Reverted to service_id as per user example
            target: target,
            kontak: kontak || '08123456789', // Default contact to prevent "Input tidak boleh kosong"
            callback: ''
        };

        if (idtrx) {
            orderData.idtrx = idtrx;
        }

        const result = await this.createOrder(orderData);
        console.log('[Morishop] Order result:', result);

        return result;
    }

    /**
     * Check order status from Morishop
     * @param {string} orderId - The order ID from Morishop response
     */
    async checkOrderStatus(orderId) {
        console.log(`[Morishop] Checking order status: ${orderId}`);
        const result = await this.checkStatus(orderId);
        console.log('[Morishop] Status result:', result);
        return result;
    }
}

module.exports = new MorishopService();
