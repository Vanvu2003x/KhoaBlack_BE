const payos = require("../configs/payos.config");

async function setupWebhook() {
 await payos.confirmWebhook(`https://433f4cb009d9.ngrok-free.app/payos/webhook`)
  console.log("✅ Webhook confirmed with PayOS");
}

setupWebhook()