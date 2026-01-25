const napGame247Service = require('../napgame247/napgame247.service');
const morishopService = require('../morishop/morishop.service');
const { db } = require("../../configs/drizzle");
const { orders } = require("../../db/schema");
const { eq, and, isNotNull, sql } = require("drizzle-orm");

class ToolsGameService {
    /**
     * Helper logic to be executed periodically
     */
    async runScheduledTask() {
        try {
            console.log(`[${new Date().toISOString()}] Running ToolsGame scheduled task...`);

            // 1. Sync NapGame247 Identity V (or all synced games)
            await napGame247Service.syncIdentityV();

            // 2. Sync Morishop Games
            await morishopService.syncGames([
                'Mobile Legends Global',
                'Genshin Impact',
                'Honkai: Star Rail',
                'Zenless Zone Zero',
                'Punishing Gray Raven',
                'Honor Of Kings'
            ]);

            // 3. Check Order Statuses
            console.log("Checking pending NapGame247 orders...");
            // Get orders that are pending AND have an api_id (meaning they were forwarded)
            const pendingOrders = await db.select().from(orders).where(
                and(
                    eq(orders.status, 'pending'),
                    isNotNull(orders.api_id)
                )
            );

            console.log(`Found ${pendingOrders.length} pending orders to check.`);

            for (const order of pendingOrders) {
                const apiResult = await napGame247Service.checkOrderStatus(order.api_id);
                // User snippet response:
                // { "status": "success", "data": { "status": "pending", ... } }
                // OR
                // { ..., "data": { "status": "paid", ... } } -> "paid" might mean processing?
                // User said: pending (Đang xử lý), success (Thành công), cancel (Hủy đơn)
                // In snippet: "status": "paid" inside data.

                if (apiResult && apiResult.status === 'success' && apiResult.data) {
                    const remoteData = apiResult.data;

                    // User response: "status":"complete" in data, but "order_details":[{"status":"success"}]
                    // Priority: Chech order_details first if available
                    let remoteStatus = remoteData.status;

                    if (remoteData.order_details && Array.isArray(remoteData.order_details) && remoteData.order_details.length > 0) {
                        // Assuming 1 order = 1 package, check the first detail
                        remoteStatus = remoteData.order_details[0].status;
                    }

                    console.log(`Order #${order.id} (Ext: ${order.api_id}) -> Remote Status: ${remoteStatus}`);

                    // Map remote status to local
                    if (remoteStatus === 'success' || remoteStatus === 'complete' || remoteStatus === 'completed') {
                        // Success
                        await db.update(orders).set({ status: 'success', updated_at: new Date() }).where(eq(orders.id, order.id));
                        console.log(`Order #${order.id} marked as SUCCESS.`);

                    } else if (remoteStatus === 'cancel' || remoteStatus === 'cancelled' || remoteStatus === 'failed') {
                        // Cancel/Fail
                        const UserService = require("../user/user.service");

                        await db.transaction(async (tx) => {
                            await tx.update(orders).set({ status: 'cancelled', updated_at: new Date() }).where(eq(orders.id, order.id));
                            const refundAmount = Number(order.amount);
                            await UserService.updateBalance(order.user_id, refundAmount, 'credit', `Hoàn tiền đơn hàng #${order.id} (Hủy từ nguồn)`);
                        });
                        console.log(`Order #${order.id} marked as CANCELLED and refunded.`);
                    }
                    // If 'pending' or 'paid' (processing), do nothing.
                }
            }

            console.log(`[${new Date().toISOString()}] ToolsGame task completed successfully.`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error running ToolsGame task:`, error);
        }
    }
}

module.exports = new ToolsGameService();
