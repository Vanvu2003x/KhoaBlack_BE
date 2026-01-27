# Tài Liệu API

## 🚀 Hướng Dẫn Deploy lên VPS

### 1. Cấu hình Environment Variables

Tạo file `.env` trên VPS với nội dung:

```env
# ⚠️ QUAN TRỌNG: Server Configuration
NODE_ENV=production
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=YOUR_STRONG_PASSWORD
DB_NAME=khoablack

# JWT - ĐỔI SECRET KEY!
JWT_SECRET_KEY=YOUR_SUPER_SECRET_KEY_CHANGE_THIS
JWT_EXPIRY=7d

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# ⚠️ CORS - BẮT BUỘC CHO SOCKET.IO
CORS_ORIGINS=https://khoablacktopup.vn,https://www.khoablacktopup.vn
SOCKET_ORIGINS=https://khoablacktopup.vn,https://www.khoablacktopup.vn
FRONTEND_URL=https://khoablacktopup.vn

# API Keys
MORISHOP_API_KEY=your_morishop_key
NAPGAME247_API_KEY=your_napgame247_key
```

### 2. Cấu hình Nginx (WebSocket Support)

```nginx
server {
    listen 443 ssl http2;
    server_name api.khoablacktopup.vn;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    # API thông thường
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ⚠️ Socket.IO - BẮT BUỘC
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
    }
}
```

### 3. Khởi chạy với PM2

```bash
# Install dependencies
npm install

# Start với PM2
pm2 start src/server.js --name khoablack-be

# Kiểm tra logs
pm2 logs khoablack-be --lines 30
```

### ⚠️ Lưu ý quan trọng

| Điểm | Chi tiết |
|------|----------|
| **NODE_ENV** | Phải set `production` |
| **CORS matching** | `CORS_ORIGINS` và `SOCKET_ORIGINS` phải chứa chính xác domain frontend |
| **HTTPS** | Cả frontend và backend phải dùng HTTPS |
| **Không trailing slash** | ✅ `https://khoablacktopup.vn` ❌ `https://khoablacktopup.vn/` |
| **www variant** | Thêm cả `www.` và non-www vào CORS |
| **Secret keys** | Đổi tất cả keys, không dùng mặc định |
| **File permissions** | `.env` chỉ đọc bởi owner: `chmod 600 .env` |

### ✅ Verify Socket hoạt động

Kiểm tra log khi server start:
```
🔧 NODE_ENV: production
🔧 SOCKET_ORIGINS từ env: [ 'https://khoablacktopup.vn', 'https://www.khoablacktopup.vn' ]
🔌 Socket.IO allowed origins: [ 'https://khoablacktopup.vn', 'https://www.khoablacktopup.vn' ]
```

---

## Module Xác Thực (Auth)
**Base URL:** `/api/users`

| Phương thức | Endpoint Đầy đủ | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/users/register` | Đăng ký người dùng mới | Không |
| `POST` | `/api/users/login` | Đăng nhập | Không |
| `POST` | `/api/users/check-mail` | Kiểm tra email tồn tại | Không |
| `POST` | `/api/users/forgot-password` | Gửi OTP quên mật khẩu | Không |
| `POST` | `/api/users/reset-password` | Đặt lại mật khẩu dùng OTP | Không |
| `GET` | `/api/users/role` | Lấy vai trò (role) người dùng hiện tại | Có |
| `POST` | `/api/users/admin/send-otp` | Gửi OTP cho Admin | Có |
| `POST` | `/api/users/admin/verify-otp` | Xác thực OTP Admin | Có |

## Module Người Dùng (User)
**Base URL:** `/api/users` (Đã gộp đường dẫn với Auth để tránh lỗi 404)

| Phương thức | Endpoint Đầy đủ | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/info` | Lấy thông tin người dùng hiện tại | Có |
| `GET` | `/api/users/all` | Lấy danh sách tất cả người dùng | Có (Admin?) |
| `PUT` | `/api/users/update-role/:id` | Cập nhật vai trò (role) người dùng | Có (Admin) |
| `GET` | `/api/users/get-user` | Lấy chi tiết người dùng cụ thể | Không |
| `POST` | `/api/users/update-balance` | Cập nhật số dư | Có (Admin?) |
| `GET` | `/api/users/search` | Tìm kiếm người dùng | Không |

## Module Lịch Sử Ví (Wallet Log)
**Base URL:** `/api/toup-wallet-log`

| Phương thức | Endpoint Đầy đủ | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/toup-wallet-log/total-amount` | Lấy tổng tiền trong khoảng thời gian | Không |
| `GET` | `/api/toup-wallet-log/logs` | Lấy lịch sử ví | Không |
| `GET` | `/api/toup-wallet-log/logs-pending` | Lấy logs đã xong/đang chờ | Không |
| `GET` | `/api/toup-wallet-log/stats` | Lấy thống kê tổng tiền nạp | Không |
| `POST` | `/api/toup-wallet-log/manual-charge` | Cộng tiền thủ công | Không |
| `POST` | `/api/toup-wallet-log/cancel` | Hủy log ví | Có |
| `GET` | `/api/toup-wallet-log/user-logs` | Lấy logs theo người dùng | Có |

## Module Game
**Base URL:** `/api/games`

| Phương thức | Endpoint Đầy đủ | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/games/lists` | Lấy danh sách game | Không |
| `POST` | `/api/games/add` | Thêm game mới (Upload `thumbnail`) | Không |
| `DELETE` | `/api/games/delete` | Xóa game | Không |
| `POST` | `/api/games/update` | Cập nhật game (Upload `thumbnail`) | Không |
| `GET` | `/api/games/filter` | Lọc game theo loại | Không |
| `GET` | `/api/games/:gamecode` | Lấy chi tiết game theo code | Không |

