# PM84 – Tổng hợp lỗi cần fix (WEDGE + UI/UX Scan)

Phiên bản tài liệu: 0.1  
Ngày: 2026-02-25  
Phạm vi: Ứng dụng PM84/PM86 StockCount – màn **Scan** (WEDGE/Camera) và các luồng liên quan.

---

## 0) Bối cảnh & mục tiêu
- PM84 đã **cài app thành công**.
- Khi vào **màn Scan** và chọn **WEDGE**, người dùng bóp cò quét rất nhanh, nhưng **app không ghi nhận đúng** và phát sinh nhiều lỗi UI/UX.
- Mục tiêu: làm cho trải nghiệm **“bóp cò là ăn”**:
  - Quét liên tục nhanh, UI cập nhật kịp.
  - Không cần thao tác thừa (“bấm mở” mới được quét).
  - Không bị nhập nhầm vào ô khác, không mất focus.

---

## 1) Triệu chứng quan sát thực tế (từ video)
### 1.1 WEDGE không “vào app”
- Vào màn Scan → chọn WEDGE → **chưa bấm nút “mở quét”** nhưng bóp cò vẫn quét ra kết quả.
- Kết quả quét **không đi vào app**, mà **hiện ở góc dưới** (toast/popup) với **mã số + nút Share** (mốc ~3.5s).

**Kết luận nhanh:** scanner engine hoạt động, nhưng output không theo kiểu “keyboard wedge” (gõ vào input) nên app không bắt được.

### 1.2 UI/UX sai trạng thái (“bấm được khi chưa mở”)
- Một số thao tác có thể **tích/chọn** dù trạng thái quét “chưa mở”.
- Trạng thái “Sẵn sàng quét” không rõ ràng, gây hiểu nhầm “app không nhận máy”.

### 1.3 Trải nghiệm “quét nhanh” chưa tối ưu cho PM84
- PM84 bắn rất nhanh, nhưng UI hiện tại chưa được thiết kế để:
  - Nhận nhiều scan liên tục (queue).
  - Auto-add/auto-accumulate + phản hồi tức thì (beep/rung/toast).

---

## 2) Phân loại nguyên nhân gốc
### A) Cấu hình thiết bị PM84 (P0)
PM84 đang output theo kiểu **User Message/Clipboard/Intent**, nên hệ điều hành tự pop-up kết quả (có Share).  
=> App không nhận vì **không có chuỗi barcode “gõ vào input”**.

### B) Ứng dụng chưa có pipeline WEDGE chuẩn (P0)
- Thiếu cơ chế **Hidden Input giữ focus** để nhận dữ liệu wedge.
- Thiếu cơ chế **finalize chuỗi** (Enter/LF hoặc timeout 50–120ms).
- Có thể đang áp dụng cooldown camera sang WEDGE → nuốt sự kiện khi quét nhanh.

### C) State machine UI chưa khóa theo “trạng thái sẵn sàng” (P1)
- Nút/checkbox hoạt động sai thời điểm.
- Người dùng không biết lúc nào app đang “listen” WEDGE thật sự.

---

## 3) Danh sách lỗi cần fix (theo ưu tiên)
### P0 – Bắt buộc fix để WEDGE chạy được
1) **Chuẩn hoá cấu hình ScanSettings trên PM84**
   - Wedge mode → Result type = **Keyboard / Key Event** (gửi như gõ phím).
   - Tắt User Message (để không pop-up + Share).
   - Terminator/Suffix = **Enter/LF** (hoặc cấu hình tương đương).
   - (Tuỳ mô hình) Nếu doanh nghiệp muốn “không phụ thuộc focus”: bật/chuẩn hoá **Intent Broadcast** để app nhận qua intent.

2) **Implement pipeline WEDGE chuẩn trong app**
   - Có **TextInput ẩn** (hidden) để nhận chuỗi barcode:
     - `autoFocus = true`
     - `showSoftInputOnFocus = false`
     - Refocus lại sau khi đóng modal/sheet hoặc khi user chạm linh tinh.
   - Parse chuỗi barcode theo 2 điều kiện:
     - Nhận ký tự kết thúc: `\n` / `\r` (Enter/LF), **hoặc**
     - Timeout finalize: không có ký tự mới trong ~80ms.
   - Khi finalize:
     - Normalize: trim, remove terminator, validate length/pattern.
     - Dispatch vào `resolveBarcode()` như camera.

3) **Tách cooldown của CAMERA và WEDGE**
   - CAMERA có cooldown để tránh quét trùng.
   - WEDGE **không dùng cooldown camera**; thay bằng queue + finalize, để bóp cò liên tục vẫn nhận.

