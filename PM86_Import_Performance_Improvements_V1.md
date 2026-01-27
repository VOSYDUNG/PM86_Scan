# PM86 StockCount Expo — Cải tiến Import Excel (1→5) để tránh crash (Android)
**Phiên bản:** V1.0  
**Mục tiêu:** Import Excel ~2000 dòng **mượt**, không đơ UI/ANR, không crash do phình RAM, dữ liệu vào SQLite **an toàn** (có rollback).  
**Phạm vi áp dụng:** `resolve-import.tsx` + `infra/files/misaParser.ts` + `domain/usecases/*` + `data/repos/snapshotRepoSqlite.ts` + UI report/list.

---

## 1) Không giữ 2000 rows trong React/Zustand state
### Vấn đề
- Dễ **phình RAM**, re-render nhiều, crash khi list/report render lớn.
- Nếu lưu `rows2000` vào store rồi filter/search liên tục => tốn CPU/RAM.

### Yêu cầu thay đổi
- State/UI chỉ giữ **nhẹ**:
  - `importJobId`
  - `status` (`idle | validating | importing | done | failed`)
  - `progress` (0..100)
  - `totalRows`, `processedRows`
  - `errorCount`, `sampleErrors` (tối đa 50 dòng mẫu)
- Dữ liệu import (snapshot) **đổ thẳng vào SQLite**, không giữ toàn bộ trong store.

### Implementation gợi ý
- `presentation/store/appStore.ts`
  - Thêm slice `import` như trên
  - Tuyệt đối không có `snapshotRows: Row[]` dung lượng lớn

### Acceptance criteria
- Import 2000 dòng: RAM ổn định, UI vẫn thao tác được (Back/Cancel/Settings…).
- Không có state nào chứa mảng hàng nghìn dòng.

---

## 2) Parse Excel theo chunk + nhường event loop để tránh block UI (ANR)
### Vấn đề
- Parse 2000 dòng bằng JS một mạch => block JS thread → UI đơ → Android có thể kill.
- Thư viện Excel thường tạo object lớn, nếu parse “full sheet” sẽ tốn RAM.

### Yêu cầu thay đổi
- Parser phải hoạt động theo **chunk** (200–500 dòng/batch).
- Giữa các batch phải **yield** để UI thở:
  - `await new Promise(r => setTimeout(r, 0))`
  - hoặc `InteractionManager.runAfterInteractions` cho bước nặng

### Implementation gợi ý (mẫu cấu trúc)
- `src/infra/files/misaParser.ts` xuất ra dạng async generator hoặc callback chunk:

**Option A — async generator**
- `async function* parseMisaXlsxInChunks(fileUri, chunkSize=300)`
  - yield `{ rowsChunk, processed, total }`

**Option B — callback**
- `parseMisaXlsx(fileUri, { onChunk, onProgress })`

### Tối ưu thêm
- Chỉ đọc **cột cần thiết** (barcode, name, qty, unit, …)
- Tránh parse style/formula nếu không cần.
- Normalize theo dòng (trong chunk), không làm 1 lần cho cả dataset.

### Acceptance criteria
- Khi import chạy, vẫn có thể bấm back/cancel mà app không “đơ cứng”.
- Progress tăng dần theo batch, không nhảy 0→100 trong 1 phát.

---

## 3) SQLite insert bắt buộc: transaction + batch (bulk upsert)
### Vấn đề
- Insert từng dòng (2000 lần) + await từng câu => cực chậm, dễ timeout, dễ đơ.
- Nếu crash giữa chừng, DB bị “nửa vời”.

### Yêu cầu thay đổi
- `snapshotRepoSqlite` phải có hàm **bulkUpsert** theo batch, mỗi batch chạy trong **transaction**.
- Batch size gợi ý: 200–500 (tùy tốc độ máy PM86).

