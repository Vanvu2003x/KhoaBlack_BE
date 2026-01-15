const { transporter } = require("../configs/nodomailer.config");

/**
 * Premium Gaming Email Template
 * Style: Modern, bold gradients, high contrast, clean typography.
 */
const STYLES = {
  // Brand Gradient: Indigo -> Purple
  brandGradient: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
  brandColor: "#6366F1",

  // Security Gradient: Red -> Orange (For Forgot Password)
  securityGradient: "linear-gradient(135deg, #DC2626 0%, #EA580C 100%)",
  securityColor: "#DC2626",

  accentColor: "#F472B6", // Pinkish accent
  successColor: "#10B981",
  errorColor: "#EF4444",
  warningColor: "#F59E0B",
  bgBody: "#F0F2F5",
  bgCard: "#FFFFFF",
  textMain: "#1F2937",
  textMuted: "#6B7280",
};

// SVG Icons as strings for better email support (no external reliance)
const ICONS = {
  logo: "https://lh3.googleusercontent.com/fife/ALs6j_Frpd17RkwIeKsdo46gz0v1RHw9qEi57tN-CzYa70_o0qQGuOfCT6pa6vlnlPrkf-Wkeer5hizxYwzVtqKM8KgknW0Wx6w-plAH--shKkoRQV6rbldRuczow_vP0HhkkfYWA84L7WYV-Nq-rxmaIMrNZ1Bj3LZbnYuWMuAzjhcE8ULhzukD_KRMH5pkW3Z9gk8h5PmAtvDgI4Rnu5fydMKup1cQCEIkyYcPKUDH5Wp_ji8R581OPdiwKqbFtE84TYA4h0f9kj6u7FfacFYmEU6dF3mYSHRkbtdmi9l_866g9r_k28dg8PZ3lWzY1gGgrzb1q49-iZpUITbuYScre6D82mLbhuElp280kNS5fVhl829vD5TatRbYXNKJBVo2cqzAX-s3HPS8qo5mZtIxfewd6pxNk5hEc2p67oejXqN3zuaYW69VxpMBRTqpcSEejIVDg_JGQVjepEA3tN84E6ClLyiyjTR2UQ3D2XwE2cyf938NJEpb-lQOUd5Ohy0ilCXhDId3LfqEjHs5f-eeXIScvEeOoa_eNgXYmpl2OgYbaFqZOlzWDjXwLuE8gydAEtb2UwAGpjoX4UQ8Hp2y6-54LlH8swuNLlN-Rq4mA-f1UdZ1DHLMHO6-YLpJ7REExSkM0BCud5G8LCYjrLn_B0uFHqvgwVd61cEjUE0_gEI2ZYlH8M9WfGhltTuSth-23da_QTkeimegLywkVpsJXaOI19s7sAe9u6CIJGTatxw-PJpr85fJuSpvCfyGqc5qYV7WV9bimwNyMtxATR85Sw3h_F1zNrhV5uHk2buo6QHqVhEC1igBcbodrhOovFEAtmJXFaIO-i6XcNnaZcNSFUFW_s4G789r8uCrJbUFFz7ii4cnHe_R54Y-NYFNX-fRoLWOsVF6MjSSTonkukKeadbahz_R28CX4tM6q6zN2uh8oBVneLmAeWcWEqzRYPONtomnTWhfyJqQ691i77IHSgXwd2lwYPnDNIRbPa_fYjBcmwhQexncIYWpIT92EBs=w1358-h650",
  check: "✅",
  cross: "❌",
  clock: "⏳",
  sync: "🔄",
  shield: "🛡️"
};

