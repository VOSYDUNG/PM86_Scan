# Hướng dẫn sử dụng PM86 StockCount (Multi-Location)

## 1. Giới thiệu
PM86 StockCount là ứng dụng kiểm kê kho chuyên nghiệp, hỗ trợ đa vị trí (Kho, Xe, Kệ) và tương thích hoàn hảo với file xuất từ phần mềm MISA.

## 2. Quy trình làm việc chuẩn
1.  **Import:** Nạp file Excel tồn kho từ MISA vào App.
2.  **Tạo Phiên (Session):** Tạo một đợt kiểm kê mới dựa trên file vừa nạp.
3.  **Kiểm kê (Scan):**
    *   Chọn vị trí (hoặc quét mã QR vị trí).
    *   Quét mã hàng -> Nhập số lượng thực tế -> Lưu.
4.  **Báo cáo (Report):** Xem tổng hợp, đối chiếu chênh lệch.
5.  **Xuất file (Export):** Xuất kết quả ra Excel để nạp ngược lại MISA.

---

## 3. Hướng dẫn chi tiết

### Bước 1: Chuẩn bị & Import file MISA
**Lưu ý quan trọng về file CSV/Excel:**
Để App nhận diện đúng **Tên Kho**, file xuất từ MISA cần có dòng thông tin kho ở phần đầu (ví dụ dòng 2): `Kho: Tên Kho Của Bạn...`. Nếu không, App sẽ gán vào "Kho mặc định".

1.  Tại màn hình chính, bấm nút **"Import MISA"**.
2.  Chọn file `.xlsx` hoặc `.csv` từ máy.
3.  Kiểm tra thông báo thành công.

### Bước 2: Tạo Phiên kiểm kê
1.  Tại màn hình chính, bấm **"Tạo phiên mới"**.
2.  Chọn **Tên kho** (Warehouse) đúng với tên kho trong file bạn vừa Import.
    *   *Mẹo:* Nếu bạn thấy nhiều tên kho giống nhau, hãy chọn cái mới nhất hoặc xóa dữ liệu cũ đi.
3.  Bấm "Tạo phiên".

### Bước 3: Kiểm kê tại Vị trí (Multi-Location)
Màn hình "Danh sách vị trí" sẽ hiện ra. Bạn có thể kiểm nhiều kho/xe cùng lúc.

**Cách 1: Chọn thủ công**
*   Bấm vào tên Vị trí (ví dụ: Kho Chính) để vào màn hình quét.

**Cách 2: Quét QR Vị trí (Nhanh)**
*   Bấm nút **"Quét vị trí"**.
*   Quét mã QR dán trên kệ hoặc xe.
    *   Mã QR nên có định dạng: `LOC:TEN_VI_TRI` (VD: `LOC:XE_01`).
    *   Nếu vị trí chưa có, App sẽ hỏi bạn có muốn tạo mới không -> Bấm "Thêm & Vào kiểm".

### Bước 4: Thao tác Quét hàng (Scanning)
1.  **Quét mã:** Dùng phím cứng (bên hông máy) hoặc Camera để quét mã vạch sản phẩm.
    *   *Tính năng:* Tìm kiếm tức thì (Live Search) - chỉ cần gõ/quét, danh sách sẽ hiện ra sau 0.4s.
2.  **Nhập số lượng:**
    *   Nhập tổng số lượng thực tế đếm được tại vị trí đó.
    *   Bấm **Enter** (hoặc nút Done trên bàn phím) để **Lưu ngay**.
3.  **Hàng lỗi (Nếu có):**
    *   Bấm "+ Báo lỗi".
    *   Chọn loại lỗi (Hư hỏng, Hết hạn...) và nhập số lượng lỗi.
    *   App sẽ tự động tính: `Thực tế (OK) = Tổng - Lỗi`.

### Bước 5: Xem Báo cáo & Đối soát
1.  Tại màn hình Danh sách Vị trí, bấm **"Xem Items"**.
2.  Danh sách tổng hợp toàn phiên sẽ hiện ra.
    *   **Màu xanh:** Khớp số liệu.
    *   **Màu vàng/đỏ:** Có chênh lệch (Thừa/Thiếu).
    *   **Màu xám:** Chưa kiểm (`-`).
3.  **Xem chi tiết 1 mã:** Bấm vào dòng sản phẩm để xem:
    *   **Phân bổ:** Hàng này đang nằm ở những đâu (Kho: 10, Xe: 5...).
    *   **Gợi ý (Hints):** App sẽ gợi ý nguyên nhân lệch (VD: "Còn thiếu 2 cái", "Có thể nhầm xe").

### Bước 6: Xuất file kết quả
1.  Tại màn hình Danh sách Vị trí, bấm **"Xuất File"**.
2.  Chọn **Excel (.xlsx)** hoặc **CSV**.
3.  File xuất ra sẽ có cột `SL Kiểm kê` (là số lượng thực tế OK) và cột `Ghi chú` (chi tiết lỗi) sẵn sàng để nạp vào MISA.

---

## 4. Khắc phục sự cố thường gặp

**Q: Tại sao vào báo cáo thấy trống trơn?**
A: Có thể bạn đã chọn sai Tên Kho khi tạo phiên. Hãy kiểm tra lại file Import xem tên kho là gì, và đảm bảo khi tạo phiên bạn chọn đúng tên đó.

**Q: App bị thoát đột ngột (Crash)?**
A: Thường do Camera. Hãy đảm bảo bạn đã cấp quyền Camera. App đã được tối ưu để tự tắt Camera khi bạn nhập số liệu để tránh xung đột.

**Q: Tôi muốn xóa dữ liệu làm lại từ đầu?**
A: Hiện tại App hỗ trợ xóa Phiên và Snapshot. Vào màn hình chính -> Tab Lịch sử -> Xóa.
