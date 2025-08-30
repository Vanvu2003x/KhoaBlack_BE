const { transporter } = require("../configs/nodomailer.config");

// Base template chung
function baseTemplate(title, content) {
  return `
  <div style="font-family: Arial, sans-serif; background: #f0f2f5; padding: 20px;">
    <div style="max-width: 650px; margin: auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 25px;">
      
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 25px;">
        <img src="https://lh3.googleusercontent.com/fife/ALs6j_Frpd17RkwIeKsdo46gz0v1RHw9qEi57tN-CzYa70_o0qQGuOfCT6pa6vlnlPrkf-Wkeer5hizxYwzVtqKM8KgknW0Wx6w-plAH--shKkoRQV6rbldRuczow_vP0HhkkfYWA84L7WYV-Nq-rxmaIMrNZ1Bj3LZbnYuWMuAzjhcE8ULhzukD_KRMH5pkW3Z9gk8h5PmAtvDgI4Rnu5fydMKup1cQCEIkyYcPKUDH5Wp_ji8R581OPdiwKqbFtE84TYA4h0f9kj6u7FfacFYmEU6dF3mYSHRkbtdmi9l_866g9r_k28dg8PZ3lWzY1gGgrzb1q49-iZpUITbuYScre6D82mLbhuElp280kNS5fVhl829vD5TatRbYXNKJBVo2cqzAX-s3HPS8qo5mZtIxfewd6pxNk5hEc2p67oejXqN3zuaYW69VxpMBRTqpcSEejIVDg_JGQVjepEA3tN84E6ClLyiyjTR2UQ3D2XwE2cyf938NJEpb-lQOUd5Ohy0ilCXhDId3LfqEjHs5f-eeXIScvEeOoa_eNgXYmpl2OgYbaFqZOlzWDjXwLuE8gydAEtb2UwAGpjoX4UQ8Hp2y6-54LlH8swuNLlN-Rq4mA-f1UdZ1DHLMHO6-YLpJ7REExSkM0BCud5G8LCYjrLn_B0uFHqvgwVd61cEjUE0_gEI2ZYlH8M9WfGhltTuSth-23da_QTkeimegLywkVpsJXaOI19s7sAe9u6CIJGTatxw-PJpr85fJuSpvCfyGqc5qYV7WV9bimwNyMtxATR85Sw3h_F1zNrhV5uHk2buo6QHqVhEC1igBcbodrhOovFEAtmJXFaIO-i6XcNnaZcNSFUFW_s4G789r8uCrJbUFFz7ii4cnHe_R54Y-NYFNX-fRoLWOsVF6MjSSTonkukKeadbahz_R28CX4tM6q6zN2uh8oBVneLmAeWcWEqzRYPONtomnTWhfyJqQ691i77IHSgXwd2lwYPnDNIRbPa_fYjBcmwhQexncIYWpIT92EBs=w1358-h650?auditContext=prefetch"
             alt="Napgameuytin Logo" style="height: 60px;"/>
      </div>

      <!-- Title -->
      <h2 style="color: #111827; text-align: center; margin-bottom: 20px;">${title}</h2>

      <!-- Content -->
      <div style="margin-top: 10px; font-size: 15px; color: #374151; line-height:1.6;">
        ${content}
      </div>

      <!-- Footer -->
      <hr style="margin: 30px 0;">
      <p style="font-size: 12px; color: #6b7280; text-align: center;">
        © 2025 Napgameuytin. All rights reserved.
      </p>
    </div>
  </div>`;
}

