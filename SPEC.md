# 📋 SPEC — Zalo Delivery CMS Admin Panel

> **Tech Stack:** Vue 3 (Composition API) · TypeScript · TailwindCSS · Element Plus  
> **Backend:** ExpressJS + Kafka + Redis + PostgreSQL (Prisma)  
> **Version:** 1.0.0 · Created: 2026-06-14

---

## 1. Tổng quan hệ thống

CMS quản trị nội bộ cho hệ thống **Zalo Delivery** — nền tảng giao đồ ăn tích hợp Zalo OA. Ứng dụng cho phép admin/operator giám sát đơn hàng realtime, tracking shipper trên bản đồ, quản lý doanh thu và can thiệp vận hành.

---

## 2. Phân tích API Backend (từ swagger.json)

### 2.1 API Endpoints theo Module

| Module | Method | Endpoint | Mô tả |
|--------|--------|----------|--------|
| **Order** | `GET` | `/api/orders` | Danh sách đơn (filter status, shipperId, date range, pagination) |
| | `POST` | `/api/orders` | Tạo đơn thủ công |
| | `GET` | `/api/orders/{id}` | Chi tiết đơn (shipper, trajectory, revenue, offerLogs) |
| **Tracking** | `GET` | `/api/orders/{id}/tracking` | Vị trí realtime shipper (chỉ ASSIGNED/DELIVERING) |
| | `GET` | `/api/orders/{id}/trajectory` | Lịch sử GPS points (map replay) |
| **Shipper** | `GET` | `/api/shippers` | Danh sách shipper |
| | `POST` | `/api/shippers` | Tạo shipper |
| | `GET/PUT/DELETE` | `/api/shippers/{id}` | CRUD shipper |
| | `PATCH` | `/api/shippers/{id}/status` | Toggle ONLINE/OFFLINE |
| | `GET` | `/api/shippers/{id}/location` | Vị trí live từ Redis Geo |
| **Revenue** | `GET` | `/api/revenue/summary` | Tổng doanh thu hệ thống |
| | `GET` | `/api/revenue/daily` | Doanh thu theo ngày (filter date range) |
| | `GET` | `/api/revenue/shipper/{id}` | Thu nhập shipper |
| | `GET` | `/api/revenue/lag` | Consumer lag report |
| **Dashboard** | `GET` | `/api/dashboard/summary` | Metrics tổng hợp (orders by status, shippers, revenue) |
| **Dispatcher** | `GET` | `/api/dispatcher/status` | Trạng thái Kafka consumer |
| | `GET` | `/api/dispatcher/lag` | Consumer lag |
| | `POST` | `/api/dispatcher/trigger` | Trigger dispatch thủ công |
| | `POST` | `/api/dispatcher/respond` | Shipper accept/reject |

### 2.2 Data Models (từ Prisma Schema)

| Model | Key Fields |
|-------|-----------|
| **Order** | id, customerId, pickupAddress/Lat/Lng, deliveryAddress/Lat/Lng, status (enum 7 states), shipperId, note, completedAt |
| **Shipper** | id, name, phone, zaloUserId, vehicleType (BIKE/MOTORCYCLE/TRUCK), status (ONLINE/OFFLINE/BUSY), totalEarnings |
| **TrajectoryPoint** | orderId, shipperId, lat, lng, createdAt |
| **RevenueRecord** | orderId, shipperId, amount, type, completedAt |
| **OrderOfferLog** | orderId, shipperId, status (PENDING/ACCEPTED/REJECTED/TIMEOUT) |
| **MessageLog** | messageId, senderId, rawText, parsedOk, orderId, parseError |

### 2.3 Order Status Flow

```
PENDING → WAITING_ACCEPTANCE → ASSIGNED → DELIVERING → SUCCESS
                ↓                                        ↓
           NO_SHIPPER                                  FAILED
```

---

## 3. Kiến trúc Frontend

### 3.1 Project Structure