function baseTemplate(title, preheader, content, theme = 'default') {
  const isSecurity = theme === 'security';
  const headerBg = isSecurity ? STYLES.securityGradient : STYLES.brandGradient;
  const headerTitleColor = "#FFFFFF";

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${STYLES.bgBody}; font-family: 'Outfit', 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: ${STYLES.textMain};">
    
    <!-- Outer Wrapper -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
            <td align="center" style="padding: 20px 10px;">
                
                <!-- Main Card -->
                <table role="presentation" width="100%" style="max-width: 600px; background-color: ${STYLES.bgCard}; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    
                    <!-- Gradient Header with Logo -->
                    <tr>
                        <td style="background: ${headerBg}; padding: 40px 20px; text-align: center;">
                            <img src="${ICONS.logo}" alt="Napgameuytin" style="height: 50px; border-radius: 8px; background: rgba(255,255,255,0.1); padding: 10px; backdrop-filter: blur(5px); box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <h1 style="margin: 20px 0 0 0; color: ${headerTitleColor}; font-size: 24px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${title}</h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">${preheader}</p>
                        </td>
                    </tr>

                    <!-- Content Body -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            ${content}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #F8FAFC; padding: 30px; text-align: center; border-top: 1px solid #E2E8F0;">
                             <p style="margin: 0 0 10px 0; color: ${STYLES.textMuted}; font-size: 14px; font-weight: 600;">Hệ thống nạp game tự động hàng đầu Việt Nam</p>
                             <div style="margin-bottom: 20px;">
                                <a href="https://napgameuytin.vn" style="color: ${STYLES.brandColor}; text-decoration: none; margin: 0 10px; font-size: 14px;">Trang chủ</a>
                                <a href="https://napgameuytin.vn/user/history" style="color: ${STYLES.brandColor}; text-decoration: none; margin: 0 10px; font-size: 14px;">Lịch sử</a>
                                <a href="#" style="color: ${STYLES.brandColor}; text-decoration: none; margin: 0 10px; font-size: 14px;">Hỗ trợ</a>
                             </div>
                             <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                                © 2026 Napgameuytin. All rights reserved.<br>
                                Email này được gửi tự động. Vui lòng không phản hồi trực tiếp.
                             </p>
                        </td>
                    </tr>
                </table>

                <!-- Bottom Branding -->
                <p style="text-align: center; margin-top: 20px; color: #9CA3AF; font-size: 12px;">Uy tín - Nhanh chóng - Bảo mật</p>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

// ===================== SEND OTP ĐĂNG KÝ =====================
async function sendOTP(email, otp) {
  try {
    const content = `
            <p style="font-size: 16px;">Chào gamer <strong>${email.split('@')[0]}</strong> 👋,</p>
            <p style="font-size: 16px;">Chào mừng bạn gia nhập thế giới <strong>Napgameuytin</strong>! Để bắt đầu hành trình, chúng tôi cần xác minh đây chính là bạn.</p>
            
            <div style="margin: 35px 0; text-align: center;">
                <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: ${STYLES.textMuted}; font-weight: 700; margin-bottom: 10px;">MÃ KÍCH HOẠT CỦA BẠN</p>
                <div style="display: inline-block; background: #F3F4F6; border: 2px solid #E5E7EB; border-radius: 12px; padding: 15px 40px; position: relative; overflow: hidden;">
                    <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; color: ${STYLES.brandColor}; letter-spacing: 8px; position: relative; z-index: 1;">${otp}</span>
                </div>
            </div>

            <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <p style="margin: 0; color: #92400E; font-size: 14px;"><strong>Lưu ý:</strong> Mã này có hiệu lực trong 5 phút và chỉ dành riêng cho bạn. Đừng đưa nó cho bất kỳ ai (kể cả Admin).</p>
            </div>
        `;

    const html = baseTemplate("Xác minh tài khoản", "Mã OTP kích hoạt tài khoản của bạn", content, 'default');

    const info = await transporter.sendMail({
      from: '"Napgameuytin Team" <napgameuytin2111@gmail.com>',
      to: email,
      subject: "🚀 Kích hoạt tài khoản Napgameuytin của bạn",
      html,
    });

    console.log("✅ Email OTP Register sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Send OTP Register Error:", error);
    throw error;
  }
}

// ===================== SEND OTP KHÔI PHỤC MẬT KHẨU =====================
async function sendOTPRePass(email, otp) {
  try {
    const content = `
            <div style="text-align: center; margin-bottom: 25px;">
                <div style="font-size: 48px; margin-bottom: 10px;">${ICONS.shield}</div>
                <p style="font-size: 16px; margin: 0;">Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản:</p>
                <strong style="color: ${STYLES.securityColor}; font-size: 18px;">${email}</strong>
            </div>
            
            <div style="margin: 30px 0; text-align: center;">
                <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: ${STYLES.errorColor}; font-weight: 700; margin-bottom: 10px;">Mã Bảo Mật 🔐</p>
                <div style="display: inline-block; background: #FFF1F2; border: 2px dashed #FECACA; border-radius: 12px; padding: 15px 40px;">
                    <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; color: ${STYLES.errorColor}; letter-spacing: 8px;">${otp}</span>
                </div>
            </div>

            <div style="background: #F8FAFC; border-radius: 8px; padding: 15px; text-align: center;">
                <p style="font-size: 14px; color: ${STYLES.textMuted}; margin-bottom: 5px;">Mã này sẽ hết hạn trong <strong>5 phút</strong>.</p>
                <p style="font-size: 14px; color: ${STYLES.textMuted}; margin: 0;">Nếu bạn không yêu cầu, vui lòng đổi mật khẩu ngay lập tức vì có thể tài khoản của bạn đang bị xâm nhập.</p>
            </div>
        `;

    // Use 'security' theme for Red/Alert styling
    const html = baseTemplate("CẢNH BÁO BẢO MẬT", "Yêu cầu đặt lại mật khẩu của bạn", content, 'security');

    const info = await transporter.sendMail({
      from: '"Napgameuytin Security" <napgameuytin2111@gmail.com>',
      to: email,
      subject: "🔐 [CẢNH BÁO] Mã xác thực khôi phục mật khẩu",
      html,
    });

    console.log("✅ Email OTP Reset sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Send OTP Reset Error:", error);
    throw error;
  }
}

// ===================== SEND ACC ĐÃ MUA =====================
async function sendAcc(email, data, order) {
  try {
    const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.price ?? 0);

    const content = `
            <p style="font-size: 16px; margin-bottom: 20px;">Chúc mừng bạn! Giao dịch thành công 🎉</p>
            <p style="font-size: 14px; margin-bottom: 30px; color: ${STYLES.textMuted};">Cảm ơn bạn đã tin tưởng dịch vụ tại Napgameuytin. Dưới đây là "chiến lợi phẩm" của bạn:</p>
            
            <!-- Account Card -->
            <div style="background: linear-gradient(to right, #ffffff, #F8FAFC); border: 2px solid ${STYLES.brandColor}; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                <div style="background: ${STYLES.brandColor}; color: white; padding: 10px 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                    💎 Thông tin tài khoản
                </div>
                <div style="padding: 25px;">
                    <!-- Username -->
                    <div style="margin-bottom: 20px;">
                        <span style="display: block; font-size: 12px; color: ${STYLES.textMuted}; text-transform: uppercase; font-weight: 600; margin-bottom: 5px;">Tài khoản đăng nhập</span>
                        <div style="background: #F1F5F9; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 16px; color: ${STYLES.textMain}; font-weight: 700; border: 1px solid #E2E8F0;">
                            ${data.account}
                        </div>
                    </div>
                    
                    <!-- Password -->
                    <div style="margin-bottom: 20px;">
                        <span style="display: block; font-size: 12px; color: ${STYLES.textMuted}; text-transform: uppercase; font-weight: 600; margin-bottom: 5px;">Mật khẩu</span>
                        <div style="background: #F1F5F9; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 16px; color: ${STYLES.textMain}; font-weight: 700; border: 1px solid #E2E8F0;">
                            ${data.password}
                        </div>
                    </div>

                    <!-- Note -->
                    ${data.note ? `
                    <div>
                        <span style="display: block; font-size: 12px; color: ${STYLES.textMuted}; text-transform: uppercase; font-weight: 600; margin-bottom: 5px;">Ghi chú từ hệ thống</span>
                        <div style="font-size: 14px; color: ${STYLES.textMain}; font-style: italic;">
                            "${data.note}"
                        </div>
                    </div>` : ''}
                </div>
            </div>

            <!-- Receipt Info -->
            <div style="margin-top: 30px; background: #FFF; border-radius: 12px; border: 1px dashed #CBD5E1; padding: 20px;">
                <h3 style="margin: 0 0 15px 0; font-size: 14px; color: ${STYLES.textMain}; text-transform: uppercase;">🧾 Hóa đơn #${order.id}</h3>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
                     <span style="color: ${STYLES.textMuted};">Ngày mua:</span>
                     <span style="font-weight: 600;">${new Date(order.create_at).toLocaleString('vi-VN')}</span>
                </div>
                 <div style="display: flex; justify-content: space-between; font-size: 14px;">
                     <span style="color: ${STYLES.textMuted};">Tổng thanh toán:</span>
                     <span style="font-weight: 700; color: ${STYLES.brandColor}; font-size: 16px;">${formattedPrice}</span>
                </div>
            </div>

            <div style="margin-top: 25px; text-align: center;">
                <p style="font-size: 13px; color: ${STYLES.errorColor}; background: #FFF1F2; padding: 10px; border-radius: 8px; display: inline-block;">
                    ⚠️ Quý khách vui lòng đổi mật khẩu ngay sau khi đăng nhập để đảm bảo quyền lợi.
                </p>
            </div>
        `;

    const html = baseTemplate("Thanh toán thành công", `Đơn hàng #${order.id} của bạn đã hoàn tất`, content, 'default');

    const info = await transporter.sendMail({
      from: '"Napgameuytin Store" <napgameuytin2111@gmail.com>',
      to: email,
      subject: `💎 Nhận acc ngay: Đơn hàng #${order.id}`,
      html,
    });

    console.log("✅ Acc sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Send Acc Error:", error);
    throw error;
  }
}

