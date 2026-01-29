const napGame247Service = require('../napgame247/napgame247.service');
const morishopService = require('../morishop/morishop.service');
const { db } = require("../../configs/drizzle");
const { orders, users, topupPackages, games } = require("../../db/schema");
const { eq, and, isNotNull, sql } = require("drizzle-orm");
const { sendOrderSuccessEmail, sendOrderFailureEmail } = require("../../services/nodemailer.service");

class ToolsGameService {
    /**
     * Get order details with user email, game name, and package name for email
     */
    async getOrderDetailsForEmail(order) {
        try {
            const [user] = await db.select().from(users).where(eq(users.id, order.user_id));
            const [pkg] = await db.select().from(topupPackages).where(eq(topupPackages.id, order.package_id));
            const [game] = pkg ? await db.select().from(games).where(eq(games.id, pkg.game_id)) : [null];

            return {
                id: order.id,
                amount: order.amount,
                created_at: order.created_at,
                user_email: user?.email,
                user_name: user?.name || user?.email?.split('@')[0],
                game_name: game?.name || 'N/A',
                package_name: pkg?.package_name || 'N/A',
                account_info: order.account_info
            };
        } catch (err) {
            console.error('[ToolsGame] Error getting order details:', err.message);
            return null;
        }
    }

    /**
     * Helper logic to be executed periodically
     */
    /**
     * Sync Games and Packages from External APIs
     * Should run less frequently (e.g., every hour)
     */
    async syncData() {
        try {
            console.log(`[${new Date().toISOString()}] Running Game Sync...`);

            // 1. Sync NapGame247 (Identity V, HSR, LoveAndDeepspace...)
            await napGame247Service.syncAllGames();

            // 2. Sync Morishop Games
            await morishopService.syncGames([
                'Mobile Legends Global',
                'Genshin Impact',
                'Honkai: Star Rail',
                'Zenless Zone Zero',
                'Punishing Gray Raven',
                'Punishing: Gray Raven', // Added variation just in case
                'Honor Of Kings'
            ]);

            console.log(`[${new Date().toISOString()}] Game Sync completed.`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error running Game Sync:`, error);
        }
    }

    /**
     * Check Pending Orders Status
     * Should run frequently (e.g., every minute)
     */
    async checkPendingOrders() {
        try {
            console.log("Checking pending orders...");
            // Get orders that are pending/processing AND have an api_id
            const pendingOrders = await db.select().from(orders).where(
                and(
                    sql`${orders.status} IN ('pending', 'processing')`,
                    isNotNull(orders.api_id)
                )
            );

            console.log(`Found ${pendingOrders.length} pending orders to check.`);

            if (pendingOrders.length === 0) {
                console.log("No pending orders found. Skipping API calls.");
                return;
            }

            // Parallel Processing using Promise.all - DISABLED for performance
            // Limit concurrency if needed, but for < 100 orders, Promise.all calls API simultaneously, potentially causing lag
            // Use sequential processing instead
            for (const order of pendingOrders) {
                await this.processSingleOrder(order);
            }

            console.log(`[${new Date().toISOString()}] Check Pending Orders completed.`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error checking pending orders:`, error);
        }
    }

