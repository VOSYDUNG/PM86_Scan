# CAPTURE CHECKLIST - PM86 MASTER GUIDE

## Muc tieu
- Thu thap 16 anh screenshot tu emulator Android 11+ de chen vao `docs/MASTER_GUIDE_PM86.md`.
- Dat ten file dung quy uoc de de bao tri va doi chieu tai lieu.

## Quy uoc dat ten
- `HINH-01-home-overview.png`
- ...
- `HINH-16-report-item-exceptions.png`

## Lenh chup nhanh (ADB)
```bash
adb devices
adb shell screencap -p /sdcard/HINH-01-home-overview.png
adb pull /sdcard/HINH-01-home-overview.png docs/images/
```

## Script tu dong ho tro capture
```bash
powershell -ExecutionPolicy Bypass -File scripts/capture_pm86_docs_images.ps1
python scripts/export_master_guide_docx.py
```
- Script se nhac tung man hinh, ban dieu huong tren may roi bam Enter de chup.
- Sau khi co anh that, script export se tao lai Word va bo qua anh placeholder/rong.

## Danh sach anh bat buoc
1. `HINH-01-home-overview.png`
- Man hinh: Home overview
- Callout: quick actions, du lieu nguon, kho hang

2. `HINH-02-home-session-modal.png`
- Man hinh: Session history modal
- Callout: list phien, phan trang, nut tiep tuc/xoa

3. `HINH-03-home-file-manager.png`
- Man hinh: File manager modal
- Callout: doi file, sua ten, xoa

4. `HINH-04-inventory-kpi.png`
- Man hinh: Inventory
- Callout: KPI trung tam, do phu, quick actions

5. `HINH-05-inventory-location-list.png`
- Man hinh: Inventory location list
- Callout: status vi tri, tien do

6. `HINH-06-inventory-export-sheet.png`
- Man hinh: Export sheet
- Callout: chon CSV/XLSX

7. `HINH-07-locations-list-progress.png`
- Man hinh: Locations
- Callout: card vi tri, thanh do phu SKU

8. `HINH-08-locations-operations-panel.png`
- Man hinh: Locations operations panel
- Callout: action basic/advanced

9. `HINH-09-locations-add-edit-modal.png`
- Man hinh: Add/Edit location modal
- Callout: ten vi tri, ma vi tri, type

10. `HINH-10-scan-camera-frame.png`
- Man hinh: Scan camera
- Callout: khung scan, hint, logo overlay

11. `HINH-11-scan-item-qty.png`
- Man hinh: Scan item detail
- Callout: item card, qty control, luu

12. `HINH-12-scan-draft-sheet.png`
- Man hinh: Draft list sheet
- Callout: save draft, save all

13. `HINH-13-scan-not-found-add-new.png`
- Man hinh: not found + add new
- Callout: canh bao va tao ma moi

14. `HINH-14-report-item-overview.png`
- Man hinh: report item detail overview
- Callout: ton he thong, dem OK, chenh lech

15. `HINH-15-report-by-location.png`
- Man hinh: report by location
- Callout: phan bo theo vi tri

16. `HINH-16-report-item-exceptions.png`
- Man hinh: report exceptions
- Callout: danh sach ngoai le

## Checklist chat luong truoc khi chen
- [ ] Dung man hinh dung route
- [ ] Co du callout can thiet
- [ ] Khong lo du lieu nhay cam
- [ ] Do phan giai ro net (portrait)
- [ ] Dung ten file quy uoc

## Trang thai hien tai
- Chua co emulator online trong moi truong CLI.
- Cac file `HINH-xx` nho/rong duoc xem la khong hop le de nop bao cao.
- Can ghi de anh that vao dung ten file truoc khi xuat ban Word final.
