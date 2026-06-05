# UI_Redesign_NNC_StockCount.md
> Tài liệu đề xuất thiết kế lại giao diện (Mobile) cho **NNC StockCount / PM86**  
> Mục tiêu: **đẹp – dễ dùng – đúng brand NNC – thao tác nhanh trong kho** (1 tay / WEDGE / Enter)

---

## 1) Vấn đề hiện tại (từ màn bạn gửi)
1. **Mảng nền xanh đậm quá lớn** → nặng mắt, làm chìm thông tin quan trọng (trạng thái đã kiểm / lệch).
2. **CTA chưa rõ “1 việc chính”**: Quét là thao tác chính nhưng đang ngang hàng với các mục khác.
3. **Cross-Location list** chưa “đập vào mắt” trạng thái: item đã kiểm/ lệch/ chưa kiểm chưa nổi bật.
4. **Màn quét** thiếu **context** (Location hiện tại / mode quét), thiếu thao tác nhanh (recent / manual input), dễ scan lặp.

---

## 2) Nguyên tắc thiết kế (chuẩn kho / chuẩn PM86)
### 2.1 “Green để dẫn hướng, Neutral để đọc dữ liệu”
- Primary Green (brand) dùng cho **CTA, icon, chip**, không phủ toàn màn.
- Nền & danh sách nên **trắng / neutral** để đọc số liệu lâu không mỏi.
- Accent Yellow chỉ làm **điểm nhấn** (progress, scan line, warning nhẹ).

### 2.2 Ưu tiên dữ liệu dạng “kho nhìn phát hiểu ngay”
- Card item: **trái = định danh**, **phải = số**.
- Trạng thái phải hiện ngay: **Chưa kiểm / Đã kiểm / Lệch / Cần kiểm lại**.
- Tap target >= 48dp, spacing thoáng, dùng được với găng tay / tay ướt.

---

## 3) NNC Design System (tokens gợi ý)
> Dev có thể đưa vào `ui.tsx` để đồng bộ toàn app.

### 3.1 Colors (đề xuất)
- `brandGreen`: màu chủ đạo (theo logo NNC)
- `deepGreen`: dùng cho badge/heading
- `accentYellow`: dùng cho scan line/progress warning
- `bg`: #F7F9F8 (nền sáng)
- `card`: #FFFFFF
- `border`: #E6EEE9
- `text`: #0E1A14
- `muted`: #6C7A73
- `danger`: #D64545 (lệch lớn / cảnh báo)

> Lưu ý: dùng đúng màu logo hiện có để giữ brand; các mã hex trên chỉ là placeholder.

### 3.2 Typography
- Title: 18–20 (semibold)
- Section: 16–18
- Body: 14–16
- Code/Meta (mã hàng, location_code): 12–13 (muted)

### 3.3 Radius / Shadow
- Radius: 14–18 (card), 999 (chip)
- Shadow: nhẹ, không đậm (để không “app tài chính”)

### 3.4 Component chuẩn
- `ChipStatus`: Chưa kiểm / Đã kiểm / Lệch / Cần kiểm lại
- `KpiChip`: Tổng / Đã kiểm / Còn lại / Lệch
- `PrimaryCTA`: nút chính (Quét)
- `ListCard`: card item 2 cột (trái định danh – phải số)

---

## 4) IA (Information Architecture) — cấu trúc màn
1. **Trung tâm kiểm kê (Home)**  
2. **Quét (Scan)**
   - Quét Location (QR vị trí)
   - Quét SKU (sau khi đã set Location)
3. **Quản lý vị trí (Location list + tạo/sửa/in QR)**
4. **Xem Items (Cross-Location)**
5. **Xuất file (CSV / XLSX nội bộ)**

---

## 5) Thiết kế lại từng màn (wireframe logic)

### 5.1 Home — “Trung tâm kiểm kê”
**Mục tiêu:** 1 chạm vào quét, nhìn tiến độ nhanh.

**Header (gọn):**
- Logo nhỏ + tiêu đề
- Chip: `Kho: Vientiane SPM`
- Icon: Settings (⚙️), Home (🏠) nếu cần

**KPI (nhẹ):**
- Progress bar + 3 KpiChip:
  - Tổng mã
  - Đã kiểm
  - Còn lại
- Nền sáng, viền xanh, không dùng block xanh đặc.

**Quick Actions (grid 2×2):**
- Quét (Primary)
- Xem Items
- Quản lý vị trí
- Xuất file

**Brand accent:**
- Watermark pattern logo/đồi núi **rất mờ** (5–8% opacity) trong card KPI.

---

### 5.2 Quản lý vị trí
**Mục tiêu:** quản lý location nhanh + thấy progress theo location.

