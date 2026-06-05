# RELEASE NOTES - PM84/PM86 StockCount

## Phien ban app
- App version: `1.0.0` (tu `app.json`)
- Package Android: `com.nnc.pm86stockcount`
- Min Android: 11+ (`minSdk 30`)

## Ban ghi tai lieu (Docs-as-Code)
- Release docs date: 2026-02-08
- Scope: bo tai lieu van hanh va audit toan app.

## Thay doi chinh trong dot nay
1. Hoan thien bo 8 tai lieu trong `docs/`:
   - `APP_GUIDE.md`
   - `SCREEN_MAP.md`
   - `TROUBLESHOOTING.md`
   - `DATA_RULES.md`
   - `EXPORT_SPEC.md`
   - `GLOSSARY.md`
   - `KNOWN_LIMITATIONS.md`
   - `RELEASE_NOTES.md`
2. Chot luong van hanh theo 2 mode:
   - `Cơ bản`
   - `Nâng cao`
3. Chot dac ta import MISA theo layout thuc te (`Check_item.xlsx`).
4. Chot dac ta export CSV/XLSX va file trao doi vi tri.
5. Chot quy trinh xu ly loi thuong gap tren PM84/PM86.

## Rủi ro da biet
1. Van hanh tren thiet bi RAM thap co the gay crash neu thao tac lien tuc.
2. CSV van co rui ro encoding tren mot so bo office.
3. Draft scan chua persist khi app bi kill dot ngot.

## Huong tiep theo (backlog khuyen nghi)
1. Persist draft scan xuong DB de chong mat du lieu khi crash.
2. Them telemetry nhe cho crash/import/export fail.
3. Them script verify docs coverage tu route map.
4. Bo sung bo anh that PM84/PM86 theo placeholder trong guide.

## Checklist release truoc trien khai kho
- [ ] Smoke test full flow: import -> session -> location -> scan -> report -> export.
- [ ] Test import `Check_item.xlsx` tren PM84 va PM86.
- [ ] Test install APK tren thiet bi target Android 11+.
- [ ] Review docs voi doi van hanh kho.

