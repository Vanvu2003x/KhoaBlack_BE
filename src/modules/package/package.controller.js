const PackageService = require("./package.service");
const asyncHandler = require("../../utils/asyncHandler");

const PackageController = {
    getAllTopupPackages: asyncHandler(async (req, res) => {
        const result = await PackageService.getAllPackages();
        res.json(result);
    }),

    getTopupPackagesByGameSlug: asyncHandler(async (req, res) => {
        const result = await PackageService.getPackagesByGameSlug(req.params.game_code, req.query.id_server, req.isAdmin);
        res.json(result);
    }),

    createTopupPackage: asyncHandler(async (req, res) => {
        console.log("Create Pkg Body:", req.body);
        const result = await PackageService.createPackage(req.body, req.file);
        res.status(201).json(result);
    }),

    updateTopupPackage: asyncHandler(async (req, res) => {
        console.log("Update Pkg Body:", req.body);
        console.log("Update Pkg ID:", req.query.id);
        const result = await PackageService.updatePackage(req.query.id, req.body, req.file);
        console.log("Update Result:", result);
        res.json(result);
    }),

    getLogTopupPackages: asyncHandler(async (req, res) => {
        const result = await PackageService.getLogTypePackages();
        res.json(result);
    }),

    deleteTopupPackage: asyncHandler(async (req, res) => {
        const result = await PackageService.deletePackage(req.params.id);
        res.json(result);
    }),

    searchTopupPackages: asyncHandler(async (req, res) => {
        const result = await PackageService.searchPackages(req.query);
        res.json(result);
    }),

    updateStatus: asyncHandler(async (req, res) => {
        const result = await PackageService.updateStatus(req.query.id, req.body.newStatus);
        res.json(result);
    }),

    updateSale: asyncHandler(async (req, res) => {
        const result = await PackageService.updateSale(req.query.id, req.body.sale);
        res.json(result);
    }),

    getPackageById: asyncHandler(async (req, res) => {
        const result = await PackageService.getPackageById(req.params.id);
        if (!result) {
            return res.status(404).json({ message: "Package not found" });
        }
        res.json(result);
    })
};

module.exports = PackageController;
