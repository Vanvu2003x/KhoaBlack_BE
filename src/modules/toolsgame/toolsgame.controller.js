const toolsGameService = require('./toolsgame.service');
const asyncHandler = require('../../utils/asyncHandler');

const ToolsGameController = {
    manualSync: asyncHandler(async (req, res) => {
        // Run async (don't await fully if it takes long, OR await if we want to return result)
        // Since it's a manual trigger, user likely wants to know when it finishes or if it started.
        // syncIdentityV is async. Let's await it to return success/fail result.

        await toolsGameService.syncData();

        return res.status(200).json({
            status: "success",
            message: "Sync task completed successfully."
        });
    }),
};

module.exports = ToolsGameController;
