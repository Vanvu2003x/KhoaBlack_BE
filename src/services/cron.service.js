const cron = require('node-cron');
const toolsGameService = require('../modules/toolsgame/toolsgame.service');

const WalletLogService = require('../modules/walletLog/walletLog.service');

const initCronJobs = () => {
    console.log('Initializing Cron Jobs...');

    // 1. Check Order Statuses (Every 5 minutes)
    // Runs at minute 0, 5, 10...
    cron.schedule('*/5 * * * *', async () => {
        console.log('Triggering: Check Pending Orders');
        await toolsGameService.checkPendingOrders();
    });

    // 2. Sync Games Data (Every 4 hours)
    // Runs at minute 0 of hour 0, 4, 8, 12, 16, 20
    cron.schedule('0 */4 * * *', async () => {
        console.log('Triggering: Sync Game Data');
        await toolsGameService.syncData();
    });

    // 3. Auto-fail Expired Wallet Logs (Every 20 minutes, offset by 10)
    // Runs at minute 10, 30, 50
    cron.schedule('10,30,50 * * * *', async () => {
        console.log('Triggering: Check Expired Transactions');
        await WalletLogService.autoCheckExpiredTransactions();
    });

    console.log('Cron Jobs scheduled successfully (Optimized).');
};

module.exports = {
    initCronJobs
};