    async processSingleOrder(order) {
        try {
            // Determine API source by api_id format
            // Morishop: ORDER... format, NapGame247: numeric ID
            const isMorishop = order.api_id && order.api_id.toString().startsWith('ORDER');

            let apiResult;
            if (isMorishop) {
                // Check Morishop order
                apiResult = await morishopService.checkOrderStatus(order.api_id);
            } else {
                // Check NapGame247 order
                apiResult = await napGame247Service.checkOrderStatus(order.api_id);
            }

            if (!apiResult) return;

            // Handle Morishop response: { status: true, data: { status: "success"|"pending" } }
            if (isMorishop && apiResult.status === true && apiResult.data) {
                const remoteStatus = apiResult.data.status;
                console.log(`Order #${order.id} (Morishop: ${order.api_id}) -> Remote Status: ${remoteStatus}`);

                if (remoteStatus === 'success' || remoteStatus === 'completed') {
                    await db.update(orders).set({ status: 'success', updated_at: new Date() }).where(eq(orders.id, order.id));
                    console.log(`Order #${order.id} marked as SUCCESS.`);

                    // Send success email
                    const orderDetails = await this.getOrderDetailsForEmail(order);
                    if (orderDetails?.user_email) {
                        sendOrderSuccessEmail(orderDetails.user_email, orderDetails).catch(err =>
                            console.error(`Failed to send success email for order #${order.id}:`, err.message)
                        );
                    }
                } else if (remoteStatus === 'cancel' || remoteStatus === 'cancelled' || remoteStatus === 'failed') {
                    const UserService = require("../user/user.service");
                    await db.transaction(async (tx) => {
                        await tx.update(orders).set({ status: 'cancelled', updated_at: new Date() }).where(eq(orders.id, order.id));
                        const refundAmount = Number(order.amount);
                        await UserService.updateBalance(order.user_id, refundAmount, 'credit', `Hoàn tiền đơn hàng #${order.id} (Hủy từ Morishop)`);
                    });
                    console.log(`Order #${order.id} marked as CANCELLED and refunded.`);

                    // Send failure email
                    const orderDetails = await this.getOrderDetailsForEmail(order);
                    if (orderDetails?.user_email) {
                        sendOrderFailureEmail(orderDetails.user_email, orderDetails, 'Đơn hàng bị hủy từ nhà cung cấp').catch(err =>
                            console.error(`Failed to send failure email for order #${order.id}:`, err.message)
                        );
                    }
                }
                // pending -> do nothing

            } else if (!isMorishop && apiResult.status === 'success' && apiResult.data) {
                // Handle NapGame247 response
                const remoteData = apiResult.data;
                let remoteStatus = remoteData.status;

                if (remoteData.order_details && Array.isArray(remoteData.order_details) && remoteData.order_details.length > 0) {
                    remoteStatus = remoteData.order_details[0].status;
                }

                console.log(`Order #${order.id} (NapGame247: ${order.api_id}) -> Remote Status: ${remoteStatus}`);

                if (remoteStatus === 'success' || remoteStatus === 'complete' || remoteStatus === 'completed') {
                    await db.update(orders).set({ status: 'success', updated_at: new Date() }).where(eq(orders.id, order.id));
                    console.log(`Order #${order.id} marked as SUCCESS.`);

                    // Send success email
                    const orderDetails = await this.getOrderDetailsForEmail(order);
                    if (orderDetails?.user_email) {
                        sendOrderSuccessEmail(orderDetails.user_email, orderDetails).catch(err =>
                            console.error(`Failed to send success email for order #${order.id}:`, err.message)
                        );
                    }
                } else if (remoteStatus === 'cancel' || remoteStatus === 'cancelled' || remoteStatus === 'failed') {
                    const UserService = require("../user/user.service");
                    await db.transaction(async (tx) => {
                        await tx.update(orders).set({ status: 'cancelled', updated_at: new Date() }).where(eq(orders.id, order.id));
                        const refundAmount = Number(order.amount);
                        await UserService.updateBalance(order.user_id, refundAmount, 'credit', `Hoàn tiền đơn hàng #${order.id} (Hủy từ NapGame247)`);
                    });
                    console.log(`Order #${order.id} marked as CANCELLED and refunded.`);

                    // Send failure email
                    const orderDetails = await this.getOrderDetailsForEmail(order);
                    if (orderDetails?.user_email) {
                        sendOrderFailureEmail(orderDetails.user_email, orderDetails, 'Đơn hàng bị hủy từ nhà cung cấp').catch(err =>
                            console.error(`Failed to send failure email for order #${order.id}:`, err.message)
                        );
                    }
                }
            }
        } catch (orderError) {
            console.error(`Error checking order #${order.id}:`, orderError.message);
        }
    }
}

module.exports = new ToolsGameService();
