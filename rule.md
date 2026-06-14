# 📜 Quy tắc Phát triển Dự án (Coding Rules & Guidelines)

Tài liệu này chứa các quy tắc thiết kế, phát triển và quy trình vận hành mà tất cả các lập trình viên hoặc công cụ AI khi tham gia phát triển dự án **Zalo Delivery CMS** bắt buộc phải tuân theo.

---

## 1. Kiến trúc & Cấu trúc Thư mục

Mọi thay đổi hoặc bổ sung tệp tin mới đều phải tuân theo sơ đồ cấu trúc hiện tại:

*   **`src/api/`**: Chứa các lớp gọi API Client.
    *   Tất cả các API call phải đi qua Axios instance được định nghĩa tại `src/api/http.ts`.
    *   Không tự ý viết `axios.get` hay `fetch` trực tiếp trong component.
*   **`src/components/`**: Chia nhỏ component theo module chức năng:
    *   `layout/`: Sidebar, Header, AppLayout dùng chung.
    *   `dashboard/`: Các widget, panel đặc thù của Dashboard (ví dụ: `DispatcherPanel.vue`).
    *   `order/`: Các tab và drawer chi tiết đơn hàng.
    *   `shipper/`: Các thành phần bản đồ, popup liên quan đến shipper.
*   **`src/views/`**: Chứa các trang cấp cao (Page views) được ánh xạ trực tiếp từ router.
*   **`src/stores/`**: Chứa Pinia stores để quản lý state toàn cục (e.g. notifications, config).
*   **`src/types/`**: Định nghĩa tập trung các interfaces, types TypeScript tại `src/types/index.ts`. Không định nghĩa rải rác.
*   **`src/utils/`**: Các hàm trợ giúp dùng chung (`helpers.ts`).

---

## 2. Quy tắc Code Vue 3 & TypeScript

### 2.1 Cú pháp Vue
*   Luôn sử dụng cú pháp **`<script setup lang="ts">`** và Composition API.
*   Đặt tên component theo định dạng **PascalCase** (Ví dụ: `OrderLiveTrackingTab.vue`, `ShipperMapDrawer.vue`).
*   Sử dụng CSS Scoped (`<style scoped>`) để tránh ảnh hưởng chéo style giữa các component.

### 2.2 Quy tắc TypeScript nghiêm ngặt (Strict TypeScript)
*   **Không sử dụng kiểu `any`**: Mọi dữ liệu trả về từ API hoặc truyền qua các component props phải được định nghĩa kiểu dữ liệu rõ ràng trong `src/types/index.ts`.
*   Luôn bật chế độ kiểm tra nghiêm ngặt. Lệnh biên dịch kiểm tra kiểu dữ liệu `npx tsc --noEmit` phải chạy thành công mà không có bất kỳ lỗi nào trước khi commit hoặc build.

---

## 3. Thiết kế, Style & UI/UX (Design System)

CMS sử dụng theme tối (**Dark Theme**) cao cấp kết hợp hiệu ứng **Glassmorphism**. Mọi thành phần UI được phát triển mới cần tuân thủ các chỉ dẫn sau:

### 3.1 Sử dụng biến màu hệ thống (CSS Variables)
Sử dụng các biến màu đã định nghĩa tại `src/style.css` để bảo đảm tính đồng nhất:
*   Màu nền tổng thể: `var(--bg-main)`
*   Màu nền thẻ glassmorphism: `var(--bg-card)` (kèm `backdrop-filter: blur(12px)`)
*   Màu viền: `var(--border-color)`
*   Màu chữ chính: `var(--text-primary)`, chữ phụ: `var(--text-muted)`
*   Màu chủ đạo: `var(--color-primary)` (xanh dương sáng)

### 3.2 Tích hợp TailwindCSS & Element Plus
*   Sử dụng **Element Plus** làm thư viện UI nền tảng cho form, table, dialog, timeline, tabs để giữ tính đồng bộ cho các thao tác admin.
*   Sử dụng **TailwindCSS** cho việc chia bố cục (Grid, Flexbox), spacing (padding/margin), typography, hiệu ứng hover/active và responsive.
*   **Không tự tiện thêm style tùy biến** bằng các mã màu hex trực tiếp (`#ffffff`, `#000000`) mà phải thông qua bảng màu của TailwindCSS hoặc biến CSS.

### 3.3 Hiệu ứng & Chuyển động (Micro-animations)
*   Các trạng thái chờ tài xế phải dùng hiệu ứng **Radar Pulse** bằng CSS (đã cấu trúc sẵn).
*   Các button, hàng trong bảng phải có hiệu ứng hover mượt mài (`transition: all 0.3s ease`).

---

## 4. Tích hợp Bản đồ & Các dịch vụ Realtime

### 4.1 Leaflet Maps
*   Sử dụng thư viện `@vue-leaflet/vue-leaflet` kết hợp với leaflet gốc.
*   Map Tiles bắt buộc sử dụng **Dark Tiles** từ CartoDB (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`) để khớp với giao diện tối của hệ thống.
*   **Giải phóng bộ nhớ**: Mọi tác vụ polling vị trí shipper hoặc vẽ animation trên map phải được xóa sạch (sử dụng `clearInterval` hoặc `clearTimeout`) trong hook `onBeforeUnmount` nhằm tránh rò rỉ bộ nhớ (memory leaks).

### 4.2 Background Polling & Notifications
*   Tính năng Polling định kỳ kiểm tra đơn hàng mới hoặc thay đổi trạng thái phải được tổ chức tập trung trong Pinia store (`notificationStore.ts`) thay vì viết rải rác ở từng component để tối ưu hóa tài nguyên mạng.
*   Chỉ kích hoạt polling khi người dùng đang ở phiên làm việc active.

---

## 5. Quy trình Kiểm thử & Commit Code (Git Workflow)

1.  **Kiểm tra chất lượng code cục bộ**:
    Trước khi tạo bất kỳ commit nào, lập trình viên bắt buộc phải chạy hai lệnh sau và đảm bảo không có lỗi:
    ```bash
    npx tsc --noEmit
    npm run build
    ```
2.  **Thông điệp commit (Conventional Commits)**:
    Thông điệp commit phải tuân thủ chuẩn Conventional Commits:
    *   `feat: ...` khi thêm tính năng mới (ví dụ: `feat: add shipper live location drawer`).
    *   `fix: ...` khi sửa lỗi.
    *   `chore: ...` cho các thay đổi cấu hình, build tool, package dependency.
    *   `refactor: ...` khi cải tiến cấu trúc code mà không đổi tính năng.
3.  **Commit riêng lẻ (Atomic Commits)**:
    Không gộp nhiều tính năng khác nhau vào chung một commit. Chia nhỏ các commit theo từng bước triển khai trong `implementation_plan.md`.
