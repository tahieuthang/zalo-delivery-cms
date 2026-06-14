import axios from 'axios'
import { ElMessage } from 'element-plus'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cms_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Lỗi không xác định'
    const status = error.response?.status

    if (status === 401) {
      ElMessage.error('Phiên đăng nhập hết hạn')
    } else if (status === 403) {
      ElMessage.error('Bạn không có quyền truy cập')
    } else if (status === 404) {
      ElMessage.warning('Không tìm thấy dữ liệu')
    } else if (status && status >= 500) {
      ElMessage.error('Lỗi server: ' + message)
    } else {
      ElMessage.error(message)
    }

    return Promise.reject(error)
  }
)

export default http
