# SCREEN MAP - PM84/PM86 StockCount

## 1) Tong quan route

| Route | Man hinh | Muc dich |
|---|---|---|
| `/` | Tong quan | Quan ly file nguon, kho, phien, quick actions |
| `/inventory` | Kiem ke vi tri | KPI toan phien, vao quet theo vi tri, xuat file |
| `/locations` | Quan ly vi tri | Them/sua/xoa vi tri, thao tac nang cao theo mode |
| `/scan` | Quet kiem ke | Quet ma, luu nhap, quan ly draft, them ma moi |
| `/report/items` | Tong hop items | Cross-location, tim/loc/phan trang |
| `/report/[itemKey]` | Chi tiet item | Drill-down theo vi tri + ngoai le |
| `/resolve-import` | Xu ly xung dot import | Chon giu dong du lieu khi trung ma |
| `/settings` | Cai dat | Mode quet, mode van hanh, ngon ngu UI |

## 2) Dieu huong chinh

### 2.1 Tu Home (`/`)
- `Tiep tuc phien` -> `/inventory`
- `Bat dau phien` -> tao session -> `/inventory`
- `Nap du lieu MISA` (basic) -> cap nhat snapshot, o lai `/`
- `Khoi tao du an` (advanced) -> wizard -> tao session -> `/inventory`
- `Nap goi vi tri` (advanced) -> import package -> mo session moi -> `/inventory`
- `Doi file nguon` -> modal file manager
- `Chon phien` -> modal lich su phien -> `/inventory`
- Header `Cai dat` -> `/settings`

### 2.2 Tu Kiem ke vi tri (`/inventory`)
- Chon row vi tri -> set `currentLocationId` -> `/scan`
- Quet QR vi tri -> vao/tao vi tri -> `/scan`
- `Quan ly vi tri` -> `/locations`
- `Xem items` -> `/report/items`
- `Xuat file` -> modal xuat CSV/XLSX (stay current screen)
- Header `Trang chu` -> `router.replace('/')`
- Header `Cai dat` -> `/settings`

### 2.3 Tu Quan ly vi tri (`/locations`)
- Chon vi tri -> set `currentLocationId` -> `/scan`
- Header `Trang chu` -> `router.replace('/')`
- Modal them/sua/xoa vi tri (tai cho)
- Advanced actions:
  - Nap danh muc vi tri-SKU (tai cho)
  - Nap file nop vi tri (tai cho)
  - Xuat goi kiem ke vi tri (share file)
  - Xuat file nop vi tri (share file)

### 2.4 Tu Quet (`/scan`)
- Header `Ket thuc` -> confirm -> `router.replace('/inventory')`
- Khong co context session/location -> show fallback -> `router.replace('/inventory')`
- Draft sheet thao tac tai cho

### 2.5 Tu Bao cao (`/report/items`)
- Bam item -> `/report/[itemKey]`
- Filter/search/page tai cho

### 2.6 Tu Chi tiet item (`/report/[itemKey]`)
- Bam row vi tri -> set `currentLocationId` -> `router.replace('/scan')`
- Header `Home` -> `/`

### 2.7 Tu Resolve Import (`/resolve-import`)
- Hoan tat conflict -> import lai thanh cong -> `/`
- Back -> quay lai man truoc

## 3) Modal va sheet quan trong

| Man hinh | Modal/Sheet | Muc dich |
|---|---|---|
| Home | File Manager modal | Chon/sua ten/xoa snapshot |
| Home | Init Wizard modal | Khoi tao du an (advanced) |
| Home | Session History modal | Chon/xoa phien theo page |
| Inventory | Export sheet | Chon XLSX/CSV |
| Locations | ConfirmSheet | Xac nhan xoa vi tri/phien |
| Scan | DraftListSheet | Quan ly nhap chua luu |
| Scan | Exception modal | Ghi nhan ngoai le chat luong |

## 4) Trang thai store lien quan dieu huong
- `currentSnapshotId`
- `currentWarehouse`
- `currentSessionId`
- `currentLocationId`
- `scanMode`: `WEDGE | CAMERA | QUICK`
- `operationMode`: `BASIC | ADVANCED`
- `uiLanguage`: `vi | lo | system`

## 5) Cac diem can QA navigation
1. Chuyen Home <-> Inventory dung `replace` cho cac nut home/chot thao tac, tranh phong stack.
2. Quet xong bam ket thuc phai ve dung session dang mo.
3. Tu report detail nhay vao scan phai set dung `currentLocationId`.
4. Dang o mode basic khong duoc hien action advanced.

