# Trạng thái dự án - Auto StockCount (Cập nhật: 25/01/2026)

## ✅ Đã hoàn thành (Nâng cấp Multi-Location P0)

### 1. Kiến trúc & Dữ liệu (Core)
- **Refactor Entities:** Cập nhật `types.ts` hỗ trợ mô hình `Session -> Location -> CountLine`. Thêm các bucket chất lượng (QualityBuckets: Good, Expired, Damaged...).
- **Database Schema:** Nâng cấp `db.ts` thêm bảng `locations`, `location_counts`, và `count_lines`.
- **Repository Pattern:** 
    - Triển khai `countRepoSqlite` xử lý logic tính toán số lượng khả dụng (Usable Qty).
    - Cập nhật `sessionRepo` tự động sinh Vị trí mặc định (Default Location) khi tạo phiên.
    - Cập nhật `exportRepo` gộp dữ liệu (Aggregate) từ tất cả vị trí cho báo cáo MISA.

### 2. Luồng nghiệp vụ & UI (Presentation)
- **Màn hình Vị trí (Inventory Screen):** Chuyển đổi từ danh sách hàng hóa sang quản lý danh sách Vị trí (Kho/Kệ/Xe).
- **Màn hình Quét (Scan Screen):**
    - Hỗ trợ context Vị trí hiện tại.
    - Tính năng **Quick Split**: Phân loại hàng lỗi ngay khi quét (Fast Lane).
    - Hiển thị song song Tổng thực tế và Thực tế khả dụng (OK).
- **Báo cáo & Phân tích (Reporting):**
    - Tạo màn hình **Review Items** tổng hợp dữ liệu toàn phiên.
    - Tạo màn hình **Chi tiết Sản phẩm** (Cross-location detail): xem phân bố hàng hóa tại các vị trí, tính toán **Coverage** (Độ phủ) và đưa ra các **Hints** (Gợi ý sai lệch vị trí).

### 3. Tài liệu & Quy trình
- Cập nhật `README.md` hướng dẫn kiểm thử chi tiết cho mô hình Multi-Location.
- Cập nhật `plan_check_product.md` đánh dấu hoàn thành giai đoạn P0.

## 🛠 Hướng dẫn vận hành nhanh
1. **Import:** Nạp file snapshot từ MISA như cũ.
2. **Session:** Tạo phiên mới -> Hệ thống tự tạo 1 Location tên Kho.
3. **Count:** Chọn Location -> Quét hàng -> Nếu có lỗi bấm "+ Báo lỗi" để phân loại.
4. **Report:** Xem "Review Items" để thấy tổng thể chênh lệch sau khi gộp các kho/xe.
5. **Export:** Xuất CSV/Excel để nạp ngược vào MISA (Dữ liệu đã tự động trừ hàng lỗi).

## 🚀 Kế hoạch tiếp theo (P1)
- Triển khai quét mã QR Location để nhảy vị trí nhanh.
- Hoàn thiện Dashboard tiến độ (Progress Bar) cho từng vị trí.
- Thêm bằng chứng hình ảnh (Evidence) cho hàng hư hỏng.
