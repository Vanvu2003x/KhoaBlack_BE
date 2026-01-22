# Tài Liệu API

## Cấu Hình Socket.IO

Backend sử dụng Socket.IO để giao tiếp realtime với Frontend. Cấu hình trong file `.env`:

```env
# Socket.IO CORS Configuration
# Danh sách các origin được phép kết nối (phân cách bằng dấu phẩy)
# Trong development, để trống hoặc không set để cho phép tất cả
# Trong production, set các URL frontend của bạn:
SOCKET_ORIGINS=http://localhost:3000,https://khoablacktopup.vn

# Frontend URL (fallback cho Socket CORS trong production)
FRONTEND_URL=http://localhost:3000
```

**Lưu ý:** 
- Nếu không set `SOCKET_ORIGINS`, backend sẽ cho phép tất cả origin trong development
- Trong production với `NODE_ENV=production`, backend sẽ sử dụng `FRONTEND_URL` làm fallback

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
