import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

function buildTemplateWorkbook() {
  const guideRows = [
    ['Chế độ', 'Bước', 'Sheet/Tệp', 'Mục tiêu vận hành', 'Thao tác trong app', 'Bắt buộc'],
    ['Cơ bản', '1', 'DU_LIEU_NGUON_MISA', 'Nạp dữ liệu kho tổng từ MISA', 'Trang chủ > Nạp dữ liệu MISA', 'Có'],
    ['Cơ bản', '2', 'Không cần sheet khác', 'Tạo phiên và kiểm kê theo vị trí ngay', 'Trang chủ > Bắt đầu phiên / Tiếp tục phiên', 'Có'],
    ['Cơ bản', '3', 'DANH_MUC_VI_TRI_SKU', 'Khoanh SKU theo từng vị trí khi cần', 'Quản lý vị trí > Gán mã hàng theo vị trí (nâng cao)', 'Không bắt buộc'],
    ['Nâng cao', '1', 'DU_LIEU_NGUON_MISA', 'Khởi tạo kỳ dữ liệu từ file MISA', 'Trang chủ > Khởi tạo dự án', 'Có'],
    ['Nâng cao', '2', 'DANH_MUC_VI_TRI_SKU', 'Chuẩn hóa SKU theo vị trí', 'Quản lý vị trí > Gán mã hàng theo vị trí (nâng cao)', 'Khuyến nghị'],
    ['Nâng cao', '3', 'GOI_KIEM_KE_<...>.xlsx', 'Phát gói kiểm kê cho kho nhỏ', 'Quản lý vị trí > Xuất gói kiểm kê vị trí', 'Có'],
    ['Nâng cao', '4', 'NOP_VI_TRI_<...>.xlsx', 'Nạp ngược kết quả kiểm kê vị trí', 'Quản lý vị trí > Nạp file nộp vị trí', 'Có'],
    ['Lưu ý', '-', '-', 'Sau khi nạp, dữ liệu đã lưu DB nội bộ', 'Xóa file gốc vẫn tiếp tục vận hành', '-'],
    ['Lưu ý', '-', 'HUONG_DAN_VAN_HANH / FLOW_*', 'Các sheet hướng dẫn chỉ để tham khảo vận hành', 'Có thể xóa các sheet hướng dẫn trước khi gửi file cho bên khác', '-'],
  ];

  const basicFlowRows = [
    ['Bước', 'Luồng Cơ bản trên 1 máy', 'Kết quả'],
    ['1', 'Nạp dữ liệu MISA (Check_item.xlsx)', 'Tạo dữ liệu nguồn'],
    ['2', 'Bắt đầu phiên kiểm kê', 'Tạo phiên vận hành'],
    ['3', 'Thêm vị trí (đặt tên, mã tự sinh)', 'Mỗi vị trí dùng danh mục SKU từ file nguồn'],
    ['4', 'Quét kiểm kê và lưu', 'Sinh dữ liệu kiểm đếm'],
    ['5', 'Xuất báo cáo', 'Báo cáo tổng hợp + chi tiết theo vị trí'],
    ['Lưu ý', 'Các sheet hướng dẫn chỉ để đọc', 'Có thể xóa trước khi gửi file ra ngoài'],
  ];

  const advancedFlowRows = [
    ['Bước', 'Luồng Nâng cao (kho tổng/kho nhỏ)', 'Kết quả'],
    ['1', 'Khởi tạo dự án từ file MISA', 'Tạo kỳ dữ liệu'],
    ['2', 'Gán mã hàng theo vị trí (tùy chọn)', 'Chuẩn hóa phạm vi SKU từng vị trí'],
    ['3', 'Xuất gói kiểm kê vị trí', 'Kho nhỏ nhận gói để kiểm đếm'],
    ['4', 'Kho nhỏ kiểm xong xuất file nộp', 'Tạo file NOP_VI_TRI_<...>.xlsx'],
    ['5', 'Kho tổng nạp file nộp vị trí', 'Hợp nhất dữ liệu toàn kho'],
    ['Lưu ý', 'Các sheet hướng dẫn chỉ để đọc', 'Có thể xóa trước khi gửi file ra ngoài'],
  ];

  const sourceRows = [
    ['TỔNG HỢP TỒN KHO', '', '', '', '', '', '', '', ''],
    ['Kho: Kho Vientiane SPM, Từ ngày 04/10/2025 đến ngày 20/12/2025', '', '', '', '', '', '', '', ''],
    ['STT', 'Mã hàng', 'Tên hàng', 'ĐVT', 'Cuối kỳ', 'SL Kiểm kê', 'Chênh lệch', 'Ghi chú', ''],
    ['', '', '', '', 'Số lượng', '', '', '', ''],
    [1, '8857123882332', 'Baby Wipes 150g', 'Gói', 120, '', '', '', ''],
    [2, '8857123882448', 'Baby Wipes 100g', 'Gói', 85, '', '', '', ''],
    ['', '', '', '', '', '', '', '', ''],
    ['LƯU Ý', 'Đây là mẫu theo đúng layout MISA thực tế', '', '', '', '', '', '', ''],
    ['LƯU Ý', 'Cột bắt buộc: STT, Mã hàng, Tên hàng, ĐVT, Cuối kỳ', '', '', '', '', '', '', ''],
    ['LƯU Ý', 'File chỉ có 1 sheet nguồn vẫn nạp được bình thường', '', '', '', '', '', '', ''],
    ['LƯU Ý', 'Áp dụng cho cả chế độ Cơ bản và Nâng cao', '', '', '', '', '', '', ''],
    ['LƯU Ý', 'Khuyến nghị dùng file .xlsx tải trực tiếp từ MISA', '', '', '', '', '', '', ''],
  ];

  const scopeRows = [
    ['Mã vị trí', 'Mã hàng', 'Tên vị trí', 'Tên kho', 'Tên hàng', 'ĐVT', 'Mã snapshot nguồn', 'Tên file nguồn', 'Ngày chốt dữ liệu', 'Ghi chú điều phối'],
    ['LOC_KE_A1_T2', '8857123882332', 'Kệ A1 - Tầng 2', 'Kho Vientiane SPM', 'Baby Wipes 150g', 'GOI', '', '', '', ''],
    ['LOC_KE_A1_T2', '8857123882448', 'Kệ A1 - Tầng 2', 'Kho Vientiane SPM', 'Baby Wipes 100g', 'GOI', '', '', '', ''],
    ['LOC_KE_B1_T1', '8857123882332', 'Kệ B1 - Tầng 1', 'Kho Vientiane SPM', 'Baby Wipes 150g', 'GOI', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['LƯU Ý', 'Cột bắt buộc', 'Mã vị trí, Mã hàng', '', '', '', '', '', '', ''],
    ['LƯU Ý', 'Cột tùy chọn', 'Tên vị trí, Tên kho, Tên hàng, ĐVT, Mã snapshot nguồn, Tên file nguồn, Ngày chốt dữ liệu, Ghi chú điều phối', '', '', '', '', '', '', ''],
    ['LƯU Ý', 'Ngày chốt dữ liệu', 'Định dạng YYYY-MM-DD, ví dụ 2026-02-07', '', '', '', '', '', '', ''],
    ['LƯU Ý', 'Cơ bản', 'Không bắt buộc. Nếu bỏ qua, vị trí dùng toàn bộ SKU từ file nguồn.', '', '', '', '', '', '', ''],
    ['LƯU Ý', 'Nâng cao', 'Khuyến nghị nạp để kiểm soát đúng SKU theo từng vị trí.', '', '', '', '', '', '', ''],
    ['LƯU Ý', 'Vận hành', 'Nạp xong dữ liệu lưu nội bộ DB; xóa file gốc vẫn vận hành được', '', '', '', '', '', '', ''],
  ];

  const submissionRows = [
    ['Mã kỳ dữ liệu', 'Mã snapshot nguồn', 'Tên file nguồn', 'Tên kho', 'Mã vị trí', 'Tên vị trí', 'Ngày chốt dữ liệu', 'Mã hàng', 'Số lượng đếm', 'Số lượng đạt', 'Ngoài danh mục', 'Thời điểm cập nhật'],
    ['SPM-20260207-K1', 'snap_demo_001', 'Check_item_demo.xlsx', 'Kho Vientiane SPM', 'LOC_KE_A1_T2', 'Kệ A1 - Tầng 2', '2026-02-07', '8857123882332', 118, 117, 0, '2026-02-07T10:12:00'],
    ['SPM-20260207-K1', 'snap_demo_001', 'Check_item_demo.xlsx', 'Kho Vientiane SPM', 'LOC_KE_A1_T2', 'Kệ A1 - Tầng 2', '2026-02-07', '8857123882448', 87, 85, 0, '2026-02-07T10:13:00'],
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    ['LƯU Ý', '', '', '', '', '', '', 'Đây là sheet mẫu tham khảo cho file nộp vị trí', '', '', '', ''],
    ['LƯU Ý', '', '', '', '', '', '', 'File nộp thật do app xuất tên NOP_VI_TRI_<...>.xlsx', '', '', '', ''],
    ['LƯU Ý', '', '', '', '', '', '', 'Không dùng sheet mẫu này để nạp nguồn MISA', '', '', '', ''],
  ];

  const sourceSheet = XLSX.utils.aoa_to_sheet(sourceRows);
  sourceSheet['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 34 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 4 }];

  const scopeSheet = XLSX.utils.aoa_to_sheet(scopeRows);
  scopeSheet['!cols'] = [
    { wch: 20 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 30 },
    { wch: 10 },
    { wch: 20 },
    { wch: 22 },
    { wch: 18 },
    { wch: 28 },
  ];

  const wb = XLSX.utils.book_new();
  const guideSheet = XLSX.utils.aoa_to_sheet(guideRows);
  guideSheet['!cols'] = [{ wch: 14 }, { wch: 8 }, { wch: 30 }, { wch: 36 }, { wch: 42 }, { wch: 14 }];
  const basicFlowSheet = XLSX.utils.aoa_to_sheet(basicFlowRows);
  basicFlowSheet['!cols'] = [{ wch: 8 }, { wch: 42 }, { wch: 34 }];
  const advancedFlowSheet = XLSX.utils.aoa_to_sheet(advancedFlowRows);
  advancedFlowSheet['!cols'] = [{ wch: 8 }, { wch: 44 }, { wch: 34 }];
  XLSX.utils.book_append_sheet(wb, guideSheet, 'HUONG_DAN_VAN_HANH');
  XLSX.utils.book_append_sheet(wb, basicFlowSheet, 'FLOW_CO_BAN');
  XLSX.utils.book_append_sheet(wb, advancedFlowSheet, 'FLOW_NANG_CAO');
  XLSX.utils.book_append_sheet(wb, sourceSheet, 'DU_LIEU_NGUON_MISA');
  XLSX.utils.book_append_sheet(wb, scopeSheet, 'DANH_MUC_VI_TRI_SKU');
  const submissionSheet = XLSX.utils.aoa_to_sheet(submissionRows);
  submissionSheet['!cols'] = [{ wch: 16 }, { wch: 20 }, { wch: 24 }, { wch: 20 }, { wch: 18 }, { wch: 24 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, submissionSheet, 'NOP_VI_TRI_MAU');
  return wb;
}

export async function downloadTemplateWorkbook(): Promise<{ uri: string; fileName: string }> {
  const wb = buildTemplateWorkbook();
  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const fileName = 'Template_KiemKe_NNC.xlsx';
  const uri = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(uri, base64, { encoding: 'base64' });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Tai tep mau kiem ke',
      UTI: 'com.microsoft.excel.xlsx',
    });
  }

  return { uri, fileName };
}
