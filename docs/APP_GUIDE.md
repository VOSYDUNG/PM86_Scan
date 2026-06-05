# PM84/PM86 StockCount - Huong Dan Van Hanh

## 1) Tong quan 1 phut
- Muc tieu: kiem ke ton kho offline theo luong `Kho -> Vi tri -> Ma hang -> Bao cao -> Xuat file`.
- Dau vao chinh: file MISA thuc te (`Check_item.xlsx` hoac CSV tuong duong).
- Dau ra chinh:
  - Bao cao tong hop/chi tiet tren app.
  - File xuat CSV/XLSX noi bo de doi soat va nap lai quy trinh ke toan.
  - (Nang cao) goi vi tri va file nop vi tri de hop nhat tu kho nho.

## 2) Cai dat tren PM84/PM86 va Android
1. Cai APK noi bo.
2. Cap quyen Camera khi app yeu cau.
3. Cho phep truy cap file de doc/ghi xuat file.
4. Neu thiet bi bi treo tai 100% khi cai APK:
   - Kiem tra bo nho trong.
   - Tai lai APK qua mang on dinh.
   - Cai qua PC (ADB) neu thiet bi bi chan boi chinh sach quan tri.

Luu y quan trong:
- `app.json` dang dat `minSdkVersion = 30`, can Android 11+.

## 3) Hai che do van hanh

### Che do Co ban (mac dinh)
- Dung cho 1 may van hanh nhanh.
- Luong:
  1. Nap du lieu MISA.
  2. Chon kho, tao/vao phien.
  3. Them vi tri (dat ten, ma vi tri tu sinh).
  4. Quet va luu.
  5. Xem tong hop, xuat bao cao.

### Che do Nang cao
- Dung cho mo hinh kho tong + kho nho.
- Co them:
  - Khoi tao du an.
  - Nap goi vi tri.
  - Gan ma hang theo vi tri.
  - Xuat goi vi tri, nap file nop vi tri.

## 4) Huong dan theo man hinh

## 4.1 Trang tong quan (`/`)
Muc dich:
- Quan ly file nguon.
- Chon kho dang lam viec.
- Mo nhanh cac chuc nang chinh.

Khi nao dung:
- Bat dau 1 ky kiem ke moi.
- Mo lai phien dang lam.
- Chuyen file nguon.

Cac thao tac chinh:
1. `Chuc nang nhanh`:
   - `Tiep tuc phien`
   - `Bat dau phien`
   - `Nap du lieu MISA` (Co ban) hoac `Khoi tao du an` (Nang cao)
   - `Nap goi vi tri` (Nang cao)
   - `Doi file nguon`
2. `Du lieu nguon`:
   - Xem file dang hoat dong.
   - Tai tep mau.
3. `Kho hang`:
   - Chon kho trong danh sach tu snapshot.
4. `Lich su phien`:
   - Mo modal lich su.
   - Chon phien de tiep tuc.
   - Xoa phien (co xac nhan).

Ket qua mong doi:
- Co `snapshotId`, `warehouse`, `session` hop le truoc khi vao kiem ke.

CHECKLIST CHUP ANH:
- [HINH-01] Trang tong quan day du card.
- [HINH-02] Modal lich su phien + phan trang.
- [HINH-03] Modal quan ly file nguon.

## 4.2 Man hinh kiem ke vi tri (`/inventory`)
Muc dich:
- Theo doi KPI toan phien.
- Vao man quet theo tung vi tri.
- Xuat bao cao CSV/XLSX.

Khi nao dung:
- Sau khi tao hoac mo phien.

Cac thao tac chinh:
1. Xem KPI:
   - Tong ma.
   - Da kiem.
   - Con lai.
   - Ngoai danh muc (neu co).
2. Quet QR vi tri (camera variant location):
   - Quet ma vi tri de vao nhanh.
   - Co the tu tao vi tri neu ma moi.
3. Chon vi tri tu danh sach de vao man quet.
4. Mo `Quan ly vi tri`.
5. Mo `Xem items` (tong hop).
6. `Xuat Excel` hoac `Xuat CSV`.

Ket qua mong doi:
- KPI cap nhat theo du lieu `count_lines`.
- Vao dung man quet voi `currentLocationId`.

CHECKLIST CHUP ANH:
- [HINH-04] KPI trung tam kiem ke.
- [HINH-05] Danh sach vi tri.
- [HINH-06] Sheet chon xuat CSV/XLSX.

## 4.3 Quan ly vi tri (`/locations`)
Muc dich:
- Quan ly cau truc vi tri trong phien.
- Van hanh bo sung theo mode.

Cac thao tac chung:
1. Them vi tri (ten + ma tu sinh theo ten, co kiem tra trung ma).
2. Sua ten vi tri.
3. Xoa vi tri khoi phien.
4. Vao quet tai vi tri da chon.

