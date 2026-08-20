# Feature Specification: Đối ứng đa engine + điều hướng theo cấp

**Feature Branch**: `001-multi-engine-navigation`
**Created**: 2026-08-20
**Status**: Draft
**Input**: User description: "lên kế hoạch đối ứng cho các hệ quản trị cơ sở dữ liệu chưa được implement. sau đó đồng nhất flow hoạt động trên màn hình thay vì hiển thị toàn bộ 1 lúc như hiện tại, ví dụ như khi init thì bên trái chỉ hiển thị các tên connection -> nhấn vô thì xổ ra danh sách các table/view/function,... , nhấn vô đối tượng bên menu bên trái thì hiển thị tương ứng bên phải,..."

## Vì sao hai việc này nằm trong CÙNG một feature

Hai yêu cầu trông rời nhau nhưng gặp nhau ở đúng một điểm: **cây điều hướng hiện đang cứng
theo hình dạng của cơ sở dữ liệu quan hệ.** Nó chỉ biết hai loại đối tượng (bảng, view) và
luôn giả định có tầng schema.

MongoDB không có bảng — nó có collection. Redis không có cả bảng lẫn schema — nó có khoá.
Nếu thêm hai engine đó vào cây hiện tại, hoặc phải rẽ nhánh theo tên engine ở tầng giao diện
(điều mà kiến trúc dự án cấm), hoặc phải thiết kế lại màn hình lần thứ hai.

Vì vậy: **làm luồng điều hướng trung lập engine TRƯỚC, rồi bốn engine còn lại chỉ là dữ liệu
khai báo thêm, không phải thiết kế lại.** Ngược lại thì mỗi engine mới là một lần sửa UI.

## Trạng thái hiện tại (đã kiểm bằng lệnh, không phải phỏng đoán)

| Điểm | Hiện trạng |
|---|---|
| Engine kết nối thật | PostgreSQL, MySQL/MariaDB, SQLite (3/7) |
| Engine chưa có | SQL Server, Oracle, MongoDB, Redis (4/7) — đã có mã trong danh sách engine và có icon trong giao diện, nên người dùng **thấy** chúng trong dropdown nhưng chọn vào thì không kết nối được |
| Cây điều hướng | đã nạp lười (chỉ nhánh đang mở mới truy vấn), nhưng **chỉ có 2 nhóm đối tượng: Tables và Views** — không có Functions, Procedures, Triggers, Indexes, Sequences |
| Trạng thái khởi động | mở app là đã có hai nhánh bung sẵn và một bảng được chọn sẵn, nhưng chúng trỏ tới tên của bộ dữ liệu mẫu cũ — trên workspace thật thì vừa không mở đúng nhánh nào, vừa không ở trạng thái sạch |
| Liên kết trái ↔ phải | có một phần: chọn bảng hoặc view thì chuyển sang màn dữ liệu, chọn nhóm hoặc namespace thì về màn danh sách. Nhưng chỉ đúng hai loại đó có đường đi; các loại khác không dẫn tới đâu |
| Vùng bên phải | 8 màn hình chọn bằng menu, **độc lập với đối tượng đang chọn** — mở được màn "Thiết kế bảng" trong khi đang chọn một view, hoặc màn "Sao lưu" trong khi engine không hỗ trợ sao lưu |

Đây chính là "hiển thị toàn bộ một lúc" mà yêu cầu nói tới: màn hình phơi mọi năng lực cùng
lúc thay vì phơi những gì hợp với thứ người dùng đang chọn.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mở app thấy đúng danh sách kết nối, không gì khác (Priority: P1)

Người dùng mở Corvus. Vùng bên trái chỉ liệt kê tên các kết nối đã lưu, mỗi dòng kèm dấu hiệu
engine và trạng thái. Chưa có kết nối nào được mở, chưa có truy vấn nào được gửi tới bất kỳ
database nào. Vùng bên phải hiện trạng thái chào — không phải một bảng dữ liệu ngẫu nhiên.

**Why this priority**: Đây là điều đầu tiên người dùng thấy và là gốc của toàn bộ luồng. Nó
cũng là điều kiện an toàn: mở app KHÔNG được tự kết nối tới database production và tự chạy
truy vấn khi người dùng chưa yêu cầu.

**Independent Test**: Mở app với 3 kết nối đã lưu (một trong đó trỏ tới host không tồn tại).
Đếm số truy vấn gửi đi = 0. Vùng trái có đúng 3 dòng, không dòng nào bung sẵn.

**Acceptance Scenarios**:

1. **Given** workspace có 3 kết nối đã lưu, **When** mở app, **Then** vùng trái hiện đúng 3
   dòng ở cấp một, tất cả đều đóng, và không có truy vấn nào được gửi tới database.
2. **Given** workspace chưa có kết nối nào, **When** mở app, **Then** vùng trái hiện trạng
   thái rỗng kèm hành động "Tạo kết nối", không phải một cây trống không giải thích gì.
