# Hướng dẫn Cấu hình Realtime (Socket.IO) trên VPS

Nếu tính năng nạp tiền tự động (realtime notification) hoạt động tốt ở Local nhưng không chạy trên VPS, vui lòng kiểm tra các mục sau:

## 1. Kiểm tra Console Log
Mình đã bật chế độ debug cho Socket. Bạn hãy mở Website trên VPS, nhấn F12 -> **Console** và reload trang.

- Nếu thấy: `✅ Socket connected! ID: ...` -> Kết nối thành công. Vấn đề có thể do Token hoặc Logic xử lý.
- Nếu thấy: `❌ Socket connection error...` -> Xem chi tiết bên dưới.

---

## 2. Kiểm tra Biến Môi trường (Environment Variables)

### Backend (VPS)
File `.env` của Backend cần có biến cho phép Domain FE kết nối:
```env
# Cho phép domain Frontend kết nối Socket (để tránh lỗi CORS)
SOCKET_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com

# Hoặc nếu dùng biến này
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend (VPS build)
File `.env` (hoặc cấu hình build) của Frontend cần trỏ đúng Socket Server:
```env
# URL của Backend API (Socket sẽ connect vào đây)
NEXT_PUBLIC_API_URL=https://api.your-backend-domain.com

# (Tùy chọn) Nếu Socket chạy port/url riêng
NEXT_PUBLIC_SOCKET_URL=https://api.your-backend-domain.com
```
*Lưu ý: Sau khi sửa ENV Frontend, cần Build lại project (`npm run build`).*

---

## 3. Cấu hình Nginx (QUAN TRỌNG)
Trên VPS, Nginx đóng vai trò Reverse Proxy. Mặc định Nginx không hỗ trợ WebSocket nếu chưa cấu hình `Upgrade` header.

Mở file config Nginx của Backend (thường ở `/etc/nginx/sites-available/your-api-domain`):

```nginx
server {
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:5000; # Port backend đang chạy
        
        # --- THÊM ĐOẠN NÀY ĐỂ HỖ TRỢ SOCKET.IO ---
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        # ----------------------------------------
    }
}
```
Sau đó restart Nginx: `sudo systemctl restart nginx`

## 4. Kiểm tra mã lỗi thường gặp

- **WebSocket connection failed / 400 Bad Request**: Do thiếu cấu hình Nginx (Mục 3).
- **CORS error**: Do thiếu `SOCKET_ORIGINS` ở Backend (Mục 2).
- **Socket connected but no data**: Do Token sai hoặc User ID không khớp.

---
*File này nằm tại `Docs/VPS_SOCKET_SETUP.md` trong thư mục Backend.*
