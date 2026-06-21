### PHẦN HÀNH: TÍCH HỢP TÍNH NĂNG MOCK ĐIỀU PHỐI & PHẢN HỒI SHIPPER TRÊN CMS DASHBOARD

#### 1. Bối cảnh & Mục tiêu
Chúng ta cần phát triển một bảng điều khiển giám sát điều phối ("Dispatcher Panel") trên giao diện CMS Dashboard. Bảng điều khiển này có nhiệm vụ theo dõi danh sách đơn hàng đang quét tìm tài xế (real-time bằng polling) và cung cấp các nút giả lập hành động của shipper (Chấp nhận / Từ chối đơn hàng) để phục vụ kiểm thử nhanh mà không cần thao tác qua ứng dụng Zalo thật.

---

#### 2. Các API Backend hỗ trợ (Sử dụng Axios Client có sẵn)
Tất cả các API này đã được khai báo sẵn trong `orderApi.ts` và `dispatcherApi.ts`:

1. **Lấy danh sách đơn hàng hoạt động**:
   * API: `GET /api/orders`
   * Params: `{ status: 'PENDING,WAITING_ACCEPTANCE,NO_SHIPPER', limit: 50 }`
2. **Lấy chi tiết đơn hàng (kèm lịch sử offer)**:
   * API: `GET /api/orders/{id}`
   * Dữ liệu trả về có chứa mảng `offerLogs` có cấu trúc:
     ```json
     "offerLogs": [
       {
         "id": "log-id",
         "shipperId": "shipper-id",
         "status": "PENDING | ACCEPTED | REJECTED | TIMEOUT",
         "createdAt": "2026-06-14T...",
         "shipper": {
           "id": "shipper-id",
           "name": "Nguyễn Văn An",
           "phone": "0977044573"
         }
       }
     ]
     ```
3. **Gửi phản hồi giả lập của tài xế**:
   * API: `POST /api/dispatcher/respond`
   * Body: `{ orderId: string, shipperId: string, action: 'accept' | 'reject' }`
4. **Kích hoạt lại quy trình tìm tài xế (khi đơn thất bại/không tìm thấy tài xế)**:
   * API: `POST /api/dispatcher/trigger`
   * Body: `{ orderId: string, pickupLat: number, pickupLng: number }`

---

#### 3. Đặc tả Logic xử lý trên Frontend (State & Polling)

* **Luồng Quét danh sách đơn hàng**:
  * Khi component mount, gọi API `getOrders` với filter status `PENDING,WAITING_ACCEPTANCE,NO_SHIPPER` để hiển thị danh sách đơn hàng đang hoạt động.
  * Thiết lập một `setInterval` chạy **mỗi 10 giây** để cập nhật danh sách này.
  
* **Luồng Polling chi tiết đơn hàng (Real-time update)**:
  * Với mỗi đơn hàng trong danh sách, nếu đơn hàng có trạng thái chưa hoàn thành (`PENDING` hoặc `WAITING_ACCEPTANCE`), thiết lập một tiến trình polling riêng gọi API `getOrderById` **mỗi 2 giây/lần**.
  * Cập nhật thông tin chi tiết (đặc biệt là danh sách `offerLogs`) của đơn hàng đó vào danh sách hiển thị.
  * Ngay khi đơn hàng chuyển sang trạng thái cuối cùng (ví dụ: `ASSIGNED`, `DELIVERING`, `SUCCESS`, `NO_SHIPPER`,...), **phải lập tức xóa bỏ Interval polling** của đơn hàng đó để tối ưu hóa hiệu năng và tránh spam request.
  * Đảm bảo dọn dẹp sạch sẽ tất cả các Interval timer trong hook `onBeforeUnmount`.

* **Luồng xác định Shipper đang được đề xuất**:
  * Để biết tài xế nào đang được mời (đang chờ phản hồi), viết một hàm helper: Duyệt mảng `offerLogs` của đơn hàng đó, sắp xếp theo thời gian `createdAt` mới nhất. Nếu bản ghi mới nhất có trạng thái `status === 'PENDING'`, lấy thông tin `shipper` từ bản ghi này làm tài xế đang giữ chốt.

---

#### 4. Yêu cầu thiết kế UI (Element Plus)
Thiết kế một bảng danh sách (Table) nhỏ gọn hiển thị:
1. **Mã đơn**: Dạng text thu ngắn (Ví dụ: `01KV3A6C...`).
2. **Trạng thái**: Hiển thị bằng Badge màu sắc tương ứng (`PENDING` -> Đang tìm tài xế; `WAITING_ACCEPTANCE` -> Đang chờ phản hồi; `NO_SHIPPER` -> Thất bại).
3. **Shipper Đề xuất**:
   * Nếu có tài xế PENDING: Hiển thị tên tài xế (sau khi cắt bỏ phần mô tả vị trí trong ngoặc đơn nếu có) + SĐT.
   * Nếu là `PENDING` và chưa có offer: Hiển thị hiệu ứng *"🔍 Đang quét tài xế..."*.
   * Nếu đơn hàng bị `NO_SHIPPER`: Hiển thị *"❌ Không tìm thấy shipper"*.
4. **Cột hành động**:
   * Nếu đang có tài xế chờ phản hồi (`WAITING_ACCEPTANCE`): Hiện 2 nút text/link **"Nhận ✅"** (gọi API respond với action: `accept`) và **"Từ chối ❌"** (gọi API respond với action: `reject`).
   * Nếu đơn hàng ở trạng thái `NO_SHIPPER`: Hiện nút **"⚡ Tìm lại"** (gọi API trigger để tìm lại shipper từ đầu).
   * Thêm trạng thái `loading` trên nút tương ứng khi đang gửi request.
