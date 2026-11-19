# Paper-Entry-UI — logic kéo TP / SL

Files: `entry.html` (markup) · `entry.css` (giao diện) · `entry.js` (logic) · `demo.html` (bản chạy thử, gộp cả 3 file + panel).
Mở `demo.html` bằng trình duyệt để chạy thử.

## Quy tắc kéo
1. **Tạo:** nhấn giữ ô PnL của vị thế rồi kéo ra khỏi ô PnL (cách entry ≥ 1 chiều cao tag).
   - Long: kéo lên = TP, kéo xuống = SL. Short: ngược lại.
2. **Khoá hướng:** hướng kéo đầu tiên quyết định TP hay SL và được khoá tới khi thả chuột.
   Kéo ngược sang phía bên kia entry không bao giờ tạo/đụng tới lệnh còn lại.
3. **Xoá khi line trùng:** mọi thứ tính theo *line* (không theo tag). Line của lệnh bắt đầu từ line entry và đi theo quãng chuột kéo (không phụ thuộc chỗ bạn bấm trong ô PnL).
   Khi line TP/SL kéo về trùng line entry (cách < 1 tick) hoặc vượt qua nó → lệnh bị xoá. Tag có thể chồng lên ô PnL, chưa xoá nếu line chưa trùng.
   Áp dụng cả lúc đang tạo (giữ chuột kéo ra lại thì hiện lại) và lúc dời TP/SL có sẵn.
4. **Dời:** kéo ô PnL của TP/SL để đổi giá (snap theo tick 0.25). TP luôn nằm phía lãi, SL phía lỗ, cách entry ≥ 1 tick.
5. **Huỷ:** bấm × trên tag TP/SL. Bấm × trên vị thế để đóng vị thế (xoá luôn TP/SL).

## Chỉnh theo hợp đồng
Object `C` đầu `entry.js`: `entry`, `point` ($/điểm), `qty`, `ppp` (px/điểm giá), `tick`, `pad`.

## API
`entryOverlay.setPrice(p)` · `setSide('long'|'short')` · `clearOrders()` · `setClosed(bool)`

## Về viền
`applyGrid()` / `snapY()` trong `entry.js` làm tròn kích thước và vị trí tag theo pixel màn hình thật để viền đều nhau ở mọi mức zoom.
