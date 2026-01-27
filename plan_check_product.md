# plan.md — Nâng cấp tính năng Kiểm kê (PM86 / Multi-Location / “Sự thật” tồn kho)

## 0) Bối cảnh & mục tiêu
**Bối cảnh:** Kiểm kê ngoài kho cho nhiều **kho (warehouse)** và **kho xe (vehicle stock)** trong cùng **một phiên**. Hàng hóa rải nhiều location; cùng một SKU có thể gặp lại khi chuyển location. Hiện tại app chủ yếu ghi **chênh lệch chung** + ghi chú, chưa giúp phân rã nguyên nhân và chưa đảm bảo “coverage” (đã kiểm đủ location hay chưa).

**Mục tiêu nâng cấp (định nghĩa “kiểm kê tốt nhất”):**
1) **Nhanh**: thao tác 1 tay trên PM86 (WEDGE/Enter), tối ưu Fast Lane.  
2) **Thật**: không chỉ ra số chênh mà còn:
   - biết **coverage** (đã kiểm đủ location chưa)  
   - gợi ý **nguyên nhân lệch** theo rule  
   - phân rã số lượng theo **bucket chất lượng** (usable vs ngoại lệ) khi cần
3) **Chuẩn để nạp MISA**: xuất **CSV machine-friendly** theo (Location × SKU).  
4) **Dễ vận hành nhiều kho**: có dashboard tiến độ theo location, không nhầm location, có “kho xe”.

---

## 1) Quy ước Location (ID trước, đặt tên sau)
### 1.1 Nguyên tắc
- **Luôn dùng `location_id` ổn định** (không phụ thuộc tên hiển thị).
- `location_name` chỉ là **display**, có thể đổi sau.
- Cho phép tạo location bằng **code/ID trước**, đặt tên sau (khi chưa đủ thông tin).

### 1.2 Cấu trúc Location
- `location_id`: string (UUID hoặc code chuẩn)
- `location_code`: string (unique trong scope công ty) — ví dụ `WH_VTE_MAIN`, `VEH_29A12345`
- `display_name`: string (có thể chỉnh sau)
- `type`: `WAREHOUSE | VEHICLE | QUARANTINE | OTHER`
- `status`: `ACTIVE | INACTIVE`
- `meta`: optional (biển số, driver, tuyến…)

### 1.3 QR/Barcode Location (khuyến nghị)
QR dán tại cửa kho / trên xe:
- Payload đơn giản: `LOC:WH_VTE_MAIN` hoặc `LOC:VEH_29A12345`
App parse ra `location_code` → lookup → set current location.

---

## 2) Thiết kế nghiệp vụ kiểm kê theo Location (core)
### 2.1 Data model (Clean Architecture)
> Key mấu chốt: dữ liệu kiểm kê là **(product_id, location_id)**. Một SKU rải 3 location = 3 dòng khác nhau.

**Entities**
- `StockCountSession`
  - `session_id`
  - `title`
  - `created_at`
  - `cutoff_time` (thời điểm snapshot MISA)
  - `mode_default`: `ADD | SET`
  - `blind_count`: boolean (optional)
  - `locations_in_scope[]`: list of `location_id`
  - `status`: `DRAFT | IN_PROGRESS | CLOSED | EXPORTED`
- `LocationCount` (sub-session theo location)
  - `session_id`
  - `location_id`
  - `status`: `PENDING | IN_PROGRESS | DONE | LOCKED`
  - `progress`: `{ expected_lines, counted_lines, uncounted_lines, need_recount_lines }`
- `CountLine` (per product × location)
  - `session_id`
  - `location_id`
  - `product_id`
  - `system_qty` (snapshot từ MISA theo location)
  - `count_total` (tổng physical count tại location)
  - `exceptions[]`: list of `{ reason, qty, note?, evidence? }`
  - `count_usable` = `count_total - sum(exceptions.qty)`
  - `diff` = `count_usable - system_qty`
  - `state`: `UNCOUNTED | COUNTED | NEED_RECOUNT | QUARANTINE`
  - `updated_at`, `updated_by`
- `ProductIdentifier` (nếu đã có/đang dùng)
  - map barcode/alias → product_id để scan nhanh

### 2.2 Coverage theo SKU toàn phiên (để tránh “lệch tạm thời”)
**CoverageStatus (per product trong session):**
- `NOT_STARTED`: chưa đếm ở location nào
- `PARTIAL`: đã đếm ở một số location nhưng chưa đủ scope
- `COMPLETE`: đã kiểm đủ scope (hoặc user xác nhận đủ)

**Tính coverage**
- `checked_locations = count(location_id where CountLine.count_total exists)`
- `coverage = checked_locations / locations_in_scope`
- Có thể “complete” thủ công khi scope thay đổi/ngoại lệ vận hành.