Che do Co ban:
- Tu dong scope all-SKU cho vi tri moi (lay tu file nguon).
- An cac thao tac trao doi file nang cao.

Che do Nang cao:
- `Gan ma hang theo vi tri` (nap danh muc vi tri-SKU).
- `Nap file nop vi tri`.
- `Xuat goi kiem ke vi tri`.
- `Xuat file nop vi tri`.

Luu y giao dien:
- Bang dieu phoi van hanh hien thi luc vao man va tu thu gon sau ~5 giay.

CHECKLIST CHUP ANH:
- [HINH-07] Card vi tri co thanh do phu va trang thai.
- [HINH-08] Bang dieu phoi van hanh (mo va thu gon).
- [HINH-09] Modal them/sua vi tri.

## 4.4 Quet kiem ke (`/scan`)
Muc dich:
- Quet ma, tao nhap, luu ket qua kiem theo vi tri.

Cac mode quet:
- `WEDGE`: nhan du lieu tu may quet PM84/PM86.
- `CAMERA`: quet camera.
- `QUICK`: tim nhanh/chon item.

Luonh thao tac scan:
1. Quet ma.
2. App resolve ma:
   - Trung ma: tang nhap.
   - Ma moi: chuyen item/hoac goi y.
   - Khong tim thay: canh bao va cho phep `Them moi`.
3. Sua so luong nhap neu can.
4. Bam `Luu`.
5. Co the mo `Nhap chua luu` de:
   - Chon lai.
   - Luu tung dong.
   - Luu tat ca.

Luu y:
- Co canh bao khi roi man ma con nhap chua luu.
- Co am thanh tick khi quet thanh cong.
- Camera co cooldown de tranh quet trung lien tuc.

CHECKLIST CHUP ANH:
- [HINH-10] Man quet barcode voi khung camera.
- [HINH-11] Card item + so luong + ngoai le.
- [HINH-12] DraftListSheet.
- [HINH-13] Canh bao khong tim thay ma + them moi.

## 4.5 Giai quyet xung dot import (`/resolve-import`)
Muc dich:
- Xu ly trung `Mã hàng` nhung khac `Tên hàng` khi nap file nguon.

Thao tac:
1. Chon giu du lieu cu hoac moi cho tung xung dot.
2. Hoac sua ma de tao ma moi.
3. Bam hoan tat de import lai.

Ket qua:
- Snapshot duoc tao khi tat ca conflict da xu ly.

## 4.6 Bao cao tong hop (`/report/items`)
Muc dich:
- Tong hop cross-location theo ma hang.
- Loc nhanh cac ma lech.

Thao tac:
1. Tim theo ma/ten hang.
2. Bat/tat loc `Chi lech`.
3. Refresh.
4. Xem phan trang.
5. Bam vao dong de vao chi tiet.

Truong hien thi chinh:
- Ton he thong.
- Da kiem (actual).
- Chenh lech.
- Trang thai.
- Nguyen nhan van hanh (goi y).

## 4.7 Bao cao chi tiet 1 ma (`/report/[itemKey]`)
Muc dich:
- Xem phan bo theo vi tri.
- Xem ngoai le da ghi.

Thao tac:
1. Xem thong tin ma hang va KPI.
2. Xem danh sach vi tri da kiem.
3. Bam vi tri de nhay ve man quet vi tri do.

CHECKLIST CHUP ANH:
- [HINH-14] Tong quan chi tiet 1 ma.
- [HINH-15] Phan bo theo vi tri.
- [HINH-16] Ngoai le theo loai.

## 4.8 Cai dat he thong (`/settings`)
Muc dich:
- Cau hinh mode quet, mode van hanh, ngon ngu UI.

Thao tac:
1. Chon mode quet: WEDGE/CAMERA/QUICK.
2. Chon mode van hanh: Co ban/Nang cao.
3. Chon ngon ngu UI: VI/LO/System.

Luu y:
- Doi mode khong xoa du lieu dang co.

## 5) Quy trinh nop file cho ke toan/quan ly
1. Chot kiem theo vi tri.
2. Vao `Kiem ke vi tri` -> `Xuat Excel` hoac `Xuat CSV`.
3. Mo file kiem tra nhanh:
   - Co sheet `TongHop`, `ChiTiet` (neu XLSX).
   - So dong hop ly.
4. Chia se file qua kenh duoc phe duyet noi bo.

## 6) Checklist van hanh cuoi ngay
- Da luu tat ca nhap chua luu.
- Khong con vi tri dang treo du lieu.
- Bao cao tong hop khop so du kien.
- Da xuat file va gui dung nguoi nhan.