```
src/
├── api/                    # API Client layer
│   ├── http.ts             # Axios instance + interceptors
│   ├── orderApi.ts         # Order endpoints
│   ├── shipperApi.ts       # Shipper endpoints
│   ├── revenueApi.ts       # Revenue endpoints
│   ├── trackingApi.ts      # Tracking endpoints
│   ├── dashboardApi.ts     # Dashboard endpoints
│   └── dispatcherApi.ts    # Dispatcher endpoints
├── types/                  # TypeScript interfaces
│   ├── order.ts
│   ├── shipper.ts
│   ├── revenue.ts
│   └── common.ts           # Pagination, ApiResponse, etc.
├── composables/            # Vue composables (hooks)
│   ├── useOrders.ts
│   ├── useOrderDetail.ts
│   ├── useLiveTracking.ts
│   ├── useNotifications.ts
│   └── useDashboard.ts
├── stores/                 # Pinia stores
│   ├── orderStore.ts
│   ├── notificationStore.ts
│   └── appStore.ts
├── views/                  # Page components
│   ├── DashboardView.vue
│   ├── OrderListView.vue
│   ├── ShipperListView.vue
│   └── RevenueView.vue
├── components/
│   ├── layout/
│   │   ├── AppLayout.vue       # Sidebar + Header + Content
│   │   ├── AppSidebar.vue
│   │   └── AppHeader.vue       # Chứa notification bell icon
│   ├── order/
│   │   ├── OrderTable.vue
│   │   ├── OrderFilterBar.vue
│   │   ├── OrderDrawer.vue         # Slide-over drawer chính
│   │   ├── OrderLiveTrackingTab.vue # Tab 1: Map + Info
│   │   ├── OrderItemsTab.vue       # Tab 2: Chi tiết món ăn
│   │   └── OrderLogsTab.vue        # Tab 3: System logs
│   ├── map/
│   │   ├── LiveMap.vue             # Leaflet/Mapbox map
│   │   └── RadarPulse.vue          # CSS animation overlay
│   ├── notification/
│   │   └── NotificationBell.vue
│   └── dashboard/
│       ├── StatsCards.vue
│       └── RevenueChart.vue
├── router/
│   └── index.ts
├── App.vue
└── main.ts
```

### 3.2 API Client Layer

```typescript
// api/http.ts - Axios instance
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor: attach auth token
// Response interceptor: normalize errors, handle 401
```

---

## 4. Chi tiết các Trang

### 4.1 Dashboard (`/`)

| Thành phần | Mô tả | API |
|-----------|-------|-----|
| **Stats Cards** | 4-6 card: Tổng đơn, Đang giao, Chờ xử lý, Shipper online, Doanh thu hôm nay | `GET /api/dashboard/summary` |
| **Revenue Chart** | Biểu đồ doanh thu 7/30 ngày (line/bar chart) | `GET /api/revenue/daily` |
| **Order Status Pie** | Pie chart phân bố trạng thái đơn | Từ dashboard summary |
| **Recent Orders** | 5 đơn mới nhất | `GET /api/orders?limit=5` |
| **System Health** | Status Kafka dispatcher, consumer lag | `GET /api/dispatcher/status` + `/lag` |

> **Thư viện chart đề xuất:** ECharts (vue-echarts) hoặc Chart.js

### 4.2 Danh sách đơn hàng (`/orders`)

**Filter Bar (OrderFilterBar.vue):**
- Dropdown status (multi-select): PENDING, WAITING_ACCEPTANCE, ASSIGNED, DELIVERING, SUCCESS, FAILED, NO_SHIPPER
- Date range picker (from/to)
- Input shipperId
- Nút "Tìm kiếm" + "Reset"

**Order Table (OrderTable.vue):**

| Column | Field |
|--------|-------|
| Mã đơn | `id` (truncated, copy-able) |
| Khách hàng | `customerId` |
| Địa chỉ lấy | `pickupAddress` |
| Địa chỉ giao | `deliveryAddress` |
| Trạng thái | `status` → El-Tag color-coded |
| Shipper | `shipper.name` |
| Thời gian | `createdAt` |
| Hành động | Nút "Xem" → mở Drawer |

- **Pagination:** Element Plus el-pagination (page + limit)
- **Auto-refresh:** Polling mỗi 10s hoặc WebSocket
- **Row click** → Mở OrderDrawer

### 4.3 Order Detail Drawer (`OrderDrawer.vue`)

