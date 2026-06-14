# Kế hoạch Triển khai Chi tiết — Zalo Delivery CMS

> **Dự án:** Zalo Delivery CMS Admin Panel  
> **Framework:** Vue 3 (Composition API) + TypeScript + TailwindCSS + Element Plus + Leaflet Maps  
> **Mục tiêu:** Giám sát thời gian thực, quản lý shipper, theo dõi doanh thu và điều phối vận hành.  
> **Thời gian cập nhật:** 2026-06-14  

---

## 1. Hiện trạng Hệ thống (Đã Hoàn Thành)

Hệ thống hiện tại đã được thiết lập khung sườn vững chắc với các tính năng sau:

### 1.1 Core Architecture & Layout
- **Theme & Global Styles (`src/style.css`)**: Dark theme cao cấp, tối ưu hóa scrollbars, hiệu ứng glassmorphism và các hiệu ứng radar pulse bằng CSS.
- **Main Layout (`src/components/layout/`)**:
  - `AppLayout.vue`: Khung tổng thể Sidebar + Header + Main Content.
  - `AppSidebar.vue`: Navigation bar chuyển đổi mượt mà giữa các trang, tích hợp trạng thái online hệ thống.
  - `AppHeader.vue`: Header hiển thị tên trang hiện tại, avatar người dùng và **Notification Bell** kèm danh sách dropdown 10 thông báo mới nhất.
- **Notification Store (`src/stores/notificationStore.ts`)**: Quản lý thông báo, đánh dấu đã đọc, phát âm thanh beep khi có đơn hàng mới.

### 1.2 Dashboard Page (`src/views/DashboardView.vue`)
- Các thẻ thống kê (Stats Cards) lấy từ API `/api/dashboard/summary` (Tổng đơn, Chờ xử lý, Shipper Online, Doanh thu).
- Biểu đồ doanh thu 7 ngày (ECharts Bar Chart) từ `/api/revenue/daily`.
- Biểu đồ phân bố trạng thái đơn hàng (ECharts Pie Chart).
- Danh sách 5 đơn hàng gần đây nhất.

### 1.3 Order Management Page (`src/views/OrderListView.vue` & `src/components/order/`)
- **Trang danh sách đơn hàng (`OrderListView.vue`)**:
  - Bộ lọc nâng cao: Lọc nhiều trạng thái (multi-select status), khoảng thời gian (date range), tìm kiếm theo ID Shipper.
  - Bảng hiển thị thông tin đơn hàng đầy đủ, màu sắc badge tương ứng với từng trạng thái đơn.
  - Phân trang (Pagination) đồng bộ với backend.
  - Hỗ trợ auto-open Drawer chi tiết khi click thông báo (query param `viewOrder`).
- **Detail Slide-over Drawer (`OrderDrawer.vue`)**: Trượt mượt mà từ bên phải, chứa 3 tabs nghiệp vụ:
  - **Tab 1: Giám sát Realtime (`OrderLiveTrackingTab.vue`)**:
    - Nửa trái (60%): Bản đồ Leaflet (Dark theme tiles). Hiển thị marker Shop, Khách hàng, Shipper. Đường vẽ di chuyển (Polyline trajectory). Hiệu ứng radar pulse gợn sóng CSS khi đơn hàng đang tìm tài xế. Tự động polling `/api/orders/{id}/tracking` mỗi 3 giây khi đơn hàng hoạt động.
    - Nửa phải (40%): Thẻ thông tin Shipper, Khách hàng (có nút gọi), timeline trạng thái đơn hàng (Timeline component) và nút hủy đơn khẩn cấp.
  - **Tab 2: Chi tiết đơn hàng (`OrderItemsTab.vue`)**:
    - Bảng danh sách món ăn (tạm thời mock do backend chưa có API trả về Items).
    - Tóm tắt hóa đơn (tạm tính, ship, VAT, tổng thanh toán).
    - Danh sách lịch sử hóa đơn thanh toán của đơn hàng từ `/api/orders/{id}`.
  - **Tab 3: Nhật ký hệ thống (`OrderLogsTab.vue`)**:
    - Lịch sử gửi Offer điều phối shipper (Shipper, trạng thái offer, thời gian phản hồi).
    - Lịch sử đổi trạng thái đơn hàng.
    - Thông số kỹ thuật GPS và các ID thô hệ thống.

