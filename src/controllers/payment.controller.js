const { addLog, getLogById, updateLog } = require("../models/toup_wallet_log.model");
const { recharge_balance } = require("../models/user.model");
require('dotenv').config();

exports.createQR = async (req, res) => {
  try {
    const nganhang = "MBB"
    const stk = "0963575203"
    const chusohuu = "VU%20DINHH%20VAN"
    const { amount } = req.body;
    const user_id = req.user.id;
    if (!amount) {
      return res.status(400).json({ message: "Thiếu amount" });
    }

    const Log = await addLog({ user_id, amount })
    const rawId = Log.id.replace(/[^a-zA-Z0-9]/g, '');
    const memo = `.${rawId}.`;
    const url = `https://apiqr.web2m.com/api/generate/${nganhang}/${stk}/${chusohuu}?amount=${amount}&memo=${memo}&is_mask=0&bg=12`;
    res.json({
      id: Log.id,
      urlPayment: url,
      amount: amount,
      name: req.user.name,
      email: req.user.email,
      bank_name: nganhang,
      accountNumber: stk,
      accountHolder: chusohuu,
      memo: memo

    });
  } catch (err) {
    console.error("Lỗi tạo QR:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};


exports.Web2mHook = async (req, res) => {
  const data = req.body;

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Thiếu token hoặc định dạng sai' });
  }
  const token = authHeader.split(' ')[1];
  const web2mToken = process.env.TOKEN_WEB2M;
  
  if (token !== web2mToken) {
    console.log("Token sai")
    return res.status(401).json({ message: 'Token sai' });

  }
  
  if (data.status === true && Array.isArray(data.data)) {
    for (const value of data.data) {
      try {
        const match = value.description.match(/\.(.*?)\.-/);
        const logId = match ? match[1] : null;
        const log = await getLogById(logId);
        if (log.status === 'Đang Chờ') {
         
          await recharge_balance(log.user_id, value.amount, 'credit');
          await updateLog(log.id,"Thành Công");
        }
      } catch (err) {
      }
    }
  } else {
    console.log('Invalid webhook data or transaction failed.');
  }

  res.sendStatus(200);
};