### Implementation gợi ý
- `src/data/repos/snapshotRepoSqlite.ts`
  - `bulkUpsertSnapshot(rows: SnapshotRow[], opts?: { batchSize?: number; jobId?: string })`
  - Bên trong: chia batch → `BEGIN` → insert/upsert nhiều dòng → `COMMIT`

### Index khuyến nghị (tùy schema hiện tại)
- Index cho key hay tra cứu: `barcode`, `itemKey`, `sessionId`, `locationId`
- Nếu có tra fuzzy/keywords: cân nhắc bảng mapping riêng thay vì query full table.

### Acceptance criteria
- Import 2000 dòng < ~10–30s (tùy máy), không đóng băng UI.
- Không có vòng lặp `for row await insert(row)` trực tiếp.

---

## 4) UI list/report: dùng virtualization tốt (FlashList) + memo hóa để không crash
### Vấn đề
- Sau import, màn report/items thường render list lớn → crash do render nặng.
- `FlatList` đôi khi vẫn ok, nhưng FlashList thường mượt hơn với list lớn.

### Yêu cầu thay đổi
- Dùng `@shopify/flash-list` cho danh sách lớn:
  - `app/report/items.tsx`
  - và bất kỳ list nào có khả năng lên hàng nghìn dòng
- `renderItem` + row component phải `React.memo`
- Không tạo props object mới liên tục (dễ re-render)

### Truy vấn dữ liệu
- Không “load all” 2000+ item lên memory nếu không cần.
- Ưu tiên:
  - paging / limit
  - search/filter query trực tiếp SQLite

### Acceptance criteria
- Mở report/items sau import 2000 dòng không crash, scroll mượt.
- CPU không spike liên tục khi scroll.

---

## 5) Query theo trang + filter từ SQLite, không load toàn bộ vào store
### Vấn đề
- Lấy full 2000 dòng → đẩy lên store → lọc ở client => tốn RAM + tốn CPU.
- Search/fuzzy càng nặng càng dễ lag.

### Yêu cầu thay đổi
- Thiết kế API repo kiểu:
  - `listSnapshot({ sessionId, q, limit, offset })`
  - `listWorkItems({ ... })`
  - `getItemHistory({ itemKey, limit, offset })`
- UI giữ state searchText + paging; data render theo trang.

### Acceptance criteria
- Search hoạt động mượt; không có đoạn code kiểu `const all = await repo.listAll(); const filtered = all.filter(...)`.

---

# Gợi ý phân công task (Dev checklist)
## Dev A — Import pipeline
- [ ] Refactor `resolve-import.tsx` để chỉ giữ progress/errors trong state
- [ ] Update `misaParser.ts` parse theo chunk + yield
- [ ] Thêm usecase `importSnapshot.ts` gọi parser + bulkUpsert + progress callback

## Dev B — SQLite hiệu năng
- [ ] Implement `bulkUpsertSnapshot` theo transaction + batch
- [ ] Add indexes theo schema (barcode/itemKey/sessionId/locationId)
- [ ] Đảm bảo không insert từng dòng

## Dev C — UI report/list
- [ ] Thay list lớn sang FlashList
- [ ] Memo hóa row component, dùng selector/shallow cho Zustand
- [ ] Paging/query trực tiếp từ SQLite

---

# KPI / Test nhanh để xác nhận
- **Import 2000 dòng**
  - UI không đơ cứng (có progress cập nhật)
  - Không crash
  - Có thể cancel (nếu implement cancel)
- **Report list**
  - Mở + scroll không crash
  - Search không lag nặng
- **DB integrity**
  - Import fail giữa chừng không để DB trạng thái “dở dang” (khuyến nghị thêm job/rollback ở bản sau)

---

# Ghi chú
- 2000 dòng không phải quá lớn; crash thường do:
  1) Parse + setState giữ mảng lớn  
  2) Insert từng dòng  
  3) Render list không virtualization/memo  
- Làm đúng 1→5 là thường đủ để “khóa” crash phổ biến.