### 1.4 Shipper Management Page (`src/views/ShipperListView.vue`)
- Bảng danh sách shipper hiển thị tên, SĐT, loại phương tiện, trạng thái (ONLINE/OFFLINE/BUSY), tổng thu nhập.
- Dialog thêm mới và chỉnh sửa thông tin shipper (gọi API POST/PUT `/api/shippers`).
- Chức năng xóa shipper (soft-delete).

### 1.5 Revenue Page (`src/views/RevenueView.vue`)
- Thẻ tổng hợp: Tổng doanh thu, số đơn hoàn thành, giá trị TB/đơn.
- Bộ lọc ngày + Biểu đồ doanh thu ECharts Line Chart.
- Bảng phân tích chi tiết doanh thu từng ngày.

---

## 2. Các phần Chưa Hoàn Thành & Kế hoạch Chi tiết

Để đưa hệ thống lên chuẩn vận hành chuyên nghiệp (Production-ready), chúng ta cần bổ sung các tính năng nâng cao sau:

### Phase 1: Vận hành Hệ thống & Trực quan hóa Vận hành (Dispatcher Panel) — ✅ Đã hoàn thành
*Mục tiêu: Cho phép Operator giám sát Kafka Dispatcher và can thiệp thủ công (Trigger dispatch, Mô phỏng Shipper).*

- **Bước 1.1: Tích hợp thông số Kafka & Lag lên Dashboard**
  - Hiển thị widget "System Health & Consumer Lag" bên cạnh Dashboard charts.
  - Gọi API `/api/dispatcher/status` (kiểm tra Consumer active) và `/api/dispatcher/lag` (kiểm tra Kafka lag).
  - *File cần sửa*: `src/views/DashboardView.vue`
- **Bước 1.2: Tạo Panel Điều phối Thủ công (Operational Panel)**
  - Thêm một tab hoặc một widget vận hành để admin có thể:
    - Bấm nút "Trigger Dispatch" thủ công cho một đơn hàng (Gọi API POST `/api/dispatcher/trigger`).
    - Mô phỏng phản hồi của Shipper (Chấp nhận/Từ chối Offer) phục vụ testing và sửa lỗi vận hành nhanh (Gọi API POST `/api/dispatcher/respond`).
  - *File cần sửa*: `src/views/DashboardView.vue` hoặc tạo mới `src/components/dashboard/DispatcherPanel.vue`.

### Phase 2: Nâng cấp Giám sát Shipper (Shipper Advanced Features) — ✅ Đã hoàn thành
*Mục tiêu: Quản lý trạng thái và vị trí địa lý của Shipper thời gian thực ngoài phạm vi đơn hàng.*

- **Bước 2.1: Tích hợp Live Map vào trang Quản lý Shipper**
  - Thêm một Drawer hoặc một bản đồ nhỏ bên cạnh bảng Shipper. Khi click vào Shipper có trạng thái `ONLINE` hoặc `BUSY`, bản đồ sẽ hiển thị vị trí hiện tại của Shipper đó.
  - Gọi API `GET /api/shippers/{id}/location` (lấy tọa độ từ Redis Geo).
  - *File cần sửa/tạo mới*: `src/views/ShipperListView.vue` và `src/components/shipper/ShipperMapDrawer.vue`.
- **Bước 2.2: Thay đổi trạng thái Online/Offline trực tiếp**
  - Thêm một Switch (bật/tắt) ở cột Trạng thái trong bảng Shipper để Admin có thể chuyển đổi nhanh trạng thái của Shipper giữa `ONLINE` và `OFFLINE` (Yêu cầu truyền tọa độ giả lập khi bật ONLINE).
  - Gọi API `PATCH /api/shippers/{id}/status`.
  - *File cần sửa*: `src/views/ShipperListView.vue`.

### Phase 3: Hoàn thiện Realtime Notifications & Polling — ✅ Đã hoàn thành
*Mục tiêu: Đảm bảo CMS cập nhật thông tin đơn hàng mới liên tục mà không cần F5.*

- **Bước 3.1: Viết Background Polling Service trong Notification Store**
  - Thiết lập một hàm Polling định kỳ mỗi 5-10 giây trong `notificationStore.ts`.
  - Polling API `GET /api/orders` với bộ lọc đơn mới (ví dụ: các đơn `PENDING` hoặc mới tạo gần đây).
  - Nếu có đơn hàng mới xuất hiện mà CMS chưa biết, tạo một thông báo hệ thống và phát âm thanh cảnh báo.
  - *File cần sửa*: `src/stores/notificationStore.ts`.

