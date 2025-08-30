const payos = require("../configs/payos.config");

async function createPayMentLinkService(requestData) {
  const paymentLinkData = await payos.createPaymentLink(requestData);

  return paymentLinkData;
}

module.exports = {
  createPayMentLinkService,
};
