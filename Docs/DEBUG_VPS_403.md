# Hướng dẫn Xử lý lỗi 403 Forbidden trên VPS

Lỗi `403 Forbidden` khi truy cập trang web thường do Server chặn quyền truy cập. Hãy kiểm tra các mục sau:

## 1. Kiểm tra Log Nginx
Đây là cách nhanh nhất để biết tại sao bị chặn. Mở terminal VPS và chạy lệnh:
```bash
sudo tail -f /var/log/nginx/error.log
```
Sau đó tải lại trang bị lỗi.
- Nếu thấy `directory index of ... is forbidden`: Do folder không có file index (thường do conflict route với folder thực).
- Nếu thấy `access forbidden by rule`: Do cấu hình Nginx chặn IP hoặc User Agent.
- Nếu thấy `permission denied`: Do Nginx không có quyền đọc file (xem mục 2).

## 2. Kiểm tra xung đột Folder
Nginx sẽ ưu tiên hiển thị Folder thực tế nếu nó tồn tại trùng tên với Route của Website.
Ví dụ: Bạn truy cập `/categories/topup/honor-of-kings`.
Hãy kiểm tra xem trong thư mục `public` của Frontend có folder nào trùng tên không:
```bash
ls -la /path/to/frontend/public/categories
```
Nếu có folder này, hãy xóa hoặc đổi tên nó đi.

## 3. Kiểm tra Quyền File (Permissions)
Đảm bảo user chạy Nginx (thường là `www-data` hoặc `nginx`) có quyền đọc thư mục code.
```bash
# Cấp quyền đọc cho tất cả
sudo chmod -R 755 /path/to/your/project
```

## 4. Kiểm tra Cloudflare (Nếu dùng)
Nếu bạn dùng Cloudflare, vào dashboard -> **Security** -> **Events**.
Xem có request nào bị chặn (Block/Challenge) không. Đôi khi Cloudflare WAF chặn nhầm request hợp lệ nếu URL chứa từ khóa lạ.

## 5. Kiểm tra Rate Limit Backend
Nếu lỗi 403 thực ra đến từ API Backend (Check Network Tab -> XHR):
- Có thể bạn đang bị chặn do gọi API quá nhanh (Rate Limit).
- IP của VPS (nếu Frontend gọi Backend qua IP Public) có thể bị whitelist/blacklist sai trong code Backend.

---
*Lưu ý: Nếu bạn dùng PM2 để chạy Next.js, hãy kiểm tra log PM2:*
```bash
pm2 logs
```