// ===================== SEND OTP ĐĂNG KÝ =====================
async function sendOTP(email, otp) {
  try {
    const html = baseTemplate(
      "Xác thực tài khoản Napgameuytin",
      `<p>Xin chào,</p>
       <p>Bạn vừa đăng ký tài khoản trên <strong>Napgameuytin</strong>.</p>
       <p>Mã OTP của bạn là:</p>
       <div style="text-align: center; margin: 20px 0;">
         <span style="font-size: 24px; font-weight: bold; color: #111; background: #f3f4f6; padding: 10px 20px; border-radius: 8px; display: inline-block;">
           ${otp}
         </span>
       </div>
       <p style="color: #DC2626;"><strong>Mã OTP chỉ có hiệu lực trong 5 phút.</strong></p>
       <p><em>Vui lòng không chia sẻ mã này với bất kỳ ai.</em></p>`
    );

    const info = await transporter.sendMail({
      from: '"Napgameuytin" <napgameuytin2111@gmail.com>',
      to: email,
      subject: "Xác thực tài khoản Napgameuytin",
      html,
    });

    console.log("✅ Email OTP đã gửi:", info.messageId);
    return info;
  } catch (error) {
    console.error("Lỗi gửi OTP:", error);
    throw error;
  }
}

// ===================== SEND OTP KHÔI PHỤC MẬT KHẨU =====================
async function sendOTPRePass(email, otp) {
  try {
    const html = baseTemplate(
      "Khôi phục mật khẩu - Napgameuytin",
      `<p>Xin chào,</p>
       <p>Bạn vừa yêu cầu lấy lại mật khẩu trên <strong>Napgameuytin</strong>.</p>
       <p>Mã OTP khôi phục mật khẩu của bạn là:</p>
       <div style="text-align: center; margin: 20px 0;">
         <span style="font-size: 24px; font-weight: bold; color: #111; background: #f3f4f6; padding: 10px 20px; border-radius: 8px; display: inline-block;">
           ${otp}
         </span>
       </div>
       <p style="color: #DC2626;"><strong>Mã OTP chỉ có hiệu lực trong 5 phút.</strong></p>
       <p><em>Nếu bạn không yêu cầu, hãy bỏ qua email này.</em></p>`
    );

    const info = await transporter.sendMail({
      from: '"Napgameuytin" <napgameuytin2111@gmail.com>',
      to: email,
      subject: "Xác thực khôi phục mật khẩu Napgameuytin",
      html,
    });

    console.log("✅ Email OTP khôi phục đã gửi:", info.messageId);
    return info;
  } catch (error) {
    console.error("Lỗi gửi OTP khôi phục:", error);
    throw error;
  }
}

// ===================== SEND ACC ĐÃ MUA =====================
async function sendAcc(email, data, order) {
  try {
    const html = baseTemplate(
      "Thông tin tài khoản đã mua",
      `<p>Xin chào,</p>
       <p>Bạn vừa mua acc trên <strong>Napgameuytin.vn</strong>. Thông tin chi tiết đơn hàng và acc như sau:</p>

       <table style="width:100%; border-collapse: collapse; margin: 15px 0; font-size:14px;">
         <tr style="background:#f9fafb;">
           <td style="padding:10px; border:1px solid #e5e7eb;">Mã đơn hàng</td>
           <td style="padding:10px; border:1px solid #e5e7eb;"><strong>${order.id}</strong></td>
         </tr>
         <tr>
           <td style="padding:10px; border:1px solid #e5e7eb; background:#f9fafb;">Giá</td>
           <td style="padding:10px; border:1px solid #e5e7eb;"><strong>${order.price ?? "N/A"} VNĐ</strong></td>
         </tr>
         <tr style="background:#f9fafb;">
           <td style="padding:10px; border:1px solid #e5e7eb;">Trạng thái</td>
           <td style="padding:10px; border:1px solid #e5e7eb;"><strong>${order.status}</strong></td>
         </tr>
         <tr>
           <td style="padding:10px; border:1px solid #e5e7eb; background:#f9fafb;">Thời gian tạo</td>
           <td style="padding:10px; border:1px solid #e5e7eb;"><strong>${new Date(order.create_at).toLocaleString()}</strong></td>
         </tr>
       </table>

       <table style="width:100%; border-collapse: collapse; margin: 15px 0; font-size:14px;">
         <tr style="background:#f9fafb;">
           <td style="padding:10px; border:1px solid #e5e7eb;">Tài khoản</td>
           <td style="padding:10px; border:1px solid #e5e7eb;"><strong>${data.account}</strong></td>
         </tr>
         <tr>
           <td style="padding:10px; border:1px solid #e5e7eb; background:#f9fafb;">Mật khẩu</td>
           <td style="padding:10px; border:1px solid #e5e7eb;"><strong>${data.password}</strong></td>
         </tr>
         <tr style="background:#f9fafb;">
           <td style="padding:10px; border:1px solid #e5e7eb;">Ghi chú</td>
           <td style="padding:10px; border:1px solid #e5e7eb;">${data.note || "Không có"}</td>
         </tr>
       </table>

       <p><em>Vui lòng đổi mật khẩu ngay sau khi đăng nhập để bảo mật.</em></p>`
    );

    const info = await transporter.sendMail({
      from: '"Napgameuytin" <napgameuytin2111@gmail.com>',
      to: email,
      subject: `Thông tin acc bạn vừa mua - Đơn #${order.id}`,
      html,
    });

    console.log("✅ Acc đã gửi:", info.messageId);
    return info;
  } catch (error) {
    console.error("Lỗi gửi acc:", error);
    throw error;
  }
}

