const axios = require('axios');

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
                }
            });

            return response.data;
        } catch (error) {
            console.error(`Morishop API Error [${endpoint}]:`, error.response?.data || error.message);
            // Return a standardized error structure if the API call fails externally
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
}

module.exports = new MorishopService();
