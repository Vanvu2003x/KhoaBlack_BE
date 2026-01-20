const AccService = require("./acc.service");
const asyncHandler = require("../../utils/asyncHandler");

const AccController = {
    createAcc: asyncHandler(async (req, res) => {
        try {
            // Validate file upload
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Image file is required'
                });
            }

            // Prepare data with file path
            const accData = {
                ...req.body,
                image: req.file.filename
            };

            const result = await AccService.createAcc(accData);
            res.status(201).json({
                success: true,
                message: 'Account created successfully',
                data: result
            });
        } catch (error) {
            console.error('Create ACC error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to create account'
            });
        }
    }),

    getAccById: asyncHandler(async (req, res) => {
        try {
            const result = await AccService.getAccById(req.params.id);
            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Account not found'
                });
            }
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Get ACC by ID error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to fetch account'
            });
        }
    }),

    getAccByGame: asyncHandler(async (req, res) => {
        try {
            if (!req.query.game_id) {
                return res.status(400).json({
                    success: false,
                    message: 'game_id is required'
                });
            }

            const result = await AccService.getAccByGame(req.query);
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Get ACC by game error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to fetch accounts'
            });
        }
    }),

    updateAcc: asyncHandler(async (req, res) => {
        try {
            const updateData = { ...req.body };

            // If new image uploaded, update image field
            if (req.file) {
                updateData.image = req.file.filename;
            }

            const result = await AccService.updateAcc(req.params.id, updateData);
            res.json({
                success: true,
                message: 'Account updated successfully',
                data: result
            });
        } catch (error) {
            console.error('Update ACC error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update account'
            });
        }
    }),

    deleteAcc: asyncHandler(async (req, res) => {
        try {
            const result = await AccService.deleteAcc(req.params.id);
            res.json({
                success: true,
                message: 'Account deleted successfully',
                data: result
            });
        } catch (error) {
            console.error('Delete ACC error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to delete account'
            });
        }
    }),

    getAccStats: asyncHandler(async (req, res) => {
        try {
            const result = await AccService.getAccStats();
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Get ACC stats error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to fetch statistics'
            });
        }
    }),

    filterAccByGame: asyncHandler(async (req, res) => {
        try {
            const result = await AccService.filterAccByGame(req.query);
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Filter ACC error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to filter accounts'
            });
        }
    })
};

module.exports = AccController;
