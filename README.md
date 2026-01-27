# PM86 StockCount - Ứng dụng Kiểm kê Kho MISA

Ứng dụng di động chuyên dụng cho việc kiểm kê kho hàng, được tối ưu hóa cho thiết bị cầm tay **Point Mobile PM86** (Android) và tích hợp chặt chẽ với quy trình của phần mềm kế toán **MISA**.

## 🚀 Tính năng nổi bật

### 1. Nhập liệu linh hoạt (Import)
- **Đa định dạng:** Hỗ trợ nạp dữ liệu tồn kho từ cả file **Excel (.xlsx, .xls)** và **CSV**.
- **Tự động nhận diện:** Thuật toán thông minh tự động map các cột quan trọng (Mã hàng, Tên hàng, ĐVT, Tồn kho) từ file xuất của MISA.
- **Xử lý xung đột:**
    - Tự động phát hiện các mã hàng trùng lặp trong file nhập.
    - Giao diện trực quan cho phép người dùng chọn giữ dòng dữ liệu nào.
    - **Sửa mã nhanh:** Hỗ trợ sửa đổi mã hàng trực tiếp ngay khi phát hiện xung đột để đảm bảo dữ liệu đầu vào sạch sẽ.

### 2. Kiểm kê thông minh (Scanning)
- **Tối ưu cho PM86:** Tương thích hoàn hảo với chế độ quét **Keyboard Wedge** của máy PM86 (tốc độ cao).
- **Camera Scan:** Hỗ trợ quét bằng camera cho các thiết bị di động thông thường.
- **Chế độ kiểm:**
    - **SET (Ghi đè):** Nhập trực tiếp số lượng thực tế.
    - **ACCUMULATE (Cộng dồn):** Cộng thêm số lượng mỗi lần quét (phù hợp khi đếm từng sản phẩm).
- **Tìm kiếm & Gợi ý:** Tìm kiếm nhanh theo Mã hàng, Tên hàng hoặc Barcode alias.

### 3. Kiểm kê Multi-Location (Nâng cao)
- **Quản lý Vị trí (Location):** Kiểm kê đồng thời tại nhiều kho con, kệ hàng hoặc xe giao hàng trong cùng một phiên.
- **Tự động sinh Vị trí:** Tự động tạo vị trí mặc định dựa trên kho hàng từ MISA.
- **Phân loại hàng lỗi (Quality Buckets):** Phân rã số lượng thực tế thành các loại: Hàng tốt, Hết hạn, Hư hỏng, Sai mã, Sai quy cách.
- **Coverage & Reconciliation:**
    - Theo dõi độ phủ (Coverage) kiểm kê của từng mã hàng.
    - Gợi ý nguyên nhân lệch: Sai vị trí (Mislocation), Chưa kiểm hết, hoặc Có hàng lỗi.

### 4. Xuất báo cáo (Export)
- **Chuẩn định dạng MISA:** Tự động gộp dữ liệu từ tất cả vị trí để xuất file nạp ngược vào MISA.
- **Đa định dạng xuất:** Excel (.xlsx) và CSV (UTF-8 BOM).
- **Ghi chú tự động:** Tự động tổng hợp các lỗi (Hư hỏng, Hết hạn...) vào cột ghi chú của MISA.

---

## 🧪 Hướng dẫn Kiểm thử (Testing Multi-Location)

Để kiểm tra các tính năng Multi-Location mới, hãy thực hiện theo luồng sau:

### 1. Khởi tạo
- Nạp file MISA mẫu (Excel/CSV).
- Tại màn hình chính, chọn Kho và bấm **"Bắt đầu phiên kiểm kê mới"**.

### 2. Quản lý Vị trí (Location)
- Sau khi tạo phiên, bạn sẽ được đưa đến màn hình **"Danh sách vị trí"**.
- Kiểm tra xem vị trí mặc định (tên Kho) đã được tạo tự động chưa.
- (P1) Thử quét mã QR vị trí để tạo thêm vị trí mới (như Xe, Kệ).

