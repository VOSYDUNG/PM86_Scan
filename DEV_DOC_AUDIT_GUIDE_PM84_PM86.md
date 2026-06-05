# PM84/PM86 StockCount — Kế hoạch rà soát dự án & viết tài liệu hướng dẫn sử dụng (không thiếu chỗ nào)

> Mục tiêu: Dev/QA rà soát lại **toàn bộ dự án** (logic + UI + dữ liệu + xuất file + điều hướng) và tạo bộ tài liệu kỹ thuật/hướng dẫn sử dụng **đầy đủ, đọc vào làm được ngay**, theo “ngôn ngữ vận hành dễ hiểu”.

---

## 1) Phạm vi & tiêu chí hoàn thành

### 1.1 Phạm vi bắt buộc
- Luồng kiểm kê theo **kho → vị trí → SKU → số kiểm**.
- Quản lý vị trí (tạo/sửa/xóa).
- Tìm/tra SKU (scan barcode/QR, search text, suggestion).
- Ghi nhận số kiểm, ghi chú, ngoại lệ (nếu có).
- Tổng hợp cross-location (lọc, phân trang, refresh).
- Xuất **CSV** và **XLSX** (nếu XLSX được giữ) + đường dẫn lưu file + chia sẻ (share).
- Offline/local DB (SQLite) + cách lưu/khôi phục.
- Điều hướng màn hình (tránh “đẻ page” gây crash).
- Cài đặt & phát hành nội bộ (APK internal) + phương án cài đặt thay thế khi thiết bị không tải được.

### 1.2 Tiêu chí hoàn thành (Definition of Done)
- [ ] Tất cả màn hình/luồng có trong app **đều có mục hướng dẫn** (không bỏ sót).
- [ ] Mỗi thao tác chính đều có: **Khi nào dùng → Chuẩn bị → Các bước → Kết quả mong đợi → Nếu sai thì xử lý**.
- [ ] Tài liệu khớp với hành vi thực tế (đã chạy thử trên thiết bị/giả lập).
- [ ] Có danh sách lỗi thường gặp + cách tự kiểm tra/khắc phục.
- [ ] Có “bản đồ màn hình” (screen map) và “từ điển thuật ngữ”.
- [ ] Có “Known limitations” và “Kế hoạch cải tiến” (nếu cần).
- [ ] Docs được đặt trong repo và review như code (docs-as-code).

---

## 2) Chuẩn hoá cách viết hướng dẫn (để đọc là làm được)

### 2.1 Quy tắc viết bước thao tác (Procedure chuẩn)
- Luôn dùng **danh sách đánh số** cho các bước (1,2,3…).
- Mỗi bước 1 hành động chính, dùng động từ rõ ràng: “Chọn / Nhấn / Chạm / Nhập / Quét / Tải lại / Lưu / Xuất”.
- Nếu có nhánh “tuỳ chọn”, ghi rõ “(Tuỳ chọn)”.
- Không viết “đoán”; chỉ viết điều đã kiểm chứng bằng chạy app + đối chiếu code.

### 2.2 Cấu trúc bắt buộc cho mọi mục hướng dẫn
Mỗi mục phải theo khuôn sau:

- **Mục đích**: thao tác để làm gì (1–2 câu).
- **Khi nào dùng**: tình huống thực tế.
- **Chuẩn bị**: dữ liệu cần có / quyền cần bật / điều kiện.
- **Các bước thao tác**: 5–10 bước (nếu dài, chia nhỏ thành 2–3 tiểu mục).
- **Kết quả mong đợi**: nhìn thấy gì trên UI, dữ liệu thay đổi gì.
- **Lỗi thường gặp**: 2–5 lỗi cụ thể + cách xử lý.
- **CHECKLIST CHỤP ẢNH**: danh sách ảnh cần chụp + khoanh vùng.

---

## 3) Bộ tài liệu cần tạo (file structure bắt buộc)

Tạo thư mục: `docs/`

