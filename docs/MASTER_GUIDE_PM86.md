# PM84/PM86 StockCount - Master Guide Điều Hành Vận Hành Kho

**Phiên bản tài liệu:** 2.0  
**Ngày cập nhật:** 08/02/2026  
**Đối tượng sử dụng:** Quản lý vận hành kho, tổ trưởng kiểm kê, QA nội bộ

## Tuyên bố điều hành
Tài liệu này là bản hướng dẫn vận hành chuẩn để triển khai kiểm kê kho bằng PM84/PM86 theo mô hình offline, đảm bảo 3 mục tiêu: **ra số liệu nhanh**, **kiểm soát sai lệch rõ nguyên nhân**, **xuất báo cáo sẵn sàng đối soát**.

## Mục lục
- [1. Bảng điều hành 1 phút](#1-bảng-điều-hành-1-phút)
- [2. Mô hình vận hành chuẩn](#2-mô-hình-vận-hành-chuẩn)
- [3. Hướng dẫn theo màn hình](#3-hướng-dẫn-theo-màn-hình)
- [4. Chuẩn dữ liệu và chuẩn báo cáo](#4-chuẩn-dữ-liệu-và-chuẩn-báo-cáo)
- [5. SOP xử lý sự cố trọng yếu](#5-sop-xử-lý-sự-cố-trọng-yếu)
- [6. Checklist triển khai kho mới](#6-checklist-triển-khai-kho-mới)
- [7. Danh mục hình minh họa](#7-danh-mục-hình-minh-họa)
- [8. Tài liệu chi tiết liên kết](#8-tài-liệu-chi-tiết-liên-kết)

## 1. Bảng điều hành 1 phút

| Trục điều hành | Câu hỏi quản lý cần trả lời | Nơi theo dõi |
|---|---|---|
| Tiến độ kiểm kê | Đã kiểm bao nhiêu mã? Còn bao nhiêu mã? | `/inventory` |
| Chất lượng số liệu | Mã nào lệch nhiều? lệch do đâu? | `/report/items` + `/report/[itemKey]` |
| Kỷ luật vận hành | Vị trí nào chưa kiểm hoặc kiểm dở? | `/locations` |
| Sẵn sàng bàn giao | Đã xuất được file CSV/XLSX hợp lệ chưa? | `/inventory` |

**KPI khuyến nghị cho ca kiểm kê**
- Tỷ lệ phủ mã trong phiên >= 95% trước giờ chốt.
- Tỷ lệ vị trí ở trạng thái `DONE` >= 90%.
- 100% mã lệch lớn phải có kiểm tra lại hoặc ghi chú nguyên nhân.

## 2. Mô hình vận hành chuẩn

### 2.1 Chế độ Cơ bản (1 thiết bị, triển khai nhanh)
1. Nạp dữ liệu MISA (khuyến nghị `.xlsx`).
2. Chọn kho và mở phiên kiểm kê.
3. Tạo vị trí (tên do người dùng đặt, mã hệ thống tự sinh).
4. Quét, lưu, hoàn tất kiểm kê theo vị trí.
5. Xem tổng hợp và xuất báo cáo.

**Phù hợp khi:** 1 đội kiểm kê làm trực tiếp tại kho, không chia dữ liệu liên máy.

### 2.2 Chế độ Nâng cao (kho tổng - kho nhỏ)
1. Khởi tạo dự án từ file MISA.
2. (Tùy chọn) gán danh mục mã theo vị trí.
3. Xuất gói kiểm kê vị trí cho kho nhỏ.
4. Kho nhỏ kiểm xong xuất file nộp vị trí.
5. Kho tổng nạp ngược file nộp để hợp nhất số liệu.
6. Chốt và xuất báo cáo tổng.

**Phù hợp khi:** cần điều phối nhiều điểm kiểm, nhiều nhân sự, vẫn vận hành offline.

## 3. Hướng dẫn theo màn hình

### 3.1 Trang Tổng quan (`/`)
**Mục tiêu điều hành:** kiểm soát dữ liệu nguồn, phiên làm việc và điểm vào nhanh.

**Thao tác chuẩn:**
1. Chọn đúng chức năng nhanh theo nhiệm vụ (`Tiếp tục phiên`, `Bắt đầu phiên`, `Nạp dữ liệu MISA`, ...).
2. Kiểm tra card **Dữ liệu nguồn** đang hoạt động.
3. Chọn đúng **Kho hàng** trước khi mở phiên.
4. Dùng **Lịch sử phiên** để tiếp tục hoặc loại bỏ phiên không còn dùng.

**Ảnh minh họa:**
- ![HINH-01](./images/HINH-01-home-overview.png)
- ![HINH-02](./images/HINH-02-home-session-modal.png)
- ![HINH-03](./images/HINH-03-home-file-manager.png)

### 3.2 Trang Kiểm kê vị trí (`/inventory`)
**Mục tiêu điều hành:** theo dõi KPI phiên, điều phối vào đúng vị trí, xuất báo cáo.

**Thao tác chuẩn:**
1. Xem KPI trung tâm kiểm kê (tổng mã, đã kiểm, ngoài danh mục).
2. Chọn vị trí từ danh sách hoặc quét QR vị trí để vào nhanh.
3. Mở `Quản lý vị trí` khi cần điều chỉnh cấu trúc vị trí.
4. Xuất báo cáo CSV/XLSX khi cần bàn giao số liệu.

**Ảnh minh họa:**
- ![HINH-04](./images/HINH-04-inventory-kpi.png)
- ![HINH-05](./images/HINH-05-inventory-location-list.png)
- ![HINH-06](./images/HINH-06-inventory-export-sheet.png)

### 3.3 Trang Quản lý vị trí (`/locations`)
**Mục tiêu điều hành:** đảm bảo cấu trúc vị trí phản ánh đúng thực địa và tiến độ từng vị trí.

**Thao tác chuẩn:**
1. Thêm vị trí mới (tên vị trí theo thực địa, mã tự sinh theo chuẩn hệ thống).
2. Sửa tên vị trí khi cần đồng bộ tên gọi vận hành.
3. Xóa vị trí không còn sử dụng trong phiên.
4. Ở chế độ nâng cao: nạp danh mục vị trí-SKU, xuất gói, nạp file nộp vị trí.

**Ảnh minh họa:**
- ![HINH-07](./images/HINH-07-locations-list-progress.png)
- ![HINH-08](./images/HINH-08-locations-operations-panel.png)
- ![HINH-09](./images/HINH-09-locations-add-edit-modal.png)

### 3.4 Trang Quét kiểm kê (`/scan`)
**Mục tiêu điều hành:** ghi nhận số kiểm nhanh, chính xác, không mất nháp.

**Thao tác chuẩn:**
1. Chọn mode quét phù hợp (`WEDGE`, `CAMERA`, `QUICK`).
2. Quét mã sản phẩm.
3. Điều chỉnh số lượng khi cần.
4. Lưu từng mã hoặc lưu toàn bộ nháp.
5. Nếu mã không tồn tại trong nguồn, dùng luồng thêm mới có kiểm soát.

**Ảnh minh họa:**
- ![HINH-10](./images/HINH-10-scan-camera-frame.png)
- ![HINH-11](./images/HINH-11-scan-item-qty.png)
- ![HINH-12](./images/HINH-12-scan-draft-sheet.png)
- ![HINH-13](./images/HINH-13-scan-not-found-add-new.png)

### 3.5 Trang Tổng hợp (`/report/items`) và Chi tiết mã (`/report/[itemKey]`)
**Mục tiêu điều hành:** tìm nhanh điểm lệch, khoanh vùng nguyên nhân theo vị trí.

**Thao tác chuẩn:**
1. Tìm/lọc các mã lệch.
2. Mở chi tiết mã để xem phân bổ theo vị trí.
3. Xem ngoại lệ và gợi ý nguyên nhân vận hành.
4. Quyết định: kiểm lại, ghi nhận hao hụt, hoặc đối soát nhập/xuất.

**Ảnh minh họa:**
- ![HINH-14](./images/HINH-14-report-item-overview.png)
- ![HINH-15](./images/HINH-15-report-by-location.png)
- ![HINH-16](./images/HINH-16-report-item-exceptions.png)

### 3.6 Trang Cài đặt (`/settings`) và Xử lý xung đột import (`/resolve-import`)
**Mục tiêu điều hành:** thiết lập chuẩn vận hành và xử lý dữ liệu nguồn mâu thuẫn.

**Thao tác chuẩn:**
1. Cài mode quét, mode vận hành, ngôn ngữ hiển thị.
2. Khi import trùng mã nhưng khác tên, vào màn resolve để chọn phương án giữ dữ liệu hoặc sửa mã.

## 4. Chuẩn dữ liệu và chuẩn báo cáo

### 4.1 Định nghĩa cột trọng yếu
- `Tồn hệ thống`: số lượng gốc theo snapshot MISA.
- `Tổng đếm`: tổng số lượng đếm thực tế tại vị trí.
- `Đếm OK`: số lượng đạt sau khi trừ ngoại lệ.
- `Chênh lệch`: `Đếm OK - Tồn hệ thống`.
- `Nguyên nhân vận hành (gợi ý)`: phân loại khả năng lệch theo ngưỡng.

### 4.2 Quy tắc trạng thái
- `Khớp`: chênh lệch = 0.
- `Lệch`: chênh lệch khác 0.
- `Chưa kiểm`: chưa có dữ liệu đếm.

### 4.3 Quy tắc import/export bắt buộc
1. Nạp nguồn MISA tại Trang Tổng quan.
2. Nạp gói vị trí tại Trang Tổng quan (chế độ nâng cao).
3. Nạp file nộp vị trí tại Quản lý vị trí (chế độ nâng cao).
4. Xuất CSV/XLSX tại Kiểm kê vị trí.

## 5. SOP xử lý sự cố trọng yếu

### 5.1 Camera không quét
- Kiểm tra quyền camera.
- Đưa mã vào khung quét và giữ ổn định.
- Quét lại sau thời gian cooldown.

### 5.2 Nạp MISA thất bại
- Kiểm tra đúng layout file MISA thực tế.
- Kiểm tra có nạp nhầm file gói/nộp không.
- Ưu tiên dùng `.xlsx` nếu CSV lỗi mã hóa.

### 5.3 Cài APK treo 100%
- Xác nhận thiết bị Android 11+.
- Tải lại qua mạng ổn định.
- Cài qua ADB nếu thiết bị bị chặn tải trực tiếp.

### 5.4 App thoát đột ngột
- Giảm tải RAM (đóng app nền).
- Lưu theo đợt ngắn.
- Dùng dev build để thu log và xác định điểm lỗi.

## 6. Checklist triển khai kho mới
- [ ] Cài APK đúng phiên bản trên thiết bị mục tiêu.
- [ ] Test nạp `Check_item.xlsx` thành công.
- [ ] Test luồng vị trí -> quét -> lưu -> báo cáo.
- [ ] Test xuất CSV/XLSX và mở lại được trên máy nhận.
- [ ] Test các tình huống lỗi chính (camera/import/export).

## 7. Danh mục hình minh họa

| Mã hình | Tên file | Màn hình | Trạng thái |
|---|---|---|---|
| HINH-01 | `HINH-01-home-overview.png` | Home overview | Pending capture |
| HINH-02 | `HINH-02-home-session-modal.png` | Home session modal | Pending capture |
| HINH-03 | `HINH-03-home-file-manager.png` | Home file manager | Pending capture |
| HINH-04 | `HINH-04-inventory-kpi.png` | Inventory KPI | Pending capture |
| HINH-05 | `HINH-05-inventory-location-list.png` | Inventory location list | Pending capture |
| HINH-06 | `HINH-06-inventory-export-sheet.png` | Inventory export sheet | Pending capture |
| HINH-07 | `HINH-07-locations-list-progress.png` | Locations progress | Pending capture |
| HINH-08 | `HINH-08-locations-operations-panel.png` | Locations operations panel | Pending capture |
| HINH-09 | `HINH-09-locations-add-edit-modal.png` | Locations add/edit modal | Pending capture |
| HINH-10 | `HINH-10-scan-camera-frame.png` | Scan camera | Pending capture |
| HINH-11 | `HINH-11-scan-item-qty.png` | Scan qty | Pending capture |
| HINH-12 | `HINH-12-scan-draft-sheet.png` | Scan draft | Pending capture |
| HINH-13 | `HINH-13-scan-not-found-add-new.png` | Scan not found | Pending capture |
| HINH-14 | `HINH-14-report-item-overview.png` | Report item overview | Pending capture |
| HINH-15 | `HINH-15-report-by-location.png` | Report by location | Pending capture |
| HINH-16 | `HINH-16-report-item-exceptions.png` | Report exceptions | Pending capture |

**Lưu ý ảnh báo cáo:**
- Chỉ dùng ảnh thật từ thiết bị/emulator.
- Không dùng ảnh placeholder/rỗng để nộp.
- Quy trình capture tại `docs/images/CAPTURE_CHECKLIST.md`.

## 8. Tài liệu chi tiết liên kết
- [Hướng dẫn app đầy đủ](./APP_GUIDE.md)
- [Screen map chi tiết](./SCREEN_MAP.md)
- [Quy tắc dữ liệu](./DATA_RULES.md)
- [Đặc tả export](./EXPORT_SPEC.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [Glossary](./GLOSSARY.md)
- [Known limitations](./KNOWN_LIMITATIONS.md)
- [Release notes](./RELEASE_NOTES.md)

## 9. Ghi chú quản trị tài liệu
- Phạm vi tài liệu này tập trung vào vận hành và báo cáo.
- Khi UI thay đổi, cập nhật lại đúng section bị ảnh hưởng và danh mục hình liên quan.
- Không trộn thay đổi nghiệp vụ/DB vào phiên bản tài liệu vận hành nếu chưa qua vòng nghiệm thu kỹ thuật.
