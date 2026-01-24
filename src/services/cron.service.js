const cron = require('node-cron');
const toolsGameService = require('../modules/toolsgame/toolsgame.service');

const initCronJobs = () => {
    console.log('Initializing Cron Jobs...');

    // Schedule task to run every 5 minutes
    // Cron pattern: */5 * * * *
    cron.schedule('*/5 * * * *', async () => {
        console.log('Triggering scheduled task: ToolsGame');
        await toolsGameService.runScheduledTask();
    });

    console.log('Cron Jobs scheduled successfully.');
};

module.exports = {
    initCronJobs
};