3. **Given** một kết nối trỏ tới host không tồn tại, **When** mở app, **Then** dòng đó vẫn
   hiện bình thường và **không** báo lỗi — lỗi chỉ xuất hiện khi người dùng thật sự mở nó.

---

### User Story 2 - Bung dần từng cấp, mỗi lần bung chỉ nạp đúng cấp đó (Priority: P1)

Người dùng nhấn vào một kết nối → nó mở ra và hiện các database. Nhấn vào một database → hiện
các namespace (schema) nếu engine có tầng đó, hoặc hiện thẳng các nhóm đối tượng nếu không.
Nhấn vào một nhóm → hiện danh sách đối tượng trong nhóm đó.

**Why this priority**: Đây là hành vi mà yêu cầu mô tả trực tiếp, và là điều kiện để làm việc
được với database lớn: không ai chờ nạp 5 000 bảng của 40 schema chỉ để mở một bảng.

**Independent Test**: Mở một kết nối PostgreSQL có 3 database. Đếm số lần truy vấn đúng bằng
số nhánh đã bung, không nhiều hơn. Bung một nhóm có 5 000 bảng và đo thời gian tới lúc danh
sách hiện ra.

**Acceptance Scenarios**:

1. **Given** một kết nối đang đóng, **When** nhấn vào nó, **Then** hiện danh sách database và
   **chỉ** database — chưa nạp schema hay bảng của bất kỳ database nào.
2. **Given** engine không có tầng namespace (ví dụ SQLite, MySQL), **When** bung một database,
   **Then** hiện thẳng các nhóm đối tượng, **không** hiện một tầng namespace rỗng hay lặp lại
   tên database.
3. **Given** một nhánh đang nạp, **When** người dùng chờ, **Then** nhánh đó hiện chỉ báo đang
   nạp tại chỗ và phần còn lại của cây vẫn dùng được.
4. **Given** một nhánh nạp lỗi, **When** lỗi trả về, **Then** lỗi hiện tại chính nhánh đó kèm
   cách thử lại, và **không** làm sập hay xoá phần cây đã nạp được.
5. **Given** một nhánh đã bung rồi đóng lại, **When** bung lại, **Then** không nạp lại từ đầu
   trong cùng phiên trừ khi người dùng yêu cầu làm mới.

---

### User Story 3 - Chọn đối tượng bên trái, bên phải hiện đúng thứ tương ứng (Priority: P1)

Người dùng nhấn vào một bảng → bên phải hiện dữ liệu của bảng đó. Nhấn vào một view → hiện dữ
liệu của view. Nhấn vào một function/procedure → hiện định nghĩa của nó. Nhấn vào một nhóm →
hiện danh sách đối tượng trong nhóm. Không phải chọn thủ công màn hình nào ở menu.

**Why this priority**: Đây là nửa còn lại của yêu cầu và là thứ biến hai vùng rời rạc thành
một luồng. Hiện tại chỉ 2 trong nhiều loại đối tượng có đường đi tới vùng bên phải.

**Independent Test**: Với mỗi loại đối tượng mà engine hỗ trợ, nhấn vào một thực thể và kiểm
vùng bên phải hiện đúng loại nội dung đã khai. Không loại nào rơi vào trạng thái trắng.

**Acceptance Scenarios**:

1. **Given** một bảng trong cây, **When** nhấn vào, **Then** bên phải hiện dữ liệu của **đúng**
   bảng đó, kèm đường dẫn đầy đủ (kết nối › database › namespace › bảng) để người dùng biết
   mình đang ở đâu.
2. **Given** hai bảng TRÙNG TÊN ở hai namespace khác nhau, **When** nhấn lần lượt, **Then** hai
   lần cho ra hai nội dung khác nhau và cây không mở/đóng đồng thời hai nhánh.
3. **Given** một loại đối tượng không có màn hình nội dung riêng, **When** nhấn vào, **Then**
   hiện thông tin và định nghĩa của nó, **không** hiện màn hình trắng.
4. **Given** đang chọn một view, **When** người dùng mở danh sách hành động, **Then** những
   hành động chỉ áp cho bảng không xuất hiện (hoặc hiện rõ là không dùng được), thay vì cho
   bấm rồi báo lỗi.
5. **Given** một đối tượng đang mở bên phải bị người khác xoá trên server, **When** người dùng
   làm mới, **Then** hiện thông báo đối tượng không còn tồn tại và đề nghị làm mới cây — không
   hiện dữ liệu cũ như thể vẫn đúng.
6. **Given** đang mở bảng A, **When** chọn bảng B, **Then** B mở ở một tab MỚI và tab của A vẫn
   còn nguyên.
7. **Given** bảng A đã có tab đang mở, **When** chọn lại A trong cây, **Then** hệ thống
   **chuyển tiêu điểm** về tab cũ của A, KHÔNG mở tab thứ hai cho cùng một đối tượng.
8. **Given** hai bảng trùng tên ở hai namespace khác nhau, **When** chọn lần lượt cả hai,
   **Then** có ĐÚNG hai tab — chúng là hai đối tượng khác nhau dù cùng tên.

---