### 3.1 Danh sách file bắt buộc
1. `docs/APP_GUIDE.md`  
   Hướng dẫn sử dụng đầy đủ (từ cài đặt → vận hành → xuất file).
2. `docs/SCREEN_MAP.md`  
   Bản đồ màn hình & điều hướng (Screen → Action → Next Screen).
3. `docs/TROUBLESHOOTING.md`  
   Lỗi thường gặp + cách kiểm tra nhanh + cách khắc phục.
4. `docs/DATA_RULES.md`  
   Quy tắc dữ liệu & ý nghĩa số liệu (Sổ sách/Cuối kỳ, Thực tế/SL kiểm, Chênh lệch…).
5. `docs/EXPORT_SPEC.md`  
   Đặc tả file CSV/XLSX: cột, kiểu dữ liệu, format, tên file, nơi lưu, tiêu chí nạp vào hệ thống kế toán.
6. `docs/GLOSSARY.md`  
   Từ điển thuật ngữ: SKU, ĐVT, Vị trí, Kho, Phiên, Snapshot, Cross-location, Ngoại lệ…
7. `docs/KNOWN_LIMITATIONS.md`  
   Giới hạn hiện tại + tác động + workaround.
8. `docs/RELEASE_NOTES.md`  
   Ghi chú phiên bản (version code, thay đổi, rủi ro).

### 3.2 Quy ước placeholder ảnh (bạn tự thêm ảnh sau)
Trong tài liệu, chèn placeholder theo mẫu:

- `[HINH-01] <Tên màn hình> — <mục đích ảnh>`
- `Callouts cần khoanh vùng: (1) … (2) … (3) …`

Cuối mỗi mục có “CHECKLIST CHỤP ẢNH”:
- Ảnh cần chụp
- Khoanh vùng/callout
- Chụp thêm trạng thái: loading/empty/error (nếu có)
- Che dữ liệu nhạy cảm (IMEI, số điện thoại, tên khách hàng…)

---

## 4) Quy trình rà soát kỹ thuật (Dev/QA phải làm trước khi viết)

### 4.1 Lập “Inventory” màn hình & route
- [ ] Liệt kê toàn bộ screen/route (Expo Router hoặc React Navigation).
- [ ] Liệt kê action chính trên mỗi màn hình (nút, CTA, filter, export…).
- [ ] Vẽ Screen Map (dạng bảng hoặc sơ đồ).

**Output**: `docs/SCREEN_MAP.md`

### 4.2 Rà soát state & data flow
Với mỗi luồng chính, xác định:
- Data nguồn (snapshot import?) nằm ở đâu (SQLite table nào).
- Điều kiện đánh dấu **“Đã kiểm”** là gì (logic thật trong code).
- Khi bấm “Lưu” thì update ở đâu (repo/usecase/hook nào).
- Nếu tìm/scan không thấy → fallback gì (suggestion, create item?).

**Output**: phần “Quy tắc dữ liệu” trong `docs/DATA_RULES.md` + hướng dẫn thao tác tương ứng.

### 4.3 Rà soát điều hướng (nguy cơ crash do “đẻ page”)
- [ ] So sánh việc dùng `push` vs `replace` vs `back` (hoặc stack reset).
- [ ] Kiểm tra nút “Trang chủ / Dashboard” đang điều hướng kiểu nào:
  - Có bị `push` nhiều lần khiến stack phình?
  - Có dùng key thay đổi gây remount liên tục?
- [ ] Kiểm tra các hook có subscription/interval không cleanup (leak).
- [ ] Kiểm tra list lớn (FlatList) + memoization.

**Output**: ghi rõ trong `docs/TROUBLESHOOTING.md` mục “App văng/Crash” + “Cách kiểm tra log”.

### 4.4 Rà soát export CSV/XLSX
- [ ] CSV: encoding UTF-8, delimiter, cột đúng.
- [ ] XLSX (nếu có): format cell, header 1–2 dòng, merge cell, style đơn giản.
- [ ] Kịch bản dữ liệu lớn (1.000–50.000 dòng): thời gian export, memory.
- [ ] Vị trí lưu file + chia sẻ (share sheet) hoạt động trên Android 11+.

