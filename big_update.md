# BIG UPDATE PLAN - PM86 StockCount Expo

Cap nhat: 2026-01-27

Muc tieu: On dinh app khi demo Expo, sua loi cap nhat vi tri, cai thien dieu huong va luong quet kiem ke de su dung ro rang, khong bi lac huong sau khi luu.

---

## 0) Tong quan hien trang (doc tu code + bao cao tu nguoi dung)

### Bao cao loi/van de dang gap
- Crash khi demo tren Expo (mobile), chu yeu tai luong tao phien + quet ma.
- Tao phien kiem ke: mot so vi tri khong cap nhat tren man hinh danh sach vi tri.
- Man quet: sau khi tim kiem + cap nhat xong khong ro di chuyen dau. Nhu cau moi: o lai Scan de quet lien tuc, co nut "Ket thuc" ro rang.
- Dieu huong chua tot, can kiem tra va cai tien (back stack, luong vao/ra Scan, Item Detail, Inventory).

### Loi typecheck hien tai (tu 2026-01-27)
- app/inventory.tsx: Badge type 'default'/'info' khong hop le.
- app/report/[itemKey].tsx: QUALITY_LABEL_VI index voi key any.
- app/report/items.tsx: ListEmptyComponent nhan false.
- app/scan.tsx: RefObject<TextInput | null> khong hop le.
- src/tests/resolveInput.test.ts: test su dung API cu.

---

## 1) Giai doan A - On dinh + Crash/Freeze

### A1. Thu thap thong tin crash
- Bat log Expo (metro) + log device (adb logcat) trong luc demo.
- Them ErrorBoundary toan app (Expo Router) de bat loi UI.
- Bat log khi vao/ra man quan trong: Home, Inventory, Scan, Report.
STATUS: DONE (them ErrorBoundary, log, log store)

### A2. Fix nhanh crash co the xay ra
- Guard null cho snapshotId/warehouseName/sessionId/locationId o cac screen.
- Neu data load that bai: hien thong bao, khong crash.
- Doi luong import/scan/hieu nang de khong freeze UI.
STATUS: DONE (guard + log + giam resolve racing)

### A3. Xac nhan
- Reproduce crash truc tiep tren Expo Go.
- Crash rate = 0 trong 3 lan demo (import -> tao phien -> scan -> report).
STATUS: PENDING (can test tren thiet bi)

---

## 2) Giai doan B - Cap nhat vi tri (Location) sau tao phien

### B1. Rà soat data flow
- Kiem tra repos.session.createSession() co tu tao location mac dinh hay khong.
- Dam bao Inventory screen load lai list location sau khi tao phien.
STATUS: DONE

### B2. Sua logic refresh
- Dam bao loadData() duoc goi sau khi createSession hoac sau khi quet tao location.
- Xem lai useFocusEffect + useEffect de tranh stale state/loop.
STATUS: DONE

### B3. Xac nhan
- Tao phien moi -> danh sach co it nhat 1 location mac dinh.
- Tao location moi (scan QR) -> list cap nhat ngay.
STATUS: PENDING (can test tren thiet bi)

---

## 3) Giai doan C - Cai thien luong quet (Scan UX)

### C1. Luong vao/ra Scan ro rang
- Nut goc phai quay lai danh sach vi tri (Inventory) hoat dong on dinh.
- Sau khi luu (Save) o lai Scan, auto focus input de quet tiep.
- Them nut "Ket thuc" de ket thuc phien/thoat khoi Scan (chi ro).
STATUS: DONE

### C2. Tim kiem/Go y
- Kiem tra resolveInputToItem luong search + suggest.
- Khi da chon item -> luu -> tra ve trang thai san sang quet tiep (xoa selection + focus input).
STATUS: DONE

### C3. Danh dau vi tri hien tai
- Hien thi ten ma vi tri dang kiem ke ro rang.
STATUS: DONE

### C4. Xac nhan
- Demo: quet 10 ma lien tiep, luu xong co the tiep tuc quet ma khac trong 1 cham, khong tu dong roi khoi Scan.
- Back ve Inventory khong mat context session.
STATUS: PENDING (can test tren thiet bi)

---

## 4) Giai doan D - Dieu huong & Back stack

### D1. Rà soat router
- Kiem tra router.replace vs router.push cho cac man quan trong (Inventory, Scan, Report, Item Detail).
- Dung pattern: Home -> Inventory -> Scan. Back tu Scan ve Inventory (khong ve Home neu chua muon).
STATUS: DONE (dieu huong vao Scan dung push)

### D2. Dieu huong tu Report -> Item Detail -> Quay lai Report
- Giữ trạng thái search/filter khi quay lai.
STATUS: DONE (state giu, pagination)

### D3. Xac nhan
- Di qua cac man: Home -> Inventory -> Scan -> Report -> Item Detail -> Back -> Report -> Back -> Inventory.
STATUS: PENDING (can test tren thiet bi)

---

## 5) Giai doan E - Do on dinh + Typecheck

### E1. Fix toan bo TypeScript errors
- Sua Badge type.
- Type cho exceptions (CountException).
- Fix ListEmptyComponent.
- Fix qtyInputRef type.
- Update tests resolveInput.
STATUS: DONE

### E2. Test nhanh
- npm run typecheck
- npm run lint (neu can)
STATUS: DONE (typecheck)

---

## 6) Giai doan F - Cải thiện hieu nang (neu can)

- Tam hoan neu crash con chua on dinh.
- Toi uu query SQLite: pagination, index, bat query caching.
STATUS: DONE (pagination sessions + report; export stats for counted)

---

## Can thong tin tu nguoi dung

1) Crash xay ra trong buoc tao phien hay quet? (neu co log/anh chup man hinh xin gui)
2) Vi tri khong cap nhat: xay ra sau tao phien hay sau quet QR vi tri?

---

## De xuat thu tu thuc hien

1) On dinh crash + fix typecheck (A + E)
2) Fix refresh location (B)
3) Cai thien luong Scan + dieu huong (C + D)

---

Neu dong y, minh se bat dau voi Giai doan A + E de on dinh truoc, sau do qua B/C/D.