> Slide-over từ cạnh phải, width ~65-70vw, overlay backdrop mờ

**3 Tabs (Element Plus `el-tabs`):**

#### Tab 1: Giám sát Realtime (mặc định)

Layout: **Chia dọc 60% Map / 40% Info** (responsive 50/50 trên màn nhỏ)

**Nửa trái — Live Map:**

| Trạng thái đơn | Hiển thị trên Map |
|----------------|-------------------|
| `DELIVERING` / `ASSIGNED` | Marker Shop (📍đỏ) + Marker Khách (📍xanh) + Marker Shipper (🛵 animate di chuyển). Polyline trajectory. Polling `GET /api/orders/{id}/tracking` mỗi 3s |
| `SUCCESS` | Marker Shop + Marker Khách + Marker Shipper đứng im tại vị trí khách. Badge "Đã giao ✓" |
| `PENDING` / `NO_SHIPPER` | Marker Shop + **Radar Pulse Animation** (vòng tròn gợn sóng CSS) tại vị trí shop, text "Đang tìm tài xế..." |
| `FAILED` | Marker Shop + Marker Khách + Icon ✗ đỏ |

**Nửa phải — Thông tin nhanh:**
- Card Shipper: Avatar, Tên, SĐT, Xe, Trạng thái → Nút 📞 Gọi
- Card Khách hàng: Tên (customerId), SĐT, Địa chỉ giao → Nút 📞 Gọi
- **Nút hủy đơn khẩn cấp** (el-button type="danger") — xác nhận qua el-dialog
- Timeline trạng thái đơn (el-timeline)

#### Tab 2: Chi tiết đơn hàng (100% width)

- Bảng danh sách món ăn: Tên món, Số lượng, Đơn giá, Thành tiền
- Tổng bill, Phí ship, VAT, Tổng thanh toán
- Ghi chú khách hàng (`note`)
- Lịch sử hóa đơn / Revenue records