### User Story 4 - Mỗi đối tượng đúng một tab, chọn lại thì về tab cũ (Priority: P1)

Vùng bên phải quản lý các tab theo **danh tính đối tượng**. Chọn một đối tượng chưa có tab thì
mở tab mới. Chọn một đối tượng đã có tab thì chuyển tiêu điểm về tab đó, không nhân bản. Danh
tính gồm cả loại và đường dẫn đầy đủ, nên `bán_hàng.đơn_hàng` và `kho.đơn_hàng` là hai tab, và
"dữ liệu của bảng X" khác "thiết kế của bảng X".

**Why this priority**: Đây là quy tắc quyết định người dùng có so sánh được hai đối tượng cạnh
nhau hay không, và là thứ ngăn màn hình ngập tab trùng lặp sau mười phút làm việc. Không có nó
thì luồng ở US3 chỉ chạy được cho một đối tượng tại một thời điểm.

**Independent Test**: Chọn 5 đối tượng khác nhau → đếm đúng 5 tab. Chọn lại lần lượt 5 đối
tượng đó → vẫn đúng 5 tab, và tiêu điểm nhảy đúng tab tương ứng mỗi lần.

**Acceptance Scenarios**:

1. **Given** chưa có tab nào, **When** chọn một bảng, **Then** mở đúng 1 tab và nó được tiêu điểm.
2. **Given** đã có tab của bảng A, **When** chọn A lần nữa từ cây, **Then** số tab KHÔNG tăng và
   tiêu điểm về tab A.
3. **Given** đang mở tab dữ liệu của bảng A, **When** mở phần thiết kế của cùng bảng A, **Then**
   đó là một tab riêng — cùng đối tượng nhưng khác loại nội dung.
4. **Given** nhiều tab đang mở, **When** người dùng đóng một tab, **Then** các tab còn lại giữ
   nguyên trạng thái của chúng (vị trí cuộn, bộ lọc, nội dung chưa lưu).
5. **Given** một tab có nội dung chưa lưu, **When** người dùng đóng nó, **Then** hệ thống hỏi
   trước khi mất dữ liệu.
6. **Given** đối tượng của một tab bị xoá trên server, **When** người dùng làm mới, **Then** tab
   đó báo đối tượng không còn tồn tại thay vì tự đóng lặng lẽ.

---

### User Story 5 - Cây chỉ hiện những nhóm mà engine thật sự có (Priority: P2)

Nhóm đối tượng trong cây được suy ra từ năng lực của engine và của phiên bản server đang kết
nối, không phải một danh sách cố định. SQLite không có stored procedure thì không có nhánh
"Procedures". PostgreSQL 10 không có procedure thì cũng không có, dù PostgreSQL 11 thì có.

**Why this priority**: Đây là điều kiện để bốn engine còn lại cắm vào mà không sửa giao diện.
Nó cũng sửa một lời hứa rỗng đang tồn tại: hệ thống khai có trigger và index nhưng danh sách
đối tượng chưa từng trả về hai loại đó.

**Independent Test**: Kết nối lần lượt tới 3 engine hiện có, so danh sách nhóm hiện ra với
bảng năng lực đã khai. Mỗi nhóm được khai "có" phải liệt kê được; mỗi nhóm khai "không" phải
vắng mặt.

**Acceptance Scenarios**:

1. **Given** engine khai có trigger, **When** bung một database có trigger, **Then** nhánh
   Triggers xuất hiện và liệt kê đúng các trigger đó.
2. **Given** engine khai KHÔNG có stored procedure, **When** bung một database, **Then** không
   có nhánh Procedures nào — không phải một nhánh rỗng.
3. **Given** một nhóm được khai "có" nhưng thực tế không liệt kê được, **When** chạy bộ kiểm
   tự động, **Then** bộ kiểm BÁO LỖI — khai năng lực và hiện thực phải khớp nhau.

---

### User Story 6 - Công cụ không gắn với đối tượng vẫn mở được độc lập (Priority: P2)

Trình soạn SQL, sao lưu, tác vụ nền, so sánh, theo dõi — những thứ không thuộc về một đối
tượng cụ thể — mở được bất kể đang chọn gì, và giữ được nhiều phiên song song.

**Why this priority**: Nếu tất cả đều bị điều khiển bởi lựa chọn bên trái thì người dùng mất
khả năng viết một câu SQL tự do — chức năng dùng nhiều nhất của một công cụ database.

**Independent Test**: Mở trình soạn SQL khi chưa chọn đối tượng nào; mở thêm một cái thứ hai;
chọn một bảng bên trái và kiểm hai phiên SQL vẫn còn nguyên nội dung.

**Acceptance Scenarios**:

1. **Given** chưa chọn đối tượng nào, **When** mở trình soạn SQL, **Then** nó mở được và biết
   đang gắn với kết nối/database nào (hoặc yêu cầu chọn nếu chưa rõ).
2. **Given** đang có một phiên soạn SQL với nội dung chưa lưu, **When** người dùng chọn một
   bảng khác bên trái, **Then** nội dung đó **không bị mất**.