// ===================== SEND TRẠNG THÁI ĐƠN =====================
async function sendStatus(email, order) {
  try {
    const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.amount ?? 0);

    const statusConfig = {
      success: { text: "Thành công", color: STYLES.successColor, icon: ICONS.check, msg: "Giao dịch của bạn đã hoàn tất xuất sắc." },
      cancel: { text: "Thất bại / Hủy", color: STYLES.errorColor, icon: ICONS.cross, msg: "Giao dịch đã bị hủy. Nếu có nhầm lẫn, hãy liên hệ ngay." },
      pending: { text: "Chờ xử lý", color: STYLES.warningColor, icon: ICONS.clock, msg: "Hệ thống đang kiểm tra giao dịch của bạn." },
      processing: { text: "Đang thực hiện", color: STYLES.brandColor, icon: ICONS.sync, msg: "Vui lòng đợi trong giây lát, chúng tôi đang xử lý." },
    };

    const currentStatus = statusConfig[order.status] || { text: order.status, color: STYLES.textMuted, icon: "ℹ️", msg: "Trạng thái mới." };

    const content = `
            <div style="text-align: center; padding: 20px 0;">
                <div style="font-size: 60px; line-height: 1; margin-bottom: 15px;">${currentStatus.icon}</div>
                <h2 style="color: ${currentStatus.color}; margin: 0 0 10px 0; text-transform: uppercase; font-size: 24px; font-weight: 800;">${currentStatus.text}</h2>
                <p style="margin: 0; color: ${STYLES.textMuted}; font-size: 16px;">${currentStatus.msg}</p>
            </div>

            <div style="background: #F8FAFC; border-radius: 12px; padding: 25px; margin-top: 20px; border: 1px solid #E2E8F0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td style="padding: 10px 0; color: ${STYLES.textMuted}; font-size: 14px;">Mã đơn hàng</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: 700; color: ${STYLES.textMain};">#${order.id}</td>
                    </tr>
                    <tr>
                         <td style="padding: 10px 0; color: ${STYLES.textMuted}; font-size: 14px; border-bottom: 1px dashed #E2E8F0;">Số tiền giao dịch</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: 700; color: ${STYLES.textMain}; border-bottom: 1px dashed #E2E8F0;">${formattedAmount}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding-top: 20px; text-align: center;">
                             <a href="https://napgameuytin.vn/user/history" style="display: inline-block; background: ${STYLES.textMain}; color: #FFF; padding: 12px 30px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">Kiểm tra lịch sử</a>
                        </td>
                    </tr>
                </table>
            </div>

            <p style="text-align: center; margin-top: 25px; font-size: 13px; color: ${STYLES.textMuted};">Cần hỗ trợ? Phản hồi email này hoặc chat trực tiếp trên web.</p>
        `;

    const html = baseTemplate("Cập nhật trạng thái", `Đơn hàng #${order.id}: ${currentStatus.text}`, content, 'default');

    const info = await transporter.sendMail({
      from: '"Napgameuytin Support" <napgameuytin2111@gmail.com>',
      to: email,
      subject: `🔔 Đơn hàng #${order.id}: ${currentStatus.text.toUpperCase()}`,
      html,
    });

    console.log("✅ Email Status sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Send Status Error:", error);
    throw error;
  }
}

module.exports = { sendOTP, sendOTPRePass, sendAcc, sendStatus };
