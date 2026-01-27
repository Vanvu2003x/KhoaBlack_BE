const cron = require('node-cron');
const toolsGameService = require('../modules/toolsgame/toolsgame.service');

const initCronJobs = () => {
    console.log('Initializing Cron Jobs...');

    // 1. Check Order Statuses (Less Frequent - Every 20 minutes)
    cron.schedule('*/20 * * * *', async () => {
        console.log('Triggering: Check Pending Orders');
        await toolsGameService.checkPendingOrders();
    });

    // 2. Sync Games Data (Less Frequent - Every 30 minutes)
    cron.schedule('*/30 * * * *', async () => {
        console.log('Triggering: Sync Game Data');
        await toolsGameService.syncData();
    });

    console.log('Cron Jobs scheduled successfully.');
};

module.exports = {
    initCronJobs
};