3. **Given** engine không hỗ trợ theo dõi tiến trình, **When** người dùng tìm công cụ đó,
   **Then** nó không được chào mời cho kết nối đó.

---

### User Story 7 - SQL Server kết nối thật, có môi trường Docker kiểm được (Priority: P2)

SQL Server trở thành engine thật thứ tư. Người dùng tạo kết nối tới một SQL Server chạy trong
Docker, mở cây thấy đủ ba cấp (database › namespace › nhóm), chọn một bảng thấy dữ liệu thật.
Kèm theo là một môi trường Docker dựng được bằng một lệnh, để bất kỳ ai cũng kiểm lại được.

**Why this priority**: SQL Server là engine ĐẦU TIÊN dùng đủ ba cấp phân tầng. Nó là phép thử
thật cho luồng ở US2: nếu chỗ nào trong màn hình đang ngầm giả định chỉ hai cấp, SQL Server sẽ
làm lộ ra — trước khi ta tốn công cho ba engine còn lại. Đặc tả trên giấy không làm được việc đó.

**Independent Test**: Dựng container bằng lệnh đã ghi trong tài liệu, tạo kết nối, mở cây tới
một bảng và đọc dữ liệu. Bộ kiểm định driver chạy được không cần thao tác tay.

**Acceptance Scenarios**:

1. **Given** một SQL Server trong Docker, **When** tạo kết nối và mở, **Then** cây hiện đủ ba
   cấp và mở tới bảng đọc được dữ liệu thật.
2. **Given** một database có nhiều namespace, **When** bung database, **Then** các namespace
   hiện thành một cấp riêng — KHÔNG bị gộp hay bỏ qua.
3. **Given** môi trường Docker, **When** người khác dựng lại theo tài liệu, **Then** bộ kiểm
   định driver chạy tới cùng và báo rõ nhóm nào không áp dụng được cùng LÝ DO.
4. **Given** một kết nối SQL Server, **When** xem năng lực, **Then** những gì engine không hỗ
   trợ được khai đúng là không hỗ trợ, không khai khống.

---

### User Story 8 - Ba engine còn lại có đường đi rõ ràng trong cùng luồng (Priority: P3)

Với Oracle, MongoDB và Redis, tài liệu đặc tả nói rõ: cây hiện những cấp nào, nhóm đối tượng
nào, chọn vào thì bên phải hiện gì, và những gì engine đó **không** làm được. Nhờ vậy khi
driver được viết, phần giao diện chỉ là khai báo thêm dữ liệu.

Ba engine này chỉ đặc tả, không hiện thực trong feature này — SQL Server (US7) đã đóng vai phép
thử chạy thật cho luồng.

**Why this priority**: Đây là phần "lên kế hoạch" của yêu cầu. Nó không tự sinh ra giá trị cho
người dùng cuối, nhưng nó là thứ quyết định bốn engine sau có tốn một lần thiết kế lại hay không.

**Independent Test**: Với mỗi engine trong ba engine, đọc đặc tả và trả lời được 4 câu: cây có
mấy cấp? nhóm nào? chọn vào hiện gì? không làm được gì? Nếu câu nào không trả lời được thì đặc
tả chưa xong.

**Acceptance Scenarios**:

1. **Given** đặc tả của Oracle, **When** đọc, **Then** thấy rõ namespace của nó chính là user,
   và thấy ràng buộc định danh mặc định là CHỮ HOA — khai sai chỗ này thì mọi lần mở bảng đều
   báo không tìm thấy.
2. **Given** đặc tả của MongoDB, **When** đọc, **Then** thấy cấp "collection" thay cho "bảng",
   và thấy yêu cầu bắt buộc: cấu trúc tài liệu là **suy luận từ mẫu**, giao diện phải gắn nhãn
   nói rõ điều đó cùng số tài liệu đã lấy mẫu.
3. **Given** đặc tả của Redis, **When** đọc, **Then** thấy nó không có cấp namespace lẫn nhóm
   đối tượng kiểu bảng, mà có duyệt khoá theo lô, và thấy ràng buộc an toàn: duyệt khoá không
   được làm treo dịch vụ đang chạy của khách hàng.
4. **Given** một engine chưa có driver, **When** người dùng chọn nó khi tạo kết nối, **Then**
   hệ thống nói rõ "chưa hỗ trợ" **trước khi** người dùng nhập mật khẩu, chứ không để họ điền
   xong rồi mới báo lỗi.

---

### Edge Cases

- **Chưa có kết nối nào**: vùng trái hiện trạng thái rỗng có hướng dẫn, không phải cây trắng.
- **Kết nối chết giữa lúc đang bung**: nhánh đó báo mất kết nối, các nhánh của kết nối khác
  không bị ảnh hưởng.
- **Namespace có 5 000 bảng**: danh sách vẫn dùng được (cuộn, tìm trong nhánh), và không nạp
  toàn bộ metadata chi tiết của 5 000 bảng chỉ để hiện tên.
