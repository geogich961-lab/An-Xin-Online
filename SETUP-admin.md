# Thiết lập trang quản trị

Dự án dùng Cloudflare Pages Functions và D1 vì website hiện khai báo miền `anxinonline.pages.dev`. Bản admin cần được triển khai bằng Wrangler để các API và cơ sở dữ liệu hoạt động; tải thả thư mục trên dashboard chỉ đưa tệp tĩnh lên và không biên dịch thư mục `functions`.

> Nếu dự án Pages hiện tại đã có cấu hình trong dashboard, hãy kiểm tra cấu hình đó trước khi deploy. Cloudflare dùng `wrangler.toml` làm nguồn cấu hình chính khi file này có `pages_build_output_dir`; nên lấy cấu hình hiện tại bằng `npx wrangler pages download config anxinonline`, giữ lại thiết lập đang dùng, rồi thêm binding D1 từ file này. Tài liệu: [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/).

## 1. Tạo cơ sở dữ liệu D1

Trong thư mục dự án, chạy:

```powershell
npx wrangler login
npx wrangler d1 create anxin-content
```

Lệnh tạo database in ra một `database_id`. Thay `REPLACE_WITH_YOUR_D1_DATABASE_ID` trong `wrangler.toml` bằng giá trị đó.

Áp dụng lược đồ:

```powershell
npx wrangler d1 migrations apply anxin-content --remote
```

## 2. Đặt thông tin đăng nhập

Đặt mật khẩu admin dài ít nhất 12 ký tự và khóa ký phiên ngẫu nhiên dài tối thiểu 32 ký tự:

```powershell
npx wrangler pages secret put ADMIN_PASSWORD --project-name anxinonline
npx wrangler pages secret put SESSION_SECRET --project-name anxinonline
```

Wrangler sẽ hỏi giá trị bí mật trong terminal. Không ghi hai giá trị này vào mã nguồn hoặc gửi lên kho công khai.

## 3. Triển khai

```powershell
npx wrangler pages deploy . --project-name anxinonline
```

Mở `https://anxinonline.pages.dev/admin.html`, đăng nhập bằng `ADMIN_PASSWORD`, chỉnh nội dung rồi bấm **Lưu và cập nhật trang**. Nội dung được lưu trong D1 và hiển thị khi khách tải lại trang; cache API tối đa 30 giây.

Nếu tên dự án Pages của bạn khác `anxinonline`, thay tên đó trong `wrangler.toml`/các lệnh tương ứng.

## Chạy thử giao diện trên GitHub Pages

Có thể đưa `index.html` và ảnh đi kèm lên GitHub rồi bật GitHub Pages để xem trang chính. Trang sẽ dùng nội dung mặc định trong HTML và QR VietQR vẫn được tạo khi người xem có Internet. `admin.html` không thể đăng nhập hoặc lưu thay đổi trên GitHub Pages vì nơi này chỉ phục vụ tệp tĩnh; muốn dùng backend admin cần triển khai phần `functions/` lên Cloudflare Pages cùng D1 như trên.