### P1 – Fix UI/UX để người dùng không bị “lạc trạng thái”
4) **State machine rõ ràng & khóa UI đúng**
   - Trạng thái đề xuất:
     - `Chưa sẵn sàng`
     - `Sẵn sàng quét`
     - `Đang ghi nhận`
     - `Đã ghi nhận`
   - Khi chưa sẵn sàng: disable các thao tác gây hiểu nhầm (tick/confirm/submit…).
   - Khi vào WEDGE mode: **tự chuyển sang “Sẵn sàng quét”** (không bắt user bấm “mở”).
   - Hiển thị badge rõ: `WEDGE ● Sẵn sàng` / `CAMERA ● Đang bật`.

5) **Phản hồi tức thì cho “quét nhanh”**
   - Mỗi scan hợp lệ:
     - Beep/rung ngắn (nếu device hỗ trợ).
     - Toast: “Vừa quét: <code> +1”.
     - Highlight item vừa cập nhật.

### P2 – Nâng trải nghiệm vận hành (khuyến nghị)
6) **Auto-add + Undo (3–5s)**
   - Quét xong tự cộng dồn ngay.
   - Cho nút Undo ngắn hạn để sửa nhầm, giảm thao tác.

7) **Trang “Test Scanner” trong Settings**
   - Bóp cò → hiện “Đã nhận: xxxx”.
   - Hiện thông tin suffix/terminator (nếu đọc được) hoặc trạng thái mode.
   - Giúp đội vận hành tự kiểm tra trong 10 giây, giảm gọi kỹ thuật.

---

## 4) Kịch bản test nhanh (5 giây “chốt đúng bệnh”)
### Test 1 – Nhận diện output sai kiểu keyboard (case hiện tại)
- Vào Scan → chọn WEDGE → **không bấm nút mở** → bóp cò:
  - Nếu **pop-up góc dưới + có Share** → output đang là User Message/Clipboard/Intent.
  - Kết luận: **scanner OK, cấu hình output chưa đúng cho app**.

### Test 2 – Sau khi fix cấu hình (mục 3.1)
- Vào Scan → WEDGE:
  - Bóp cò → **không còn pop-up Share**.
  - Barcode phải vào app và:
    - Add item mới / increment item cũ.
    - Có toast/beep theo thiết kế.

### Test 3 – Stress test quét nhanh
- Quét liên tục 20–50 lần:
  - Không bỏ sót scan.
  - UI không giật/đơ.
  - Số lượng cộng dồn chính xác.

---

## 5) Acceptance Criteria (tiêu chí “pass”)
- [ ] Khi chọn WEDGE, người dùng **bóp cò là quét được ngay**, không cần bấm “mở”.
- [ ] Không còn pop-up kết quả có Share (trừ khi intentionally bật User Message).
- [ ] Barcode được ghi nhận đúng vào app (add/increment), phản hồi tức thì.
- [ ] Không bị “gõ nhầm” vào search/qty/field khác (do giữ focus input ẩn).
- [ ] Quét nhanh liên tục không mất sự kiện, không nuốt scan.
- [ ] UI không cho thao tác sai trạng thái (không “tick được khi chưa sẵn sàng”).
- [ ] Có hướng dẫn ngắn cho vận hành: “Nếu thấy pop-up Share → chỉnh ScanSettings …”.

---

## 6) Việc cần bạn cung cấp cho dev (để fix nhanh)
- Ảnh/video chụp **ScanSettings** của PM84 (mục Wedge mode):
  - Result type đang là gì?
  - Terminator/Suffix đang là gì?
  - User Message / Clipboard / Intent có đang bật không?
- 1–2 barcode mẫu (độ dài, prefix) để dev test normalize.

---

## 7) Gợi ý chia việc (1 sprint ngắn)
- Ngày 1: Chuẩn hoá ScanSettings + xác nhận output dạng keyboard.
- Ngày 2: Implement hidden input + finalize logic + tách cooldown camera/wedge.
- Ngày 3: State machine UI + phản hồi scan nhanh (toast/beep/highlight).
- Ngày 4: QA stress test + fix edge cases (modal, mất focus, quay lại màn).
- Ngày 5 (tuỳ chọn): “Test Scanner” + Auto-add + Undo.

---

## 8) Ghi chú rủi ro
- Nếu công ty có MDM/Policy hạn chế ScanSettings, cần chốt 1 cấu hình chuẩn và hướng dẫn IT áp chính sách thiết bị.
- Nếu muốn “không phụ thuộc focus” cho WEDGE, nên ưu tiên **Intent Broadcast** + receiver trong app (cần dev xác nhận PM84 hỗ trợ mode này).