- **Redis có 10 triệu khoá**: không thể liệt kê hết — phải duyệt theo lô, có thể dừng giữa
  chừng, và không được dùng cách liệt kê làm treo server.
- **Hai đối tượng trùng tên ở hai namespace**: chọn và mở độc lập với nhau.
- **Đối tượng bị xoá bởi người khác** khi đang mở: báo rõ, không hiện dữ liệu cũ như thể đúng.
- **Kết nối ở chế độ chỉ đọc**: mọi hành động ghi trong cây và vùng phải đều không được chào
  mời; dấu hiệu chỉ-đọc thấy được ở cả hai vùng.
- **Engine có tầng catalog nhưng người dùng không có quyền xem hết**: hiện những gì thấy được,
  nói rõ có phần bị giới hạn quyền, không báo lỗi toàn cục.
- **Người dùng đóng một nhánh đang nạp**: việc nạp được huỷ, không tiếp tục tốn tài nguyên.
- **Đối tượng tên có dấu cách, ký tự unicode, hoặc trùng từ khoá SQL**: hiện và mở đúng.

## Requirements *(mandatory)*

### Functional Requirements

**Nhóm A — Điều hướng theo cấp**

- **FR-001**: Khi khởi động, vùng điều hướng MUST chỉ hiện danh sách kết nối đã lưu ở cấp một,
  tất cả ở trạng thái đóng.
- **FR-002**: Hệ thống MUST NOT gửi bất kỳ truy vấn nào tới một database cho tới khi người dùng
  mở kết nối tương ứng.
- **FR-003**: Hệ thống MUST NOT lưu sẵn trạng thái mở/chọn trỏ tới đối tượng không tồn tại
  trong workspace hiện tại.
- **FR-004**: Mở một nhánh MUST chỉ nạp đúng cấp con trực tiếp của nhánh đó.
- **FR-005**: Mỗi nhánh MUST có ba trạng thái thấy được riêng: đang nạp, đã nạp, lỗi. Lỗi của
  một nhánh MUST NOT ảnh hưởng nhánh khác.
- **FR-006**: Mỗi đối tượng trong cây MUST được nhận dạng bằng đường dẫn đầy đủ, sao cho hai
  đối tượng trùng tên ở hai vị trí khác nhau hoạt động độc lập.
- **FR-007**: Người dùng MUST làm mới được từng nhánh mà không phải mở lại cả kết nối.
- **FR-008**: Đóng một nhánh đang nạp MUST huỷ việc nạp đó.

**Nhóm B — Cấu trúc cây suy từ năng lực engine**

- **FR-009**: Số cấp của cây MUST được suy ra từ năng lực của kết nối: engine có catalog thì có
  cấp database; có namespace thì có cấp namespace; không có thì cấp đó KHÔNG xuất hiện.
- **FR-010**: Danh sách nhóm đối tượng MUST được suy ra từ năng lực của kết nối, KHÔNG phải một
  danh sách cố định.
- **FR-011**: Mỗi nhóm được khai là có MUST liệt kê được thực thể của nó. Khai "có" mà không
  liệt kê được MUST bị bộ kiểm tự động phát hiện.
- **FR-012**: Năng lực MUST được lấy theo server đang kết nối thật, không theo bảng tĩnh của
  engine — cùng một engine ở hai phiên bản khác nhau có thể cho hai cây khác nhau.
- **FR-013**: Giao diện MUST NOT chứa nhánh xử lý riêng theo tên engine; khác biệt giữa các
  engine MUST được biểu diễn bằng dữ liệu năng lực.

**Nhóm C — Liên kết lựa chọn ↔ vùng nội dung**

- **FR-014**: Chọn một đối tượng trong cây MUST làm vùng bên phải hiện nội dung tương ứng với
  **loại** của đối tượng đó.
- **FR-014a**: Vùng bên phải MUST quản lý nội dung theo tab, và danh tính của một tab MUST gồm
  **loại nội dung + đường dẫn đầy đủ của đối tượng**.
- **FR-014b**: Chọn một đối tượng CHƯA có tab MUST mở tab mới và đưa tiêu điểm vào nó.
- **FR-014c**: Chọn một đối tượng ĐÃ có tab MUST chuyển tiêu điểm về tab đó và MUST NOT tạo tab
  thứ hai cho cùng một danh tính.
- **FR-014d**: Mỗi tab MUST giữ trạng thái riêng của nó (vị trí cuộn, bộ lọc, nội dung chưa
  lưu); mở hoặc đóng một tab khác MUST NOT làm mất trạng thái đó.
- **FR-014e**: Đóng một tab có nội dung chưa lưu MUST hỏi người dùng trước.
- **FR-015**: MỌI loại đối tượng mà cây hiện được MUST có một loại nội dung tương ứng đã khai.
  KHÔNG loại nào được dẫn tới màn hình trắng.
- **FR-016**: Vùng bên phải MUST luôn hiện đường dẫn đầy đủ của thứ đang xem.
- **FR-017**: Hành động không áp dụng cho loại đối tượng đang chọn, hoặc không được engine hỗ
  trợ, MUST NOT được chào mời như hành động dùng được.