### 3. Quét hàng & Phân loại (Scan & Quick Split)
- Chọn một vị trí bất kỳ để vào màn hình Quét.
- Quét 1 mã hàng.
- Nhập **Tổng số lượng** đếm được tại vị trí đó.
- Bấm **"+ Báo lỗi"** để thử phân loại hàng lỗi (ví dụ: 10 cái tổng, trong đó 2 cái Hết hạn).
- Bấm **"Lưu"** và kiểm tra xem số lượng "Đã kiểm (Vị trí này)" hiển thị đúng Tổng và số lượng OK (Usable) không.

### 4. Đối chiếu Cross-Location (Report)
- Quay lại màn hình Vị trí, bấm **"Xem Items"**.
- Tìm sản phẩm vừa quét.
- Bấm vào sản phẩm đó để xem báo cáo chi tiết:
    - Xem sản phẩm đó nằm ở những vị trí nào.
    - Xem tổng hợp các loại lỗi.
    - Xem trạng thái **Coverage** (Hoàn thành nếu tổng thực tế khớp sổ sách).

### 5. Xuất dữ liệu
- Tại màn hình Vị trí, bấm **"Xuất File"**.
- Mở file Excel/CSV vừa xuất và kiểm tra xem cột "SL Kiểm kê" có bằng Tổng thực tế trừ đi hàng lỗi không.

---

## 🛠 Cài đặt & Phát triển

### Yêu cầu hệ thống
- Node.js (v18+)
- Expo CLI
- Thiết bị Android (hoặc giả lập) cho Development Client.

### Cài đặt
```bash
# 1. Clone dự án
git clone <repo_url>

# 2. Cài đặt dependencies
npm install

# 3. Chạy Development Client (khuyến nghị cho PM86)
npx expo prebuild
npx expo run:android

# Hoặc chạy Expo Go (demo nhanh)
npx expo start
```

### Kiểm tra trước khi Build (Pre-build Checks)
Trước khi đẩy lên EAS Build hoặc build local, hãy luôn chạy các lệnh kiểm tra sau để đảm bảo chất lượng code:

```bash
# 1. Kiểm tra lỗi cú pháp và style (Lint)
npm run lint

# 2. Kiểm tra lỗi kiểu dữ liệu (TypeScript)
npm run typecheck

# 3. Chạy Unit Test
npm run test

# 4. Kiểm tra sức khỏe project Expo (Khuyên dùng)
npx expo-doctor
```

### Build APK (Production)
```bash
npm install -g eas-cli
eas login
eas build -p android --profile production
```

---

## 🏗 Kiến trúc dự án (Clean Architecture)

Dự án tuân thủ mô hình Clean Architecture để đảm bảo khả năng bảo trì và mở rộng:

```
src/
├── domain/           # Business Logic (Entities, Usecases)
│   ├── entities/     # Types, Interfaces
│   └── usecases/     # Logic nghiệp vụ (Import, Export, Scan...)
├── data/             # Data Layer
│   ├── sqlite/       # Cấu hình Database, Migrations
│   └── repos/        # Triển khai Repository (tương tác DB)
├── infra/            # Infrastructure Layer
│   ├── files/        # Xử lý File (Excel/CSV Parser - SheetJS)
│   └── scan/         # Driver cho Scanner (Camera, Wedge)
└── presentation/     # UI Layer (React Native)
    ├── components/   # UI Components tái sử dụng
    ├── screens/      # Màn hình chức năng
    ├── store/        # State Management (Zustand)
    └── theme/        # Cấu hình màu sắc, giao diện
```

---

## 📱 Lưu ý cho thiết bị PM86

