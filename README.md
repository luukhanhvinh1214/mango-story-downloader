# Mango Story Downloader

Extension Chrome tải video story Facebook về máy thành file mp4, do
**Vinhdeptrai** xây dựng.

Tiện ích dùng chính tài khoản Facebook bạn đang đăng nhập. Mọi thứ chạy trên
máy bạn, không có máy chủ ngoài, không thu thập dữ liệu.

## Chức năng

- Tải story video đang xem về máy thành file mp4, có cả hình lẫn tiếng.
- Lấy bản nét nhất Facebook có, tới 1080p. Bản 1080p được Facebook tách riêng
  hình và tiếng, tiện ích tự ghép lại ngay trên máy bạn.
- Tải đúng thẻ story đang hiện trên màn hình, kể cả khi người đăng có nhiều
  story nối nhau.
- Xem story mà không hiện tên trong danh sách người xem. Luôn bật khi tiện ích
  đang chạy.
- Tải xong thì tự đóng story, đưa bạn về trang chủ Facebook.

## Cài đặt

Chưa lên Chrome Web Store, nạp thủ công:

```bash
git clone https://github.com/luukhanhvinh1214/mango-story-downloader.git
```

1. Mở `chrome://extensions`
2. Bật **Chế độ dành cho nhà phát triển** (góc trên bên phải)
3. Bấm **Tải tiện ích đã giải nén** và chọn thư mục vừa clone
4. Tải lại các tab Facebook đang mở

## Sử dụng

1. Mở một story video trên Facebook.
2. Bấm vào icon tiện ích trên thanh công cụ.
3. Bấm **Tải video**. File mp4 lưu vào thư mục Tải xuống của Chrome, popup báo
   độ nét của bản đang tải, ví dụ 1080p. Bản cần ghép mất thêm vài giây.
4. Tải xong, story tự đóng. Muốn tải tiếp thẻ khác của cùng người thì mở lại
   story đó.

Story cũ của chính bạn nằm trong **Kho lưu trữ tin**: mở `facebook.com/stories`,
bấm **Kho lưu trữ** ở góc trên bên trái, chọn một story rồi làm như trên.

## Giới hạn

- Chỉ tải được story video. Story ảnh và story chữ chưa hỗ trợ.
- Bản ghép 1080p dùng chuẩn nén VP9. Chrome và VLC phát được ngay; trình phát
  có sẵn của Windows cần gói **VP9 Video Extensions** từ Microsoft Store. Máy
  nào không mở được thì tắt **Tải bản 1080p khi có** trong popup, tiện ích sẽ
  lấy bản 720p H.264 phát được ở mọi nơi.
- Story trong kho lưu trữ chỉ còn bản 360p. Facebook không giữ bản nét hơn cho
  story cũ, nên tiện ích cũng không lấy được.
- Story của người khác đã quá 24 giờ hoặc bị xoá thì không tải được.
- Bạn chỉ tải được story mà tài khoản của bạn xem được.
- Tải lại trang thì story bạn đã xem vẫn hiện là thẻ mới, vì Facebook không
  được báo là bạn đã xem.
- Nếu Chrome hỏi nơi lưu file và bạn để hộp thoại mở quá lâu, story có thể
  không tự đóng. File vẫn tải bình thường.
- Facebook đổi cách tải dữ liệu thì tiện ích có thể ngừng chạy cho tới khi được
  cập nhật.

Story là nội dung của người khác. Chỉ giữ lại những gì bạn được phép giữ, và
hỏi người đăng trước khi đăng lại ở nơi khác.

---

## Tác giả

Dự án được xây dựng và phát triển bởi **Lưu Khánh Vinh** (**Vinhdeptrai**).

- GitHub: [@luukhanhvinh1214](https://github.com/luukhanhvinh1214)