- **FR-018**: Công cụ không gắn với đối tượng MUST mở được độc lập với lựa chọn hiện tại và
  giữ được nhiều phiên song song.
- **FR-019**: Chuyển lựa chọn bên trái MUST NOT làm mất nội dung chưa lưu của phiên công cụ
  đang mở.
- **FR-020**: Chế độ chỉ đọc của kết nối MUST thấy được ở cả cây và vùng nội dung, và mọi hành
  động ghi MUST NOT được chào mời cho kết nối đó.

**Nhóm D — Đường đi cho bốn engine chưa hiện thực**

- **FR-021**: Với MỖI engine chưa hiện thực (Oracle, MongoDB, Redis), tài liệu MUST nêu rõ: các
  cấp của cây, các nhóm đối tượng, loại nội dung tương ứng mỗi nhóm, và danh sách điều engine đó
  KHÔNG làm được.
- **FR-022**: Engine chưa có driver MUST được nói rõ là chưa hỗ trợ **trước khi** người dùng
  nhập thông tin đăng nhập.
- **FR-023**: Với engine hướng tài liệu, cấu trúc dữ liệu suy luận từ mẫu MUST được gắn nhãn
  rõ là suy luận, kèm số lượng mẫu đã dùng.
- **FR-024**: Với engine kiểu khoá–giá trị, việc liệt kê MUST theo lô, dừng được giữa chừng, và
  MUST NOT dùng cách liệt kê có thể làm treo dịch vụ đang chạy.
- **FR-025**: Thêm một engine mới vào luồng này MUST NOT đòi hỏi thay đổi cấu trúc màn hình —
  chỉ thêm dữ liệu khai báo và một driver.

**Nhóm E — SQL Server chạy thật và môi trường kiểm được**

- **FR-026**: SQL Server MUST kết nối được thật và đi hết luồng ở nhóm A–C: bung cây đủ ba cấp,
  chọn đối tượng, hiện nội dung tương ứng.
- **FR-027**: Bộ kiểm định driver MUST chạy được cho SQL Server, và nhóm nào không áp dụng được
  MUST bị bỏ qua KÈM LÝ DO in ra — không bỏ qua trong im lặng.
- **FR-028**: Môi trường kiểm MUST dựng lại được bằng lệnh ghi trong tài liệu, không cần thao
  tác tay và không phụ thuộc máy của một người cụ thể.
- **FR-029**: Bộ kiểm MUST tạo dữ liệu mẫu trong phạm vi riêng của nó và MUST NOT ghi vào bất kỳ
  database nghiệp vụ nào đang có sẵn trên server đó.
- **FR-030**: Nếu môi trường kiểm dùng một biến thể của engine (bản rút gọn, bản chạy trên nền
  khác), tài liệu MUST nói rõ biến thể đó khác bản đầy đủ ở đâu, để không ai kết luận quá mức
  từ kết quả kiểm.

### Security Requirements

- **SR-001**: Tham số mà người dùng hoặc catalog cung cấp (tên database, namespace, đối tượng)
  MUST được kiểm tại ranh giới trước khi dùng.
- **SR-002**: Thông báo lỗi trong cây và vùng nội dung MUST NOT chứa thông tin đăng nhập, chuỗi
  kết nối, hay dấu vết ngăn xếp.
- **SR-003**: Thao tác mở kết nối và mọi hành động ghi MUST được ghi nhật ký ở mức đủ để truy
  lại, và nhật ký MUST NOT chứa bí mật.
- **SR-004**: Tên đối tượng lấy từ catalog MUST được xử lý như dữ liệu không tin cậy — một
  server bị chiếm có thể trả về tên chứa nội dung tấn công.
- **SR-005**: Chế độ chỉ đọc MUST được thực thi ở tầng xử lý, KHÔNG chỉ ẩn nút ở giao diện.
- **SR-006**: Thông tin đăng nhập của môi trường kiểm MUST được sinh trong phạm vi lần chạy đó,
  hoặc lấy từ biến môi trường. MUST NOT có bất kỳ mật khẩu nào nằm trong mã nguồn, tài liệu, hay
  tệp cấu hình được lưu vào repo — kể cả mật khẩu "chỉ dùng cho máy cá nhân".
- **SR-007**: Bộ kiểm MUST từ chối chạy nếu đích của nó là một database nghiệp vụ chứ không phải
  database dùng riêng cho việc kiểm.

**Data Classification**:

| Dữ liệu | Phân loại | Cách xử lý |
|---|---|---|
| Mật khẩu database, khoá SSH | Confidential | chỉ rời kho khoá để đi vào driver; không bao giờ vào kết quả trả về giao diện, log, hay nhật ký |
| Đường dẫn tệp database (SQLite) | Internal | hiện cho chủ kết nối; không phát ra ngoài phạm vi phiên của họ |
| Tên đối tượng lấy từ catalog | Untrusted input | xử lý như dữ liệu ngoài, kể cả khi đến từ server của chính khách hàng |
| Giá trị dữ liệu trong ô | Confidential | không đưa vào nhật ký, không gửi cho dịch vụ bên ngoài |
| Cấu trúc tài liệu suy luận (MongoDB) | Internal | luôn kèm nhãn "suy luận từ N mẫu", không trình bày như cấu trúc chắc chắn |