**Output**: `docs/EXPORT_SPEC.md` + mục “Xuất file” trong `docs/APP_GUIDE.md`.

---

## 5) Coverage Matrix — không được thiếu màn hình/luồng

> Dev tạo bảng này và tick hoàn thành khi đã:
> (1) chạy thử, (2) viết hướng dẫn, (3) có checklist ảnh.

### 5.1 Danh sách luồng tối thiểu phải có
- [ ] Cài đặt APK nội bộ (và phương án cài thay thế: PC/ADB nếu tải treo).
- [ ] Tạo/chọn kho.
- [ ] Quản lý vị trí: tạo/sửa/xóa.
- [ ] Quét QR vị trí: đúng format, sai format, không có quyền camera.
- [ ] Quét mã hàng (barcode): tìm thấy / không tìm thấy.
- [ ] Tìm theo text: gợi ý, normalize, chọn item.
- [ ] Nhập SL kiểm: tăng/giảm, nhập nhanh, reset.
- [ ] Ghi chú / ngoại lệ: khi nào dùng, cách ghi.
- [ ] Xem tổng hợp Cross-location: lọc “chỉ lệch”, phân trang, refresh.
- [ ] Xuất CSV.
- [ ] Xuất XLSX (nếu giữ).
- [ ] Mở file đã xuất + chia sẻ cho kế toán (Zalo/Email/Drive… tùy chính sách máy).
- [ ] Offline: thao tác khi mất mạng (nếu có), dữ liệu có mất không.
- [ ] Đồng bộ/khôi phục (nếu có).
- [ ] Các trạng thái lỗi: DB lỗi, file system lỗi, permission lỗi.

---

## 6) Kịch bản test bắt buộc (để docs khớp thực tế)

### 6.1 Dataset tối thiểu để test
- 5 SKU (như demo hiện tại) + 2 SKU trùng/na ná (để test suggestion).
- 2 vị trí trong 1 kho + 1 vị trí “xe” (nếu có).
- Ít nhất 1 SKU có:
  - SL sổ sách > 0
  - SL kiểm = 0 (hết hàng)
  - SL kiểm > sổ sách (dư)
  - SL kiểm < sổ sách (thiếu)

### 6.2 Test “đã kiểm không cập nhật”
Dev phải kiểm tra:
- Sau khi nhập SL kiểm và lưu:
  - Card item có đổi badge “Đã kiểm” chưa?
  - Tổng số “Đã kiểm” trên dashboard/cross-location có tăng chưa?
- Nếu không tăng:
  - điều kiện “đã kiểm” đang dựa trên field nào?
  - update field đó có thực sự commit vào DB không?
  - có lỗi race condition do state stale không?

**Output**: tài liệu hoá trong `TROUBLESHOOTING.md` + sửa bug (nếu phát hiện).

---

## 7) Cấu trúc nội dung chi tiết của `docs/APP_GUIDE.md` (mẫu bắt buộc)

### 7.1 Trang 1 — Tổng quan 1 phút
- App dùng để làm gì trong kiểm kê định kỳ.
- Đầu vào: snapshot từ kế toán/hệ thống.
- Đầu ra: file nộp lại (CSV/XLSX).
- Luồng chuẩn: Nạp dữ liệu → Chọn kho → Quét vị trí → Kiểm SKU → Tổng hợp → Xuất.

### 7.2 Cài đặt & quyền cần thiết
- Cách cài APK nội bộ.
- Cấp quyền camera, file/media, share.
- Lưu ý thiết bị “không tải được APK”: phương án cài qua PC/ADB.

### 7.3 Hướng dẫn theo từng màn hình (bắt buộc)
Với mỗi màn hình, dùng template mục 2.2.
- Trung tâm kiểm kê (dashboard)
- Quét vị trí
- Quản lý vị trí
- Tìm/Scan item
- Chi tiết item + nhập số
- Ghi chú/ngoại lệ
- Tổng hợp Cross-location
- Xuất file