### 2.3 Reconciliation Hint (gợi ý nguyên nhân lệch ở cấp SKU toàn phiên)
Sinh hint cho mỗi SKU dựa trên pattern dữ liệu giữa các location:
1) `INCOMPLETE_COVERAGE` — chưa kiểm hết location → lệch tạm thời
2) `MISLOCATION` — kho A thừa, kho B thiếu (bù trừ) → hàng nằm sai vị trí
3) `IN_TRANSIT_VEHICLE` — lệch gợi ý do xe (xe chưa kiểm/xe có tồn)
4) `QUALITY_EXCEPTION` — có ngoại lệ chất lượng (expired/damaged/wrong code/size…)
5) `TRANSACTION_TIMING` — phát sinh sau cutoff hoặc chứng từ chưa lên MISA

---

## 3) Bucket chất lượng (đếm “thật” không chỉ số)
### 3.1 Nguyên tắc thao tác
- **Fast Lane**: 80–90% hàng là OK → mặc định **không cần phân loại**.
- Chỉ khi có vấn đề mới mở Quick Split để nhập ngoại lệ.

### 3.2 Bucket mặc định
- `GOOD/USABLE` (implicit) = `count_total - sum(exceptions)`

### 3.3 Exceptions (P0 đề xuất tối thiểu)
- `EXPIRED` (hết hạn)
- `DAMAGED` (hư hỏng)
- `WRONG_CODE` (lộn mã/sai barcode)
- `WRONG_SIZE_PACK` (nhầm size/quy cách)
- `LOW_QUALITY` (kém chất lượng)
- `OTHER`

> Có thể khởi động P0 chỉ với 4–5 loại chính để thao tác nhanh, mở rộng sau.

---

## 4) Trạng thái (tổng hợp đã thống nhất)
### 4.1 LocationCount.status (4)
`PENDING | IN_PROGRESS | DONE | LOCKED`

### 4.2 CountLine.state (4)
`UNCOUNTED | COUNTED | NEED_RECOUNT | QUARANTINE`

### 4.3 CoverageStatus (3)
`NOT_STARTED | PARTIAL | COMPLETE`

### 4.4 ReconciliationHint (5)
`INCOMPLETE_COVERAGE | MISLOCATION | IN_TRANSIT_VEHICLE | QUALITY_EXCEPTION | TRANSACTION_TIMING`

### 4.5 Quality buckets (7, gồm GOOD)
`GOOD | EXPIRED | DAMAGED | WRONG_CODE | WRONG_SIZE_PACK | LOW_QUALITY | OTHER`

---

## 5) UX/UI Flow tối ưu PM86 (WEDGE / 1 tay)
### 5.1 Màn Home Session
- Tạo/Chọn Session
- Danh sách Location trong scope + progress bar từng location
- Nút: **Export CSV (MISA)** / **Export Breakdown (Internal)**

### 5.2 Màn Set Location (cực quan trọng)
- Hiển thị lớn “LOCATION hiện tại”
- Chọn từ list / search
- **Scan QR location** để set nhanh (khuyến nghị)

### 5.3 Màn Scan Fast Lane (P0)
**Chu kỳ thao tác tối ưu:**
1) Scan SKU → auto match product
2) Focus vào ô số → nhập **TOTAL** → Enter
3) Popup nhanh: “Có ngoại lệ không?”
   - [Không] (Enter) → Save → quay về ô scan
   - [Có] → Quick Split

**Tối ưu:**
- Auto-focus ô scan sau khi Save
- Debounce scan (bỏ scan trùng trong 300–500ms)
- Cảnh báo số lượng bất thường (ví dụ > 5× system_qty)

### 5.4 Quick Split (P0)
- Hiển thị `TOTAL`
- Chip reason + ô qty + nút +1/+5/+10
- Hiển thị live: `USABLE = TOTAL - EXC`
- Save (Enter)

### 5.5 Màn Review theo Location
Tabs:
- Uncounted / Counted / Need Recount / Quarantine
- Search SKU
- Nút “Đi kiểm phần chưa đếm” (jump back Scan)

### 5.6 Màn Review theo SKU (cross-location)
Một SKU hiển thị bảng:
- Expected (system_qty) theo location
- Counted total/usable theo location
- Coverage + hint nguyên nhân
Nút hành động:
- “Đi kiểm location còn thiếu”
- “Đánh dấu cần đếm lại”

---

## 6) Quy tắc thông minh (helpers) — “Smart đúng nghĩa”
### 6.1 Lệch do chưa đủ coverage
Nếu coverage != COMPLETE:
- Gắn label “Lệch tạm thời”
- Gợi ý location chưa kiểm

### 6.2 Mislocation detector
Nếu pattern: location A `diff>0` và location B `diff<0` và cùng SKU:
- Hint MISLOCATION
- Tạo task nội bộ “xác minh vị trí/điều chuyển” (log)

### 6.3 Vehicle hint
Nếu có location type VEHICLE trong scope và chưa kiểm:
- Hint IN_TRANSIT_VEHICLE
- Nút “Đi kiểm xe”

### 6.4 Recount rule
Nếu `abs(diff) >= X` hoặc `abs(diff)/max(system_qty,1) >= Y%`:
- Set state = NEED_RECOUNT
- Có log count1/count2 (optional P1)

### 6.5 Anti-wrong-item (nhầm size/quy cách)
- Hiển thị rõ quy cách (size/pack) khi scan
- Nếu user chọn item khác top1 fuzzy → cảnh báo “Có thể nhầm size/quy cách”