### Key Entities

- **Kết nối**: một cấu hình trỏ tới một server hoặc một tệp database. Có engine, trạng thái,
  chế độ chỉ đọc, và tập năng lực chỉ biết được sau khi kết nối thật.
- **Cấp phân tầng**: đơn vị chứa trong cây (catalog/database, namespace/schema). Số cấp thay
  đổi theo engine, không cố định.
- **Nhóm đối tượng**: một tập đối tượng cùng loại trong một cấp chứa (Tables, Views, Functions,
  Triggers, Collections, Keys…). Sự tồn tại của nhóm do năng lực engine quyết định.
- **Đối tượng**: một thực thể cụ thể, nhận dạng bằng đường dẫn đầy đủ trong cây, có loại và có
  một loại nội dung tương ứng.
- **Tab**: một khung nhìn đang mở bên phải, nhận dạng bằng **loại nội dung + đường dẫn đầy đủ
  của đối tượng**. Chính danh tính này quyết định chọn lại một đối tượng thì mở tab mới hay về
  tab cũ. Tab gắn đối tượng và tab công cụ độc lập cùng nằm trong một danh sách, giữ trạng thái
  riêng của mình.
- **Bản đồ loại → nội dung**: khai báo nói loại đối tượng nào mở ra loại nội dung nào. Đây là
  dữ liệu, không phải mã rẽ nhánh.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Mở app với 10 kết nối đã lưu gửi **đúng 0** truy vấn tới database, và vùng trái
  hiện đủ 10 dòng trong vòng 1 giây.
- **SC-002**: Bung một nhánh gửi **đúng 1** yêu cầu nạp cho nhánh đó, không kèm yêu cầu nào cho
  nhánh chưa mở.
- **SC-003**: Danh sách tên đối tượng của một namespace 5 000 bảng hiện ra trong vòng 1 giây.
- **SC-004**: 100% loại đối tượng mà cây hiện được đều dẫn tới nội dung tương ứng — **không có**
  đường dẫn nào tới màn hình trắng.
- **SC-005**: Với mỗi engine đã kết nối được, số nhóm hiện trong cây khớp **100%** với số nhóm
  được khai là có; sai khớp bị phát hiện tự động, không phải bằng mắt.
- **SC-006**: Người dùng mới, không được hướng dẫn, mở được dữ liệu của một bảng cụ thể trong
  **không quá 4 lần nhấn** kể từ lúc mở app.
- **SC-007**: Chuyển lựa chọn giữa hai đối tượng làm mất **0** nội dung chưa lưu của các phiên
  công cụ đang mở.
- **SC-008**: Tài liệu đường đi trả lời được đủ 4 câu hỏi bắt buộc cho **cả 4** engine chưa
  hiện thực (cấp nào, nhóm nào, nội dung gì, không làm được gì).
- **SC-009**: Thêm engine thứ tư vào luồng cần **0** thay đổi cấu trúc màn hình — đo bằng việc
  phần thay đổi nằm hoàn toàn trong dữ liệu khai báo và driver.
- **SC-010**: Trên kết nối chỉ đọc, số hành động ghi được chào mời là **0**, ở cả hai vùng.
- **SC-011**: Chọn 5 đối tượng khác nhau cho ra **đúng 5** tab; chọn lại lần lượt cả 5 vẫn giữ
  **đúng 5** tab và tiêu điểm nhảy đúng tab tương ứng mỗi lần.
- **SC-012**: Mở và đóng tab **20** lần liên tiếp làm mất **0** nội dung chưa lưu của các tab
  còn lại.
- **SC-013**: SQL Server đi hết luồng từ danh sách kết nối tới dữ liệu của một bảng, qua **đủ
  ba cấp** phân tầng.
- **SC-014**: Người khác dựng lại môi trường kiểm theo tài liệu và chạy được bộ kiểm định trong
  **không quá 10 phút** kể từ lệnh đầu tiên, trên máy chưa có gì.
- **SC-015**: Bộ kiểm định cho SQL Server in ra **danh sách nhóm bị bỏ qua kèm lý do**; số nhóm
  bỏ qua trong im lặng là **0**.

## Assumptions

Những mặc định dưới đây được chọn theo thông lệ của công cụ quản trị database và theo tài liệu
kiến trúc đã có của dự án. Ghi lại để nếu sai thì sửa đúng một chỗ.

1. **Phạm vi engine: SQL Server hiện thực thật, ba engine còn lại chỉ đặc tả.** Feature này
   giao luồng điều hướng chạy trên 3 engine đã có **cộng SQL Server**, và đặc tả đường đi cho
   Oracle / MongoDB / Redis. Lý do chọn SQL Server làm engine chạy thật: nó là engine đầu tiên
   dùng đủ ba cấp phân tầng, nên nó là phép thử thật cho luồng — đặc tả trên giấy không phát
   hiện được chỗ nào trong màn hình đang ngầm giả định chỉ hai cấp.