### Phase 4: Đồng bộ Doanh thu & Báo cáo Lag — ✅ Đã hoàn thành
*Mục tiêu: Hiển thị chi tiết lag của Consumer dịch vụ Revenue để giám sát hiệu năng xử lý.*

- **Bước 4.1: Tích hợp Revenue Consumer Lag**
  - Hiển thị thông số lag của Revenue Consumer trên trang doanh thu.
  - Gọi API `GET /api/revenue/lag`.
  - *File cần sửa*: `src/views/RevenueView.vue`.
- **Bước 4.2: Tích hợp Chi tiết thu nhập Shipper**
  - Khi xem danh sách Shipper hoặc tại trang Doanh thu, hiển thị bảng doanh thu chi tiết của từng shipper (gồm tổng thu nhập và các bản ghi lịch sử giao dịch).
  - Gọi API `GET /api/revenue/shipper/{id}`.
  - *File cần sửa*: `src/views/ShipperListView.vue` hoặc `src/views/RevenueView.vue`.

---

## 3. Bản đồ Tích hợp API (API Mapping)

Dưới đây là sơ đồ chi tiết các API endpoints được tích hợp vào từng View của CMS:

| Màn hình (View) | API Endpoint | Method | Dữ liệu & Chức năng | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | `/api/dashboard/summary` | `GET` | Tổng quan số lượng đơn, shipper online, doanh thu | ✅ Đã tích hợp |
| | `/api/revenue/daily` | `GET` | Biểu đồ doanh thu 7 ngày qua | ✅ Đã tích hợp |
| | `/api/orders?limit=5` | `GET` | Bảng đơn hàng gần đây | ✅ Đã tích hợp |
| | `/api/dispatcher/status` | `GET` | Trạng thái Kafka Dispatcher Consumer | ✅ Đã tích hợp |
| | `/api/dispatcher/lag` | `GET` | Độ trễ (lag) của Dispatcher | ✅ Đã tích hợp |
| | `/api/dispatcher/trigger` | `POST` | Kích hoạt điều phối thủ công đơn hàng | ✅ Đã tích hợp |
| | `/api/dispatcher/respond` | `POST` | Mô phỏng Shipper đồng ý/từ chối đơn | ✅ Đã tích hợp |
| **Đơn hàng (Orders)** | `/api/orders` | `GET` | Danh sách đơn hàng kèm bộ lọc và phân trang | ✅ Đã tích hợp |
| | `/api/orders/{id}` | `GET` | Chi tiết đơn, bao gồm shipper, offerLogs, revenues | ✅ Đã tích hợp |
| | `/api/orders/{id}/tracking` | `GET` | Vị trí realtime của shipper đang giao | ✅ Đã tích hợp |
| | `/api/orders/{id}/trajectory` | `GET` | Lịch sử tọa độ GPS của đơn để vẽ đường đi | ✅ Đã tích hợp |
| **Shipper** | `/api/shippers` | `GET` | Danh sách toàn bộ Shippers | ✅ Đã tích hợp |
| | `/api/shippers` | `POST` | Thêm mới shipper | ✅ Đã tích hợp |
| | `/api/shippers/{id}` | `PUT` | Cập nhật thông tin shipper | ✅ Đã tích hợp |
| | `/api/shippers/{id}` | `DELETE`| Xóa shipper | ✅ Đã tích hợp |
| | `/api/shippers/{id}/status` | `PATCH` | Bật/Tắt chế độ ONLINE cho Shipper | ✅ Đã tích hợp |
| | `/api/shippers/{id}/location` | `GET` | Lấy tọa độ GPS hiện tại từ Redis Geo | ✅ Đã tích hợp |
| **Doanh thu (Revenue)** | `/api/revenue/summary` | `GET` | Thống kê tổng quan doanh thu toàn hệ thống | ✅ Đã tích hợp |
| | `/api/revenue/daily` | `GET` | Chi tiết doanh thu theo khoảng thời gian | ✅ Đã tích hợp |
| | `/api/revenue/lag` | `GET` | Độ trễ (lag) của Consumer dịch vụ Revenue | ✅ Đã tích hợp |
| | `/api/revenue/shipper/{id}`| `GET` | Thu nhập và lịch sử giao hàng của Shipper | ✅ Đã tích hợp |