### 7.4 Các quy tắc số liệu (link sang DATA_RULES)
- Định nghĩa “Sổ sách/Cuối kỳ” vs “Thực tế/SL kiểm” vs “Chênh lệch”.
- “Đã kiểm” được xác định như thế nào (theo code).
- Khi nào được chỉnh sửa, khi nào chỉ ghi chú.

### 7.5 Hướng dẫn nộp file cho kế toán
- Nơi lưu file.
- Tên file (định dạng).
- Cách gửi (share).
- Checklist trước khi nộp.

---

## 8) Nội dung tối thiểu của `docs/TROUBLESHOOTING.md`

Bắt buộc có:
- Camera không mở / không quét
- Không tìm thấy mã hàng
- Nhập rồi nhưng không lên “đã kiểm”
- Xuất file lỗi / file rỗng / chỉ có 1 dòng
- App crash / quay về màn trước
- Thiết bị không tải/cài APK (treo 100%): SOP xử lý + phương án cài thay thế

Mỗi lỗi phải có:
- Dấu hiệu
- Nguyên nhân thường gặp (ngắn gọn)
- Cách tự kiểm tra
- Cách khắc phục
- Khi nào cần gọi kỹ thuật

---

## 9) Checklist chất lượng tài liệu (QA docs)

- [ ] Không có “khoảng trống” (màn hình có trong app nhưng không có trong docs).
- [ ] Mọi nút/CTA quan trọng đều có mô tả “khi nào dùng”.
- [ ] Mọi thuật ngữ xuất hiện đều có trong GLOSSARY.
- [ ] Không có câu mơ hồ kiểu “bấm vào đây” mà không chỉ rõ nút nào.
- [ ] Có checklist ảnh cho tất cả mục quan trọng.
- [ ] Có “Known limitations” và “Next improvements”.

---

## 10) Kế hoạch làm việc đề xuất (3–5 ngày tuỳ scope)

**Ngày 1**
- Inventory screens/routes + tạo `SCREEN_MAP.md`.
- Chạy smoke test toàn bộ app, ghi lại luồng.

**Ngày 2**
- Viết `APP_GUIDE.md` (bản 1), đặt placeholder ảnh.

**Ngày 3**
- Viết `DATA_RULES.md` + `EXPORT_SPEC.md` + `GLOSSARY.md`.

**Ngày 4**
- Viết `TROUBLESHOOTING.md` + `KNOWN_LIMITATIONS.md`.
- QA review docs: coverage matrix, sửa chỗ thiếu.

**Ngày 5 (nếu cần)**
- Chụp ảnh thật + khoanh vùng theo checklist, chèn vào docs.
- Chạy lại test, chốt release notes.

---

## 11) Phụ lục: Mẫu “CHECKLIST CHỤP ẢNH” (copy/paste)

**CHECKLIST CHỤP ẢNH**
- Ảnh 1: [HINH-xx] <Tên màn hình> — trạng thái bình thường  
  - Callouts: (1) … (2) … (3) …
- Ảnh 2: [HINH-xx] <Tên màn hình> — trạng thái lỗi/empty/loading  
  - Callouts: (1) … (2) …
- Lưu ý:
  - Che thông tin nhạy cảm (IMEI, số điện thoại, tên khách hàng, mã nội bộ…)
  - Chụp đúng độ phân giải màn hình thiết bị (PM84/PM86 + điện thoại test)
  - Không để lộ dữ liệu thật của khách hàng nếu tài liệu chia sẻ rộng

---

## 12) Ghi chú vận hành thiết bị doanh nghiệp (PM84/PM86)

- Thiết bị công nghiệp chạy Android nhưng có thể bị giới hạn bởi policy/quản trị thiết bị (MDM).  
- Vì vậy tài liệu cài đặt phải có “kế hoạch B”: cài qua PC/ADB hoặc kênh nội bộ, tránh phụ thuộc hoàn toàn vào tải APK trên thiết bị.