// ===================== SEND TRẠNG THÁI ĐƠN =====================
async function sendStatus(email, order) {
  try {
    const statusMap = {
      success: { text: "HOÀN THÀNH ✅", color: "#16a34a" },
      cancel: { text: "BỊ HỦY ❌", color: "#dc2626" },
      pending: { text: "ĐANG CHỜ ⏳", color: "#f59e0b" },
      processing: { text: "ĐANG XỬ LÝ 🔄", color: "#3b82f6" },
    };

    const { text, color } = statusMap[order.status] || { text: order.status, color: "#374151" };

    const html = baseTemplate(
      "Trạng thái đơn hàng Napgameuytin",
      `<p>Xin chào,</p>
       <p>Đơn hàng <strong>${order.id}</strong> hiện tại đã 
          <span style="color:${color}; font-weight:bold;">${text}</span>.
       </p>
       <table style="width:100%; border-collapse: collapse; margin: 15px 0; font-size:14px;">
         <tr style="background:#f9fafb;">
           <td style="padding:10px; border:1px solid #e5e7eb;">Mã đơn hàng</td>
           <td style="padding:10px; border:1px solid #e5e7eb;"><strong>${order.id}</strong></td>
         </tr>
         <tr>
           <td style="padding:10px; border:1px solid #e5e7eb; background:#f9fafb;">Giá</td>
           <td style="padding:10px; border:1px solid #e5e7eb;"><strong>${order.amount ?? "N/A"} VNĐ</strong></td>
         </tr>
         <tr style="background:#f9fafb;">
           <td style="padding:10px; border:1px solid #e5e7eb;">Trạng thái</td>
           <td style="padding:10px; border:1px solid #e5e7eb;"><strong>${order.status}</strong></td>
         </tr>
       </table>
        <p>Chi tiết đơn hàng, vui lòng xem ở lịch sử đặt đơn trên web của chúng tôi.</p>
       <p>Nếu có thắc mắc, vui lòng liên hệ bộ phận hỗ trợ của chúng tôi.</p>`
    );

    const info = await transporter.sendMail({
      from: '"Napgameuytin" <napgameuytin2111@gmail.com>',
      to: email,
      subject: `Trạng thái đơn hàng #${order.id}`,
      html,
    });

    console.log("✅ Email trạng thái đã gửi:", info.messageId);
    return info;
  } catch (error) {
    console.error("Lỗi gửi trạng thái:", error);
    throw error;
  }
}

module.exports = { sendOTP, sendOTPRePass, sendAcc, sendStatus };
