const payos = require("../configs/payos.config");

async function createPayMentLinkService(requestData) {
await payos.confirmWebhook(`https://433f4cb009d9.ngrok-free.app/payos/webhook`)
  const paymentLinkData = await payos.createPaymentLink(requestData);

  return paymentLinkData;
}

module.exports = {
  createPayMentLinkService,
};
