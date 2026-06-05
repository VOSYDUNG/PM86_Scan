# EXPORT SPEC - CSV/XLSX va file trao doi vi tri

## 1) Tong quan
- App ho tro xuat 2 loai bao cao chinh:
  - CSV (`exportMisaCsv`)
  - XLSX (`exportMisaExcel`)
- Du lieu xuat duoc build tu `buildStockCountExportTables`.

## 2) File bao cao chinh

## 2.1 CSV
- Ten file: `kiemke_<Warehouse>_<timestamp>.csv`
- Noi tao file: `FileSystem.cacheDirectory`
- Encoding: UTF-8 BOM.
- Delimiter: `,`
- Newline: `\r\n`
- Share qua OS share sheet.

Cot xuat (tu bang `summary`):
1. `Kho`
2. `Mã hàng`
3. `Tên hàng`
4. `ĐVT`
5. `Tồn hệ thống`
6. `Tổng đếm`
7. `Đếm OK`
8. `Lỗi hết hạn`
9. `Lỗi hư hỏng`
10. `Lỗi sai mã`
11. `Lỗi sai quy cách`
12. `Lỗi phẩm chất`
13. `Lỗi khác`
14. `Hàng lỗi`
15. `Ngoài danh mục`
16. `Chênh lệch`
17. `Trạng thái`
18. `Nguyên nhân vận hành (gợi ý)`

## 2.2 XLSX
- Ten file: `KiemKe_<Warehouse>_<timestamp>.xlsx`
- Noi tao file: `FileSystem.documentDirectory`
- Sheets:
  - `TongHop`
  - `ChiTiet`
- Co auto width cot.
- Share qua OS share sheet.

### Sheet `TongHop`
- Cot giong CSV summary (18 cot o tren).

### Sheet `ChiTiet`
1. `Kho`
2. `Vị trí`
3. `Loại vị trí`
4. `Mã hàng`
5. `Tên hàng`
6. `ĐVT`
7. `Tồn hệ thống`
8. `Tổng đếm`
9. `Đếm OK`
10. `Lỗi hết hạn`
11. `Lỗi hư hỏng`
12. `Lỗi sai mã`
13. `Lỗi sai quy cách`
14. `Lỗi phẩm chất`
15. `Lỗi khác`
16. `Hàng lỗi`
17. `Ngoài danh mục`
18. `Nguyên nhân vận hành (gợi ý)`
19. `Cập nhật`

## 3) Quy tac tinh trong xuat
- `Hàng lỗi`: tong qty trong `exceptions`.
- `Đếm OK`: `countUsable`.
- `Chênh lệch`: `Đếm OK - Tồn hệ thống`.
- `Trạng thái`:
  - `Chưa kiểm` neu chua co `totalUsable`.
  - `Khớp` neu diff = 0.
  - `Lệch` neu diff != 0.
- `Nguyên nhân vận hành (gợi ý)`:
  - Sinh tu `deriveVarianceReason(diff, outOfScopeCount)`.

## 4) File trao doi vi tri (advanced workflow)

## 4.1 Goi vi tri xuat cho kho nho
- Ten file: `GOI_KIEM_KE_<MaKyDuLieu>_<MaViTri>.xlsx`
- Sheets:
  - `THONG_TIN_GOI`
  - `DANH_SACH_KIEM_KE_VI_TRI`
  - `HUONG_DAN`

## 4.2 File nop vi tri xuat tu kho nho
- Ten file: `NOP_VI_TRI_<MaKyDuLieu>_<MaViTri>.xlsx`
- Sheet:
  - `NOP_VI_TRI_KIEM_KE`

Cot chinh:
1. `Mã kỳ dữ liệu`
2. `Mã snapshot nguồn`
3. `Tên file nguồn`
4. `Tên kho`
5. `Mã vị trí`
6. `Tên vị trí`
7. `Ngày chốt dữ liệu`
8. `Mã hàng`
9. `Số lượng đếm`
10. `Số lượng đạt`
11. `Ngoài danh mục`
12. `Thời điểm cập nhật`

## 5) Dieu kien xuat that bai
- Khong co du lieu de xuat.
- Thiet bi khong ho tro share.
- Loi ghi file local.

## 6) Kiem tra nhanh truoc khi gui file
1. Ten kho dung.
2. So dong co du (khong rong bat thuong).
3. Chenh lech co logic voi tinh hinh kiem thuc te.
4. Mo duoc file tren may nhan.