**Phần “Hướng dẫn QR vị trí”:**
- Đổi sang dạng **collapsible** (mặc định thu gọn).

**Location card:**
- Trái: icon location + tên + code (muted)
- Phải: ChipStatus (Chưa kiểm/Đang kiểm/Xong)
- Dưới: progress mini-bar “x / y mã”
- Actions: Edit / Delete / (NEW) “In QR” hoặc “Copy QR text”

---

### 5.3 Cross-Location — “Tổng hợp Items”
**Mục tiêu:** biết ngay item nào chưa kiểm / lệch / đã kiểm.

**Header sticky 2 tầng:**
1) Search (full width)  
2) Filter chips: `Chưa kiểm` `Lệch` `Đã kiểm` `Cần kiểm lại` + icon “Tải lại”

**KPI gọn (chips):**
- Tổng mã / Đã kiểm / Lệch

**Item card (2 cột):**
- **Trái:** Tên hàng (title) + mã (muted) + ĐVT (chip nhỏ)
- **Trạng thái:** ChipStatus (Chưa kiểm / Đã kiểm / Lệch)
- **Phải:** 3 dòng số rõ:
  - Thực tế
  - Sổ sách
  - Chênh
- Nếu `Chưa kiểm`: Thực tế = “—” nhưng ChipStatus vẫn nổi.
- Nếu `Lệch`: Chênh tô đậm + chấm màu (warning/danger theo ngưỡng).

**Pagination:**
- Nếu ít item: bỏ pagination
- Nếu cần: ưu tiên “Load more” thay vì Trang trước/Trang sau (đỡ rối).

---

## 6) Thiết kế riêng cho Màn Quét (Scan) — phần quan trọng nhất
### 6.1 Mục tiêu UX
- Không nhầm mode (Location vs SKU)
- Không nhầm location hiện tại
- Không scan lặp
- Có thao tác nhanh & manual fallback

### 6.2 Layout đề xuất
**Top overlay (context bar):**
- Chip `Location hiện tại: WH_KHO_VIENTIANE_SPM`
- Chip `Mode: Quét vị trí` / `Mode: Quét SKU`
- Icon: Flash, Close (X)

**Scan frame:**
- 4 góc sáng + mask tối nhẹ xung quanh (tập trung vào khung)
- Scan line vàng mảnh (accentYellow)

**Bottom sheet (30–35% màn):**
- Hướng dẫn 1 câu: “Đưa mã vào khung”
- Manual input (paste code) + nút “Xác nhận”
- Recent locations (3–5) → 1 chạm set location
- Toggle: âm báo / rung / autofocus

### 6.3 Anti double-scan / stability
- Sau khi scan thành công: **pause 800–1200ms**
- Haptic + beep nhẹ
- Toast: “Đã chọn location: KHO_01” hoặc “Đã nhận SKU…”
- Nếu scan cùng 1 code trong 1s: ignore

### 6.4 Microcopy (ngắn, kho hiểu liền)
- Mode Location: “Quét QR vị trí (VD: LOC:KHO_01)”
- Mode SKU: “Quét mã hàng / barcode”
- Toast: “Đã set vị trí”, “Đã lưu số lượng”, “Mã không hợp lệ”

---

## 7) Quick wins (làm ngay trong sprint)
1. **Giảm block xanh đậm**: KPI chuyển sang chip/card nền sáng.
2. **ChipStatus phải hiện ở mọi list**: chưa kiểm/đã kiểm/lệch.
3. **CTA Quét** nổi bật nhất (Primary).
4. **Scan overlay có location + mode**.
5. **Chống scan lặp + toast confirm**.

---

## 8) Acceptance Criteria (để test)
- Nhìn Cross-Location: phân biệt ngay 4 trạng thái (chưa kiểm/đã kiểm/lệch/cần kiểm lại).
- Quét Location: set thành công, hiển thị chip location rõ ràng.
- Quét không bị lặp liên tục; có toast confirm.
- Người mới dùng 2 phút vẫn hiểu “bước 1: quét location, bước 2: quét SKU”.

---

## 9) Gợi ý implementation (React Native / Expo)
- Dùng `SafeAreaView` + `StatusBar` đồng bộ màu.
- List: ưu tiên `FlashList` nếu data lớn.
- Chip & card: đưa vào `components/ui/` để reuse.
- Scan: quản lý state “mode” + “currentLocation” ở store (zustand/redux) để tránh mất khi back/replace.

---

## 10) Next step (để dev làm nhanh)
1) Chốt token màu theo logo NNC (lấy 1–2 mã green chuẩn).
2) Refactor UI components: `ChipStatus`, `KpiChip`, `ItemCard`.
3) Apply lại 3 màn: Home / Cross-Location / Scan.
4) Test thực địa: ánh sáng kho + scan lặp + thao tác 1 tay.

