# KNOWN LIMITATIONS - Gioi han hien tai

## 1) Nen tang va thiet bi
- Android yeu cau `minSdkVersion 30` (Android 11+).
- Thiet bi Android thap hon co the khong cai duoc APK.

## 2) Offline-first, chua co dong bo online
- Du lieu luu local SQLite tren tung may.
- Chua co cloud sync realtime giua nhieu may.
- Chia se du lieu lien may hien tai thong qua file goi/nop (advanced).

## 3) Draft tren man quet
- Draft dang nam trong state runtime man quet.
- Neu app bi kill dot ngot, draft chua luu co the mat.
- Da co co che nhac luu va thao tac `Luu tat ca` de giam rui ro.

## 4) CSV phu thuoc encoding/locale
- CSV co fallback delimiter va BOM, nhung van co rui ro ky tu voi mot so bo office.
- `.xlsx` van la format khuyen nghi.

## 5) Import MISA phu thuoc layout
- Parser toi uu cho layout MISA thuc te (kieu `Check_item.xlsx`).
- File da bien doi manh header/co cot sai mau co the fail.

## 6) Flow advanced can dung dung nut nghiep vu
- Nap nham giua `Nguon MISA`, `Goi vi tri`, `File nop vi tri` se bi chan.
- Can dao tao thao tac cho doi van hanh truoc khi trien khai rong.

## 7) Auto-collapse bang dieu phoi vi tri
- Bang dieu phoi tu thu gon sau mot khoang thoi gian co dinh khi vao man.
- Neu user can doc lau hon, can bam mo lai.

## 8) Report export la noi bo
- Ten cot va logic xuat da toi uu theo van hanh noi bo.
- Neu don vi nhan file doi format khac, can them bo converter rieng.

## 9) Chua co co che rollback import theo phien
- Xoa du lieu sai hien tai la thao tac xoa snapshot/session.
- Chua co "undo import" theo transaction cap nghiep vu.