> ⚠️ **Lưu ý:** API hiện tại chưa có endpoint trả về order items (món ăn). Xem [Mục 7 - Câu hỏi](#7-câu-hỏi-cần-làm-rõ).

#### Tab 3: Nhật ký hệ thống (100% width)

- **Offer Logs:** Bảng lịch sử điều phối (OrderOfferLog) — Shipper nào được offer, accept/reject/timeout
- **Message Logs:** Lịch sử tin nhắn Zalo liên quan đến order
- **Trajectory timeline:** Số GPS points đã ghi, thời gian bắt đầu → kết thúc

### 4.4 Quản lý Shipper (`/shippers`)

- CRUD table + dialog tạo/sửa shipper
- Toggle status ONLINE/OFFLINE
- Xem vị trí live trên map
- Xem thu nhập shipper

### 4.5 Thống kê Doanh thu (`/revenue`)

- Revenue summary cards
- Daily revenue chart (filter date range)
- Bảng chi tiết theo shipper

---

## 5. Realtime & Notifications

### 5.1 Notification Bell (Header)

| Feature | Mô tả |
|---------|-------|
| **Icon** | 🔔 Badge đỏ hiển thị số thông báo chưa đọc |
| **Dropdown** | Popover danh sách notifications mới nhất |
| **Loại thông báo** | Đơn mới tạo, Đơn không tìm được shipper, Đơn hoàn thành, Đơn thất bại |
| **Âm thanh** | Notification sound cho đơn mới |

### 5.2 Cơ chế Realtime

**Phương án đề xuất (ưu tiên):**

| Phương án | Ưu điểm | Nhược điểm |
|-----------|---------|-----------|
| **Polling** (MVP) | Đơn giản, không cần sửa backend | Delay 3-10s, tốn bandwidth |
| **SSE** (Server-Sent Events) | One-way push, đơn giản | Cần thêm endpoint backend |
| **WebSocket** (Socket.IO) | Bi-directional, realtime thực sự | Cần thêm backend module |

> **Đề xuất:** Bắt đầu với **Polling** cho MVP, sau đó nâng cấp lên **WebSocket/SSE** khi backend sẵn sàng.

---

## 6. Bản đồ (Map Library)

| Thư viện | Đề xuất |
|----------|---------|
| **Leaflet + OpenStreetMap** | ✅ Miễn phí, nhẹ, dễ tích hợp Vue |
| Mapbox GL JS | Đẹp hơn nhưng cần API key, giới hạn free tier |
| Google Maps | Tốn phí, cần billing account |

> **Đề xuất:** Dùng **Leaflet** (`@vue-leaflet/vue-leaflet`) + OpenStreetMap tiles (miễn phí hoàn toàn).

### Radar Pulse Animation (CSS)

```css
/* Vòng tròn gợn sóng cho trạng thái "Đang tìm shipper" */
.radar-pulse {
  position: absolute;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.3);
  animation: pulse-ring 2s ease-out infinite;
}
@keyframes pulse-ring {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(3); opacity: 0; }
}
```

---

## 7. Câu hỏi cần làm rõ

> [!IMPORTANT]
> Các câu hỏi dưới đây cần bạn trả lời để SPEC được hoàn thiện trước khi bắt đầu code.

### 🔴 Quan trọng — Thiếu API

1. **Order Items (Món ăn):** API hiện tại **không có** endpoint trả về danh sách món ăn, giá tiền, số lượng cho mỗi đơn. Tab 2 (Chi tiết đơn hàng) cần data này. Bạn muốn:
   - (a) Bổ sung API endpoint backend `GET /api/orders/{id}/items`?
   - (b) Dùng mock data tạm thời?
   - (c) Bỏ qua tab này trong MVP?

2. **Hủy đơn khẩn cấp:** Chưa có API `PATCH /api/orders/{id}/cancel`. Cần bổ sung backend?

3. **System Logs / Audit Trail:** Chưa có endpoint lấy log hệ thống cho order. Bạn muốn tạo `GET /api/orders/{id}/logs`?

4. **Thông tin khách hàng:** API chỉ trả về `customerId` (string). Không có endpoint lấy tên/SĐT khách hàng. Data khách hàng lấy từ đâu?

### 🟡 Cần quyết định

5. **Authentication:** CMS cần đăng nhập không? Nếu có:
   - Login page (email/password)?
   - SSO/OAuth (Google, Zalo)?
   - Role-based access (Admin, Operator, Viewer)?

6. **Realtime mechanism:** Bạn muốn dùng Polling (MVP nhanh), SSE hay WebSocket cho notification + live tracking?

7. **Map provider:** Leaflet/OSM (free), Mapbox, hay Google Maps?

8. **Ngôn ngữ giao diện:** Tiếng Việt, Tiếng Anh, hay hỗ trợ i18n cả hai?

9. **Dark mode:** Có cần hỗ trợ chuyển đổi Light/Dark theme không?

### 🟢 Nice-to-have

10. **Export data:** Cần xuất báo cáo (Excel/CSV) cho orders, revenue không?

11. **Quản lý Webhook/Zalo OA:** Cần trang cấu hình Zalo OA settings không?

12. **Responsive / Mobile:** CMS chỉ dùng trên desktop hay cần responsive cho tablet?

---

## 8. Roadmap đề xuất

| Phase | Scope | Thời gian |
|-------|-------|-----------|
| **Phase 1 — MVP** | Setup project, API client, Order list + Drawer (3 tabs), Dashboard cơ bản, Notification polling | 1-2 tuần |
| **Phase 2 — Full** | Shipper management, Revenue page, Charts, Map replay trajectory | 1 tuần |
| **Phase 3 — Polish** | WebSocket realtime, Dark mode, Export, Auth/RBAC, i18n | 1 tuần |

---

## 9. Dependencies dự kiến

```json
{
  "dependencies": {
    "vue": "^3.5",
    "vue-router": "^4.x",
    "pinia": "^2.x",
    "element-plus": "^2.9",
    "axios": "^1.x",
    "@vue-leaflet/vue-leaflet": "^0.10",
    "leaflet": "^1.9",
    "echarts": "^5.x",
    "vue-echarts": "^7.x",
    "dayjs": "^1.11"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tailwindcss": "^3.4",
    "autoprefixer": "^10.x",
    "postcss": "^8.x",
    "@types/leaflet": "^1.x"
  }
}
```
