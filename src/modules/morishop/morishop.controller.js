const morishopService = require('./morishop.service');

const checkSaldo = async (req, res) => {
    try {
        const result = await morishopService.checkSaldo();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ status: false, msg: error.message });
    }
};

const getServices = async (req, res) => {
    try {
        const result = await morishopService.getServices();

        // Ensure successful response structure even if upstream fails
        if (!result) {
            return res.status(502).json({ status: false, msg: 'Invalid response from Morishop' });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ status: false, msg: error.message });
    }
};

const createOrder = async (req, res) => {
    try {
        const { service_id, target, kontak, idtrx } = req.body;

        if (!service_id || !target) {
            return res.status(400).json({ status: false, msg: 'Missing service_id or target' });
        }

        const result = await morishopService.createOrder({ service_id, target, kontak, idtrx });
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ status: false, msg: error.message });
    }
};

const checkStatus = async (req, res) => {
    try {
        const { order_id } = req.body;

        if (!order_id) {
            return res.status(400).json({ status: false, msg: 'Missing order_id' });
        }

        const result = await morishopService.checkStatus(order_id);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ status: false, msg: error.message });
    }
};

module.exports = {
    checkSaldo,
    getServices,
    createOrder,
    checkStatus
};