2. **Môi trường kiểm dùng ảnh SQL Server đầy đủ, KHÔNG dùng Azure SQL Edge.** Máy phát triển
   hiện có một container `azure-sql-edge` ở cổng 1433. Nó tiện để thử tay, nhưng Azure SQL Edge
   là **bản rút gọn** của engine: một số thứ mà công cụ quản trị cần (tìm kiếm toàn văn, một
   phần khung nhìn hệ thống, một phần tác vụ nền) không có hoặc khác. Kết luận "SQL Server chạy
   được" dựa trên Edge là kết luận quá mức. Vì vậy bộ kiểm định dùng ảnh SQL Server đầy đủ do
   chính nó dựng lên, và container Edge sẵn có chỉ dùng cho việc thử tay khi cần.
3. **Bộ kiểm KHÔNG bao giờ trỏ vào database nghiệp vụ.** Container sẵn có đang giữ database
   `crm_customer_proposal` của một ứng dụng thật. Bộ kiểm định phải tạo lược đồ mẫu riêng, nên
   trỏ nó vào database đó sẽ tạo và xoá bảng trong dữ liệu thật. Đây là điều FR-029 và SR-007
   tồn tại để ngăn.
4. **Thông tin đăng nhập không vào repo.** Mật khẩu của container cá nhân đi qua biến môi
   trường trên máy người dùng; bộ kiểm tự sinh mật khẩu cho container của nó. Không có mật khẩu
   nào — kể cả mật khẩu máy cá nhân — được ghi vào mã nguồn hay tài liệu.
5. **Công cụ độc lập vẫn giữ menu riêng.** Trình soạn SQL, sao lưu, tác vụ, so sánh không bị
   điều khiển bởi lựa chọn bên trái — nếu không, người dùng mất khả năng viết SQL tự do. Chúng
   cũng nằm trong danh sách tab, nhưng danh tính của chúng không gắn với một đối tượng nào, nên
   mở nhiều phiên soạn SQL song song là hợp lệ.
6. **Số tab không bị chặn cứng ở bản đầu.** Nếu về sau cần chặn, nó phải là một quyết định
   riêng có số đo, không phải một hằng số đặt vội.
7. **Cây không tự mở lại trạng thái phiên trước** ở bản đầu. Ghi nhớ trạng thái mở là việc
   riêng, và nó không được vi phạm FR-002 (không tự truy vấn khi mở app).
8. **Danh sách khoá của engine khoá–giá trị không phải một "nhóm đối tượng" bình thường** mà là
   một khung nhìn duyệt theo lô — vì số lượng khoá không có giới hạn thực tế.
9. **Chỉ đọc là thuộc tính của kết nối**, không phải của phiên làm việc.
10. **Đối tượng bị xoá phía server chỉ được phát hiện khi làm mới**, không theo dõi thay đổi
   liên tục — theo dõi liên tục là chức năng riêng, tốn tài nguyên server của khách hàng.

## Out of Scope

- Viết driver thật cho **Oracle, MongoDB, Redis** (mỗi engine là một hạng mục riêng).
  SQL Server thì NẰM TRONG phạm vi — xem US7.
- Những phần của SQL Server vượt ngoài luồng điều hướng: tác vụ nền, sao lưu, quản lý người
  dùng. Feature này chỉ cần nó đi hết được luồng kết nối → cây → nội dung.
- Khung nhìn chuyên biệt của MongoDB (dựng truy vấn tổng hợp) và Redis (theo dõi lệnh) — chỉ
  đặc tả chỗ chúng nằm trong luồng, không hiện thực.
- Ghi nhớ và phục hồi trạng thái cây giữa các phiên.
- Theo dõi thay đổi lược đồ theo thời gian thực.
- Thiết kế lại thị giác: bố cục, màu, cỡ chữ giữ nguyên. Feature này đổi **thứ gì hiện khi
  nào**, không đổi cách nó trông.

## Quyết định đã chốt

Hai câu hỏi mở của bản nháp đã được người chủ dự án trả lời ngày 2026-08-20:

**FR-014a — mô hình tab**: theo **danh tính đối tượng**. Khác đối tượng thì mở tab mới; cùng
đối tượng thì chuyển tiêu điểm về tab đã có; chưa có thì mở mới. Đã đưa vào FR-014a→FR-014e và
User Story 4.

**FR-021a — mức chứng minh cho engine mới**: ngoài tài liệu, cần **môi trường SQL Server dựng
được trên Docker và kiểm được**. Đã đưa vào User Story 7 và nhóm FR-026→FR-030. Kèm ba điều
kiện an toàn phát sinh từ hiện trạng máy phát triển (ảnh Edge ≠ bản đầy đủ; không trỏ bộ kiểm
vào database nghiệp vụ; mật khẩu không vào repo) — xem Assumptions 1b–1d.
