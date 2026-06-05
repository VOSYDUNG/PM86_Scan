# DATA RULES - Quy tac du lieu kiem ke

## 1) Dinh nghia du lieu cot loi

## 1.1 Nguon du lieu
- `snapshot`: bo du lieu ton kho da nap tu file MISA.
- `snapshot_rows`: danh sach ma hang cua 1 snapshot theo kho.

## 1.2 Don vi van hanh
- `session`: 1 phien kiem ke tren 1 snapshot + 1 kho.
- `location`: vi tri kiem ke (kho, ke, khu, xe).
- `location_counts`: trang thai/progress cua tung vi tri trong phien.
- `location_scope_items`: danh muc ma hang ky vong cua vi tri (nang cao).
- `count_lines`: ket qua kiem theo `sessionId + locationId + itemKey`.

## 2) Cong thuc tinh quan trong

## 2.1 Tren 1 dong kiem (`count_lines`)
- `countTotal`: tong dem tai vi tri.
- `countUsable`: so luong dat (da tru ngoai le).
- `exceptions`: JSON ngoai le chat luong.
- `isOutOfScope`:
  - `0`: nam trong danh muc vi tri-SKU (hoac vi tri chua map nhung khong danh dau ngoai scope).
  - `1`: quet dung ma ton tai snapshot nhung ngoai danh muc vi tri.

## 2.2 Chenh lech
- `diff = countUsable - onHandQty`
  - `0`: khop.
  - `>0`: lech duong.
  - `<0`: lech am.

## 2.3 Trang thai vi tri
Status vi tri duoc recalc tu DB:
- `PENDING`: chua co dong dem.
- `IN_PROGRESS`: da co dem nhung chua dat muc ky vong.
- `DONE`: `expectedLines > 0` va `countedLinesInScope >= expectedLines`.

## 2.4 Progress vi tri
- `expectedLines`: so SKU ky vong trong `location_scope_items`.
- `countedLines`: so SKU da dem (tat ca).
- `countedLinesInScope`: so SKU da dem co `isOutOfScope = 0`.
- `uncountedLines = max(expectedLines - countedLinesInScope, 0)`.
- `outOfScopeCount`: so dong dem ngoai danh muc.

## 3) Quy tac import file nguon MISA

## 3.1 Kieu file
- Ho tro `.xlsx/.xls` (khuyen nghi) va `csv`.
- Parser tim sheet MISA hop le theo layout thuc te (`STT`, `Mã hàng`, `Tên hàng`, `ĐVT/Đơn vị tính`, `Cuối kỳ`).

## 3.2 Rule parser
- Bo qua dong sub-header (`Số lượng`) neu co.
- Bo qua dong tong cong/aggregate.
- Lay `warehouseName` tu metadata dong dau (`Kho: ...`), fallback `Kho mặc định`.
- Neu file nham loai (goi vi tri, file nop, scope file) thi chan va thong bao dung noi nap.

## 3.3 Conflict khi import
- Trung `warehouse + itemCode` nhung khac `itemName`:
  - Chuyen qua `/resolve-import`.
  - User chon giu row cu/row moi hoac sua ma.

## 4) Quy tac vi tri-SKU (nang cao)

## 4.1 Import danh muc vi tri-SKU
- Bat buoc co cot: `Mã vị trí`, `Mã hàng`.
- Validate:
  - SKU phai ton tai trong snapshot hien hanh.
  - Metadata (neu co): kho/snapshot/sourceFileName/snapshotDate phai khop.
- Duplicate `(session,location,itemKey)` bo qua.

## 4.2 Basic mode
- Them vi tri moi se auto map toan bo SKU nguon vao vi tri do (all-SKU scope).

## 5) Quy tac trao doi offline kho tong - kho nho (advanced)

## 5.1 Goi vi tri
- Xuat: `GOI_KIEM_KE_<MaKyDuLieu>_<MaViTri>.xlsx`.
- Sheet:
  - `THONG_TIN_GOI`
  - `DANH_SACH_KIEM_KE_VI_TRI`
  - `HUONG_DAN`

## 5.2 File nop vi tri
- Xuat: `NOP_VI_TRI_<MaKyDuLieu>_<MaViTri>.xlsx`.
- Sheet: `NOP_VI_TRI_KIEM_KE`.
- Rule import:
  - 1 file = 1 vi tri.
  - Khong cho trung ma trong cung file.
  - Vi tri da co du lieu kiem se bi chan nap tiep.
  - `Mã kỳ dữ liệu` va `Mã snapshot nguồn` phai khop phien dang mo.

## 6) Quy tac scan va luu
- WEDGE/CAMERA:
  - Mac dinh logic cong don.
  - Co nhap draft theo tung ma.
- QUICK:
  - Ho tro tim/chon item va set/acummulate theo UI.
- Luu tao/cap nhat `count_lines`, sau do recalc progress vi tri.

## 7) Quy tac bao toan du lieu
- Du lieu nghiep vu chinh luu local SQLite (`pm86_stockcount.db`).
- `pendingImport` va progress import khong persist.
- Doi `operationMode`, `scanMode`, `uiLanguage` khong xoa du lieu kiem ke.

