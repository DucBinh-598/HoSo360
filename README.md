# HồSơ360 — demo local (React + NestJS + MySQL)

Ứng dụng demo quản lý hồ sơ doanh nghiệp: đăng nhập theo mã doanh nghiệp, phân quyền cơ bản, quy trình duyệt nhiều bước, thư mục, tải tệp, tải/xem nội dung và lịch sử phiên bản. Tệp được lưu trên máy đang chạy backend trong `backend/uploads/`, không nằm trong database hay Git.

## Yêu cầu

- Node.js 20+
- Docker Desktop (cho MySQL)

## Khởi động từ đầu

Mở terminal tại thư mục gốc repo.

1. Khởi động MySQL và đợi container healthy:

   ```powershell
   docker compose up -d
   docker compose ps
   ```

2. Cài đặt backend, tạo/cập nhật schema và dữ liệu demo:

   ```powershell
   cd backend
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   npm install
   npm run db:push
   $env:DEMO_SEED = "true"
   npm run seed:demo
   Remove-Item Env:DEMO_SEED
   npm run start:dev
   ```

   `db:push` đồng bộ các model hiện có theo hướng bổ sung bảng mới; không xóa dữ liệu như `prisma migrate reset`. Nếu đã có file `.env`, giữ kết nối database hiện tại thay vì ghi đè.

3. Mở terminal khác tại thư mục gốc repo, cài và chạy giao diện:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

4. Mở http://localhost:5173. API chạy tại http://localhost:3000/api.

## Tài khoản mẫu

Mã doanh nghiệp: `anphat-demo`

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị | `admin@anphat.vn` | `Demo1234!` |
| Quản lý | `manager@anphat.vn` | `Demo1234!` |
| Nhân viên | `staff@anphat.vn` | `Demo1234!` |
| Chỉ xem | `viewer@anphat.vn` | `Demo1234!` |

Tenant thứ hai để kiểm tra phân tách dữ liệu: mã `binhminh-demo`, email `admin@binhminh.vn`, mật khẩu `Demo1234!`.

Seed có thể chạy lặp lại; mật khẩu tài khoản demo được lưu dạng bcrypt hash. Chỉ chạy `seed:demo` trên database local, không dùng các thông tin đăng nhập mẫu hoặc cấu hình Docker mặc định trong production.

## Luồng demo

1. Đăng nhập bằng `staff@anphat.vn` và mở hồ sơ nháp để gửi qua quy trình duyệt.
2. Đăng nhập bằng `manager@anphat.vn` để duyệt bước đầu; bước tiếp theo do `admin@anphat.vn` ký.
3. Mở mục **Tài liệu**, tạo thư mục, tải lên tệp PDF/ảnh/Office/TXT/CSV, xem hoặc tải xuống, rồi tải thêm phiên bản và xem lịch sử.
4. Thử đăng nhập tenant `binhminh-demo`: không thể xem hồ sơ, thư mục hoặc tệp của `anphat-demo`.

Giới hạn tải lên: 10 MB/tệp. Chỉ phần mở rộng và MIME type được hỗ trợ mới được chấp nhận. `UPLOAD_DIR` tùy chọn để đổi thư mục lưu tệp; mặc định là `backend/uploads/`.

## An toàn và phạm vi

Đây là demo local, không phải cấu hình production. Tệp yêu cầu JWT và được kiểm tra tenant ở mọi thao tác; vai trò chỉ xem không thể tải lên hoặc tạo thư mục. Tên tệp gốc chỉ dùng hiển thị, tên lưu trên đĩa là UUID. Thư mục upload được loại khỏi Git.

Chưa bao gồm OTP, xác thực email, chữ ký số thực, phân quyền theo từng hồ sơ/phòng ban, antivirus/quét nội dung, lưu trữ object storage, sao lưu/khôi phục hoặc hardening production. Trước khi triển khai thật cần bổ sung các biện pháp vận hành và bảo mật phù hợp.

## Deploy frontend/backend tách rời

Vercel chỉ host frontend; API NestJS cần được deploy riêng (ví dụ Render) và kết nối tới MySQL có thể truy cập từ backend đó.

- Trên backend, đặt `DATABASE_URL`, `JWT_SECRET` và `FRONTEND_URL` trong cấu hình môi trường của host. `FRONTEND_URL` là domain Vercel đầy đủ, ví dụ `https://hoso360.vercel.app`; có thể phân tách nhiều origin bằng dấu phẩy.
- Trên Vercel, đặt `VITE_API_URL` thành URL backend cộng `/api`, ví dụ `https://hoso360-api.onrender.com/api`, rồi deploy lại frontend.
- Schema hiện chưa có migration baseline. Với database mới, đồng bộ một lần bằng `npm run db:push` từ backend; không dùng `prisma migrate reset`.
- Upload hiện lưu trên ổ local. Trước khi dùng online lâu dài, cấu hình persistent disk hoặc object storage; không giả định ổ đĩa ephemeral của host giữ tệp sau redeploy.
- Không chạy seed demo trên website công khai; tài khoản seed có thông tin đăng nhập mẫu.
