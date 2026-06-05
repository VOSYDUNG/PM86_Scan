# GLOSSARY - Tu dien thuat ngu PM84/PM86

## Thuat ngu nghiep vu
- `Kho`: don vi ton kho cap tong.
- `Vi tri`: khu/ke/xe/diem kiem trong kho.
- `Ma hang (SKU)`: ma nhan dien hang hoa.
- `ĐVT`: don vi tinh.
- `Tồn hệ thống`: so ton tren du lieu nguon MISA.
- `Tổng đếm`: tong so dem tai vi tri.
- `Đếm OK`: so luong dat sau khi tru ngoai le.
- `Ngoài danh mục`: hang duoc dem nhung khong nam trong danh muc SKU da gan cho vi tri.
- `Chênh lệch`: `Đếm OK - Tồn hệ thống`.
- `Khớp`: chenh lech bang 0.
- `Lệch dương`: `Đếm OK > Tồn hệ thống`.
- `Lệch âm`: `Đếm OK < Tồn hệ thống`.
- `Ngoại lệ`: phan loai loi chat luong (het han, hu hong, sai ma, sai quy cach, pham chat, khac).

## Thuat ngu he thong
- `Snapshot`: bo du lieu nguon sau 1 lan nap file.
- `Session (Phiên)`: dot kiem ke tren 1 snapshot + kho.
- `Location scope`: danh muc SKU ky vong theo vi tri.
- `BASIC mode`: che do van hanh co ban (nhanh, gon, 1 may).
- `ADVANCED mode`: che do nang cao (kho tong-kho nho, goi va nop vi tri).
- `WEDGE`: nhan du lieu tu may quet phan cung.
- `CAMERA`: quet bang camera.
- `QUICK`: tim/chon nhanh bang o tim kiem.
- `Draft`: du lieu nhap chua luu vao DB.

## File trao doi
- `DU_LIEU_NGUON_MISA`: sheet nguon MISA trong template.
- `DANH_MUC_VI_TRI_SKU`: sheet map vi tri-SKU.
- `THONG_TIN_GOI`: metadata cua goi vi tri.
- `DANH_SACH_KIEM_KE_VI_TRI`: danh sach SKU trong goi vi tri.
- `NOP_VI_TRI_KIEM_KE`: sheet ket qua nop nguoc.
- `Mã kỳ dữ liệu`: ma van hanh cua 1 chu ky kiem.
- `Mã snapshot nguồn`: ma ky thuat de doi soat bo du lieu.

## Trang thai
- `PENDING`: chua co so lieu kiem.
- `IN_PROGRESS`: da co so lieu nhung chua hoan tat.
- `DONE`: da dat muc ky vong theo scope.
- `LOCKED`: khoa trang thai (khong bi update boi recalc).