---

## 7) Export / Import (MISA & nội bộ)
### 7.1 Export file cho MISA (CSV)
**1 file tổng** (mặc định) có cột Location:
- `LocationCode, LocationName, Mã hàng, Tên hàng, ĐVT, Cuối kỳ, SL Kiểm kê, Chênh lệch, Ghi chú`

Quy tắc:
- `SL Kiểm kê` = **count_usable** (khuyến nghị để hạch toán đúng)
- `Ghi chú` auto append: `Expired:..; Damaged:..; WrongCode:..; WrongSize:..`

Tùy chọn:
- Export per location (mỗi kho/xe 1 file) nếu kế toán thích theo kho.

### 7.2 Export Breakdown nội bộ (CSV)
Thêm cột:
- `Total, Usable, Expired, Damaged, WrongCode, WrongSize, LowQuality, Other, Coverage, Hint`

---

## 8) API/Use-cases (Function list để Dev triển khai)
> Clean Architecture: Presentation → UseCases → Repositories → DataSources

### 8.1 Session
- `createSession(params)`
- `loadSession(session_id)`
- `closeSession(session_id)`
- `addLocationsToScope(session_id, location_ids[])`
- `setSessionOptions(session_id, { mode_default, blind_count, recount_threshold })`

### 8.2 Location context
- `setCurrentLocation(session_id, location_id)`
- `setCurrentLocationByScan(session_id, scannedText)` → parse `LOC:` → map to location
- `finishLocation(session_id, location_id)` → status DONE
- `lockLocation(session_id, location_id)` → status LOCKED (role-based)

### 8.3 Product matching
- `resolveProductByScan(scannedText, { location_id?, preferLocation=true })`
- `saveBarcodeAlias(product_id, scannedText)` (role-based / smart-learn)

### 8.4 Counting
- `upsertCountTotal(session_id, location_id, product_id, qty, mode=ADD|SET)`
- `addException(session_id, location_id, product_id, reason, qty, note?)`
- `removeException(...)`
- `computeUsable(count_total, exceptions[])`
- `evaluateLineState(diff, rules)` → COUNTED/NEED_RECOUNT/QUARANTINE
- `debounceScan(scannedText)` (infra)

### 8.5 Coverage & Reconciliation
- `computeCoverage(session_id, product_id)` → NOT_STARTED/PARTIAL/COMPLETE
- `computeSkuTotalsAcrossLocations(session_id, product_id)`
- `suggestReconciliationHint(session_id, product_id)` → 5 hints

### 8.6 Review & Navigation
- `getLinesByLocation(session_id, location_id, filter)`
- `getSkuOverview(session_id, product_id)`
- `getNextUncounted(session_id, location_id)`

### 8.7 Export
- `exportMisaCsv(session_id, options={ combined | perLocation })`
- `exportBreakdownCsv(session_id, options)`

---

## 9) Quyền hạn (Role-based) — tối giản nhưng cần thiết
- `Counter` (nhân viên): nhập số, thêm exception, không sửa snapshot, không lock
- `Supervisor`: lock/unlock location, confirm complete coverage, approve alias barcode
- `Admin`: quản lý locations, mapping barcode, cấu hình threshold

---

## 10) Non-functional (hiệu năng & ổn định)
- Offline-first: lưu local DB (SQLite/WatermelonDB/Realm tùy stack hiện tại)
- Sync/Export chỉ khi cần (CSV)
- Tối ưu render list (FlashList) cho review
- Bảo vệ thao tác: undo last action (optional P1)
- Log audit: ai nhập, lúc nào, ở location nào

---

## 11) Roadmap triển khai (không tăng thao tác)
### P0 (Đã hoàn thành ✅)
- [x] Location scope + set current location (Auto-create default)
- [x] CountLine per (product × location)
- [x] Fast Lane: scan → total → (no exception) save
- [x] Quick Split (6 exception types: Expired, Damaged, Wrong Code...)
- [x] Review per location: Uncounted/Counted
- [x] Export MISA CSV (combined) + Excel

### P1 (Sắp tới 🚀)
- [ ] Coverage per SKU + dashboard (Đã có Detail Report, cần Dashboard tổng)
- [ ] Reconciliation hint + “go to missing location” (Đã có Logic, cần UI Navigation)
- [ ] Mislocation / vehicle hint
- [ ] Smart alias suggestion (controlled)
- [ ] Quét QR Location (LOC:code) để tạo vị trí nhanh

### P2
- Evidence ảnh cho ngoại lệ vượt ngưỡng
- Count1/Count2 (recount) audit
- Bin/kệ (nếu cần)

---

## 12) Definition of Done (DoD)
- Không nhầm location (QR set location + cảnh báo khi SKU thuộc location khác)
- Có thể đi nhiều kho + xe trong 1 session, gặp lại SKU vẫn cộng dồn đúng
- Biết rõ “lệch tạm thời do chưa đủ coverage”
- Export CSV nạp MISA không lỗi, có đủ cột Location
- Có breakdown nội bộ để xử lý hàng lỗi/hết hạn/lộn mã