## Module Đơn Hàng (Order)
**Base URL:** `/api/order`

| Phương thức | Endpoint Đầy đủ | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/order/create` | Tạo đơn hàng mới | Có |
| `GET` | `/api/order/my-orders` | Lấy đơn hàng của tôi | Có |
| `POST` | `/api/order/cancel-pending/:id` | Hủy đơn hàng đang chờ | Có |
| `GET` | `/api/order/transaction-history` | Lịch sử giao dịch | Có |
| `GET` | `/api/order/financial-summary` | Tổng kết tài chính | Có |
| `GET` | `/api/order/receive/summary` | Summary cho Agent | Có |
| `GET` | `/api/order/receive/stats` | Stats cho Agent | Có |
| `POST` | `/api/order/receive/:id` | Nhận đơn hàng (Agent) | Có |
| `GET` | `/api/order/all` | Lấy tất cả đơn hàng (Admin) | Không |
| `GET` | `/api/order/detail/:id` | Chi tiết đơn hàng | Không |
| `DELETE` | `/api/order/delete/:id` | Xóa đơn hàng | Không |
| `PUT` | `/api/order/update/:id` | Cập nhật đơn hàng | Không |
| `GET` | `/api/order/cost-stats` | Thống kê chi phí | Không |
| `GET` | `/api/order/cost-summary` | Tổng kết chi phí | Không |
| `GET` | `/api/order/filter` | Lọc đơn hàng | Không |
| `GET` | `/api/order/search` | Tìm kiếm đơn hàng | Không |
| `POST` | `/api/order/change-status/:id` | Đổi trạng thái đơn | Không |
| `POST` | `/api/order/complete/:id` | Hoàn thành đơn | Không |
| `POST` | `/api/order/cancel-refund/:id` | Hủy & Hoàn tiền | Không |

## Module Chợ Tài Khoản (Acc)
**Base URL:** `/api/acc`

| Phương thức | Endpoint Đầy đủ | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/acc/add` | Thêm tài khoản bán (Upload `image`) | Không |
| `GET` | `/api/acc/lists` | Lấy danh sách acc theo game | Không |
| `POST` | `/api/acc/delete/:id` | Xóa acc | Không |
| `POST` | `/api/acc/update/:id` | Cập nhật acc (Upload `image`) | Không |
| `GET` | `/api/acc/stats` | Thống kê acc | Không |
| `GET` | `/api/acc/search` | Tìm kiếm acc | Không |

## Module Đơn Hàng Tài Khoản (Acc Order)
**Base URL:** `/api/accOrder`

| Phương thức | Endpoint Đầy đủ | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/accOrder/buy` | Mua tài khoản | Có |
| `GET` | `/api/accOrder/my-orders` | Đơn mua acc của tôi | Có |
| `GET` | `/api/accOrder/user/:user_id` | Đơn acc theo user | Không |
| `GET` | `/api/accOrder/detail/:id` | Chi tiết đơn acc | Không |
| `GET` | `/api/accOrder/acc/:acc_id` | Đơn acc theo Acc ID | Không |
| `POST` | `/api/accOrder/update-status/:id` | Cập nhật trạng thái | Không |
| `GET` | `/api/accOrder/all` | Tất cả đơn acc | Không |
| `POST` | `/api/accOrder/cancel/:id` | Hủy đơn | Không |
| `POST` | `/api/accOrder/send-acc/:id` | Gửi thông tin acc | Không |

## Module Gói Nạp (Package)
**Base URL:** `/api/toup-package`

| Phương thức | Endpoint Đầy đủ | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/toup-package/lists` | Lấy danh sách gói | Không |
| `GET` | `/api/toup-package/lists/:game_code` | Lấy gói theo game | Có (Check Admin) |
| `POST` | `/api/toup-package/add` | Thêm gói (Upload `thumbnail`) | Không |
| `POST` | `/api/toup-package/update` | Cập nhật gói (Upload `thumbnail`) | Không |
| `GET` | `/api/toup-package/getLog` | Lấy log gói | Không |
| `DELETE` | `/api/toup-package/delete/:id` | Xóa gói | Không |
| `GET` | `/api/toup-package/search` | Tìm kiếm gói | Không |
| `PATCH` | `/api/toup-package/update-status` | Cập nhật trạng thái | Không |
| `PATCH` | `/api/toup-package/update-sale` | Cập nhật giảm giá | Không |

## Module Thanh Toán (Payment)
**Base URL:** `/api/payment`

| Phương thức | Endpoint Đầy đủ | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payment/create_qr` | Tạo QR thanh toán | Có |
| `POST` | `/api/payment/web2m_hook` | Webhook nội bộ | Không |

## Webhooks
**Base URL:** `/webhook`

| Phương thức | Endpoint Đầy đủ | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/webhook/web2m` | Web2M Webhook | Không |
