# TROUBLESHOOTING - Loi thuong gap va cach xu ly

## 1) Khong nap duoc file MISA
### Dau hieu
- Bao loi khong tim thay sheet MISA hop le.

### Nguyen nhan thuong gap
- File khong phai layout MISA thuc te.
- Nap nham file goi vi tri/file nop vi tri.
- CSV loi ma hoa.

### Tu kiem tra nhanh
1. Mo file va kiem tra co cot `Mã hàng`, `Tên hàng`, `ĐVT/Đơn vị tính`, `Cuối kỳ`.
2. Neu la goi vi tri: file co sheet `THONG_TIN_GOI`.
3. Neu la file nop: co sheet `NOP_VI_TRI_KIEM_KE`.

### Cach khac phuc
1. Dung file `.xlsx` tai truc tiep tu MISA (`Check_item.xlsx`).
2. Nap dung noi:
   - Nap nguon o Trang chu.
   - Nap file nop o Quan ly vi tri.
   - Nap goi vi tri o Trang chu (advanced).

## 2) Camera khong quet duoc
### Dau hieu
- Khung camera mo nhung khong nhan ma.

### Nguyen nhan
- Chua cap quyen camera.
- Ma vuot khoi khung.
- Quet qua nhanh trong thoi gian cooldown.

### Khac phuc
1. Vao cai dat he dieu hanh cap quyen Camera.
2. Dua ma vao khung scan va giu on dinh.
3. Cho ~1.5 giay giua 2 lan quet camera.

## 3) Quet ma khong tim thay san pham
### Dau hieu
- Toast/alert thong bao khong tim thay.

### Nguyen nhan
- Ma khong ton tai trong snapshot hien tai.
- Dang o nham kho/nham phien.

### Khac phuc
1. Kiem tra dang dung kho va phien dung.
2. Neu la ma moi thuc te, dung nut `Them moi`.
3. Neu la ma da co, kiem tra barcode alias hoac format ma.

## 4) Da luu nhung trang thai vi tri chua len dung
### Dau hieu
- Da luu item nhung progress vi tri chua dung ky vong.

### Nguyen nhan
- Vi tri co scope ky vong va item vua dem la `Ngoài danh mục`.
- Chi so done tinh theo `countedLinesInScope`.

### Khac phuc
1. Kiem tra cot `Ngoài danh mục`.
2. Voi basic mode, dam bao vi tri moi da duoc tao scope all-SKU.
3. Voi advanced mode, kiem tra danh muc vi tri-SKU da nap dung.

## 5) Khong xuat duoc CSV/XLSX
### Dau hieu
- Bao loi khong co du lieu xuat hoac khong share duoc file.

### Nguyen nhan
- Session chua co data count.
- Thiet bi khong ho tro hoac bi chan share.

### Khac phuc
1. Kiem tra da luu it nhat 1 item.
2. Thu xuat lai sau khi refresh.
3. Kiem tra app share tren thiet bi (Zalo/Drive/Email).

## 6) App bi thoat (crash) khi thao tac nhanh
### Dau hieu
- Vang ve launcher/Expo ngay khi dang thao tac.

### Nguyen nhan co the
- Thiet bi thieu RAM.
- Quet lien tuc, giao dien tai danh sach lon.
- Loi runtime khong duoc bat.

### Khac phuc
1. Giam toc do thao tac, luu tung dot ngan.
2. Dong app nen khac de giai phong RAM.
3. Dung development build de lay log JS chi tiet.
4. Kiem tra lai danh sach long list co warning nested list.

## 7) Cai APK bi treo 100%
### Dau hieu
- Download den 100% nhung khong cai.

### Nguyen nhan
- Thiet bi khong dung min version Android.
- Chinh sach MDM chan cai app la.
- File APK tai hu.

### Khac phuc
1. Kiem tra version Android (yeu cau Android 11+ do minSdk 30).
2. Tai lai APK bang mang on dinh.
3. Cai qua PC/ADB neu can.
4. Xin mo policy cai dat tu bo phan IT/MDM.

## 8) Nguoi dung nap nham loai file
### Rule chan sai
- Nguon MISA: chan file goi/file nop.
- Scope file: chan file nop/goi.
- Submission file: chi nhan sheet `NOP_VI_TRI_KIEM_KE`.

### Xu ly
- Theo thong bao tren app de nap dung man hinh.

## 9) Khi nao can goi ky thuat
- Lap lai loi crash voi cung thao tac >= 3 lan.
- Loi DB (khong tao duoc session/snapshot).
- Import file dung format nhung van fail.
- Xuat file rong du da co du lieu kiem.