1.  **Cấu hình Scanner:** Vào Settings > ScanSettings > Key Wedge. Đảm bảo chế độ nhập liệu là "Key Event" hoặc "Focus" để app nhận dữ liệu như bàn phím.
2.  **Cấp quyền:** Đảm bảo cấp quyền truy cập bộ nhớ (Storage) để đọc/ghi file Excel.

---

## 📦 Thư viện chính
- **expo-sqlite:** Lưu trữ dữ liệu cục bộ.
- **xlsx (SheetJS):** Đọc và ghi file Excel/CSV mạnh mẽ.
- **zustand:** Quản lý trạng thái ứng dụng gọn nhẹ.

---

## 🚀 Hướng dẫn Build Production (Checklist An toàn tuyệt đối)

Để tránh lãng phí lượt build trên EAS và đảm bảo App không bị crash khi cài đặt, hãy tuân thủ nghiêm ngặt quy trình dưới đây TRƯỚC khi chạy lệnh build.

### Giai đoạn 1: Kiểm tra Code & Logic (Local)

1.  **Chạy Typecheck (Bắt buộc):**
    Đảm bảo không có lỗi TypeScript nào (ví dụ: import sai, biến undefined).
    ```bash
    npm run typecheck
    ```
    *Nếu có lỗi đỏ -> PHẢI SỬA NGAY.*

2.  **Kiểm tra Code Style (Lint):**
    ```bash
    npm run lint
    ```

3.  **Kiểm tra tương thích (Expo Doctor):**
    Lệnh này giúp phát hiện các thư viện không tương thích với phiên bản Expo hiện tại.
    ```bash
    npx expo-doctor
    ```
    *Yêu cầu: Phải thấy dấu tick xanh ✅ ở tất cả các mục.*

### Giai đoạn 2: Kiểm tra cấu hình Native (Quan trọng)

4.  **Kiểm tra `app.json`:**
    *   `android.package`: Phải là `com.nnc.pm86stockcount` (hoặc ID của bạn).
    *   `version`: Tăng lên so với bản trước (VD: 1.0.0 -> 1.0.1).
    *   `android.versionCode`: Tăng lên 1 đơn vị (VD: 1 -> 2). **Nếu quên cái này, CH Play/EAS sẽ từ chối file build.**
    *   **Plugins:** Phải có `expo-camera` (để xin quyền Camera).

5.  **Chạy thử Prebuild (Giả lập build):**
    Lệnh này sẽ tạo ra folder `android/` thật để xem có lỗi config nào không.
    ```bash
    # 1. Xóa folder android cũ (nếu có) để sạch sẽ
    rm -rf android 
    # (Trên Windows Powershell: Remove-Item -Recurse -Force android)

    # 2. Chạy prebuild
    npx expo prebuild --clean
    ```
    *Nếu lệnh này báo lỗi đỏ -> Build trên Cloud chắc chắn sẽ lỗi. Hãy sửa config đến khi lệnh này chạy mượt mà.*

### Giai đoạn 3: Đẩy lên EAS (Build)

6.  **Login EAS:**
    ```bash
    eas login
    ```

7.  **Cấu hình `eas.json` (Kiểm tra file này):**
    Đảm bảo bạn có profile `production`.
    ```json
    {
      "build": {
        "production": {
          "android": {
            "buildType": "apk" 
          }
        }
      }
    }
    ```
    *Lưu ý: Chọn `apk` để test nội bộ, chọn `app-bundle` (aab) nếu up lên Google Play.*

8.  **Chạy lệnh Build:**
    ```bash
    eas build -p android --profile production
    ```

### 🛑 Các lỗi thường gặp (Đọc kỹ)
*   **Crash ngay khi mở App:** Thường do thiếu `expo-camera` trong `plugins` của `app.json`.
*   **Lỗi "FlatList doesn't exist":** Do import thiếu trong React Native (Đã fix ở P1).
*   **Lỗi Build trên EAS:** Thường do `package-lock.json` xung đột. Hãy xóa `node_modules` và `package-lock.json` rồi chạy `npm install` lại trước khi build.
