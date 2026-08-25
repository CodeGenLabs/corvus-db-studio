# Feature Specification: Nâng cấp trải nghiệm UI/UX theo chuẩn Navicat 17 (Navicat UI Ergonomics)

**Feature Branch**: `004-navicat-ui-ergonomics`
**Created**: 2026-08-25
**Status**: Draft
**Input**: User request: "so sánh với file manual của navicat đính kèm, kiểm tra các tính năng đã thực hiện (chạy được), các tính năng chưa có và cần bổ sung, tôi không cần những tính năng cao siêu, tôi cần giống về mặt UI/UX trải nghiệm, bởi vì navicat đang là phần mềm tôi thấy dễ sử dụng nhất. Lên kế hoạch thực hiện 5 hạng mục mà bạn đề ra."

---

## 1. Bối cảnh & Mục tiêu (Context & Objectives)

Corvus DB Studio đã hoàn thiện toàn bộ kết nối backend (76/76 RPC methods) và kiến trúc đa engine trên 7 database thật. Tuy nhiên, để đạt trải nghiệm sử dụng **tiện tay, mượt mà và trực quan** như Navicat 17 — phần mềm quản trị CSDL được người dùng đánh giá là dễ sử dụng nhất — hệ thống cần tinh chỉnh và bổ sung 5 gói trải nghiệm UI/UX trọng tâm sau:

1. **Gói 1 (DataGrid Ergonomics)**: Bổ sung thanh điều hướng đáy (`Use Navigation Bar`: `+`, `-`, `✓`, `✗`, `↻`, phân trang `[⏮ ◀ 1/6 ▶ ⏭]`, `Record 1 of 599 in page 1`, bộ chọn limit `100/500/1000/All`) và các thao tác nhanh trên ô (`Set to NULL`, `Set to Empty String`, `Copy As -> INSERT / UPDATE / TSV`).
2. **Gói 2 (Visual Filter & Sort Bar)**: Thanh lọc và sắp xếp dữ liệu trực quan trên đầu DataGrid (chọn Cột + Toán tử `=`, `!=`, `contains`, `is null` + Giá trị + Sắp xếp đa cột) mà không bắt buộc người dùng phải gõ mệnh đề SQL WHERE thủ công.
3. **Gói 3 (Tabbed Table Designer)**: Trình thiết kế bảng phân chia tab kinh điển của Navicat: Tab **Fields** (cột, kiểu, độ dài, null, PK, auto-inc, default, comment), Tab **Indexes**, Tab **Foreign Keys**, Tab **SQL Preview** (xem trước ALTER/CREATE trước khi lưu an toàn).
4. **Gói 4 (Query Results Ergonomics)**: Chức năng ghim tab kết quả truy vấn (`[📌 Pin]`) để giữ lại các lần chạy trước và nút chuyển đổi linh hoạt bố cục kết quả (`Bottom Split` $\leftrightarrow$ `Right Split` $\leftrightarrow$ `New Page`).
5. **Gói 5 (Visual Safety & Search)**: Gán màu nhận diện kết nối (`Connection Colorings`: Đỏ cho Prod, Vàng cho Staging, Xanh cho Dev) trên cây điều hướng và tiêu đề tab + Hộp thoại tìm kiếm chuỗi ký tự trên toàn CSDL (`Find in Database/Schema`).

---

## 2. User Stories & Acceptance Scenarios

### User Story 1: Thanh điều hướng đáy & Thao tác nhanh trên Lưới dữ liệu (Priority: P1 - MVP)

**Mô tả**: Là người dùng duyệt bảng dữ liệu, tôi muốn có thanh điều hướng đáy giống hệt Navicat với các nút `+`, `-`, `✓`, `✗`, `↻`, thông tin số dòng/trang, và menu chuột phải trên ô hỗ trợ gán NULL hoặc sao chép thành câu lệnh INSERT/UPDATE để thao tác dữ liệu nhanh chóng.

- **Acceptance Scenario 1.1 (Bottom Navigation Bar Controls)**:
  - **Given** người dùng đang mở tab dữ liệu bảng (ví dụ `customer`).
  - **When** nhìn vào chân lưới dữ liệu (bottom bar).
  - **Then** hiển thị cụm nút điều hướng: `[+]` (Thêm dòng trống), `[-]` (Xoá dòng đang chọn), `[✓]` (Lưu thay đổi dòng), `[✗]` (Huỷ thay đổi chưa lưu), `[↻]` (Làm mới), kèm cụm lật trang `[⏮] [◀] [Trang X / Y] [▶] [⏭]` và nhãn `Record A of B in page C`.
- **Acceptance Scenario 1.2 (Page Size / Limit Setting)**:
  - **Given** người dùng đang ở chân DataGrid.
  - **When** chọn dropdown số dòng trên trang (ví dụ `100`, `500`, `1000`, `All`).
  - **Then** lưới nạp lại dữ liệu theo đúng kích thước trang được chọn và cập nhật tổng số trang.
- **Acceptance Scenario 1.3 (Cell Quick Action: Set to NULL / Empty String)**:
  - **Given** người dùng nhấp phải vào một ô dữ liệu trong DataGrid.
  - **When** chọn `Set to NULL` hoặc `Set to Empty String`.
  - **Then** ô được gán giá trị tương ứng, hiển thị nhãn visual `NULL` (màu xám nhạt) hoặc rỗng, và đánh dấu dòng có thay đổi chờ xác nhận `[✓]`.
- **Acceptance Scenario 1.4 (Copy As SQL Statements)**:
  - **Given** người dùng chọn một hoặc nhiều dòng trong DataGrid và nhấp phải.
  - **When** chọn `Copy As` $\rightarrow$ `Insert Statement` hoặc `Update Statement` hoặc `Tab-Separated Values (TSV)`.
  - **Then** nội dung tương ứng được tạo và sao chép vào clipboard của hệ điều hành, sẵn sàng dán vào trình soạn thảo SQL hoặc Excel.

---

### User Story 2: Thanh công cụ Lọc & Sắp xếp trực quan (Visual Filter & Sort) (Priority: P1 - MVP)

**Mô tả**: Là người dùng muốn tra cứu dữ liệu theo điều kiện mà không cần mở SQL Editor gõ lệnh `SELECT ... WHERE ...`, tôi muốn có thanh Filter & Sort trực quan ngay trên DataGrid để chọn trường, toán tử và giá trị lọc nhanh.

- **Acceptance Scenario 2.1 (Quick Filter Row)**:
  - **Given** người dùng đang xem bảng trong DataGrid và bấm nút `Filter & Sort` trên Object Toolbar.
  - **When** thanh Filter Panel mở ra phía trên lưới.
  - **Then** người dùng có thể chọn `[Tên Cột]`, `[Toán tử: = / != / < / <= / > / >= / contains / does not contain / is null / is not null / between]`, nhập `[Giá trị]`, và bấm `[Áp dụng]`.
- **Acceptance Scenario 2.2 (Filter from Cell Context Menu)**:
  - **Given** người dùng đang nhấp phải vào một ô có giá trị (ví dụ ô `first_name = 'MARY'`).
  - **When** chọn menu `Filter -> Field Value (MARY)`.
  - **Then** điều kiện `first_name = 'MARY'` tự động được thêm vào thanh Filter và áp dụng lọc dữ liệu ngay lập tức.
- **Acceptance Scenario 2.3 (Multi-Column Sorting)**:
  - **Given** người dùng mở thanh Sort hoặc nhấp vào tiêu đề cột.
  - **When** chọn sắp xếp tăng dần (`ASC`) hoặc giảm dần (`DESC`) trên nhiều cột (ví dụ `active DESC, last_name ASC`).
  - **Then** DataGrid hiển thị mũi tên chỉ hướng sắp xếp trên tiêu đề cột và tải dữ liệu đã được sắp xếp đúng thứ tự.

---

### User Story 3: Trình thiết kế cấu trúc bảng dạng Tab (Tabbed Table Designer) (Priority: P1 - MVP)

**Mô tả**: Là người dùng quản trị CSDL, tôi muốn tạo hoặc chỉnh sửa cấu trúc bảng thông qua giao diện Table Designer đa tab chuẩn Navicat (Fields, Indexes, Foreign Keys, SQL Preview) để thiết kế bảng trực quan và an toàn.

- **Acceptance Scenario 3.1 (Tab Fields)**:
  - **Given** người dùng mở Table Designer (tạo bảng mới hoặc thiết kế bảng có sẵn).
  - **When** chọn tab `Fields`.
  - **Then** hiển thị lưới cấu trúc cột gồm: Tên cột (`Name`), Kiểu dữ liệu (`Type` - dropdown theo engine), Độ dài (`Length`), Thập phân (`Decimals`), Cho phép Null (`Allow Null`), Khoá chính (`Primary Key`), Tự tăng (`Auto Increment`), Giá trị mặc định (`Default`), và Chú thích (`Comment`).
- **Acceptance Scenario 3.2 (Tab Indexes)**:
  - **Given** người dùng chuyển sang tab `Indexes`.
  - **When** thêm một index mới.
  - **Then** có thể nhập Tên Index, chọn danh sách các cột tham gia, Loại index (`INDEX`, `UNIQUE`, `FULLTEXT`), và Thuật toán (`BTREE`, `HASH`).
- **Acceptance Scenario 3.3 (Tab Foreign Keys)**:
  - **Given** người dùng chuyển sang tab `Foreign Keys`.
  - **When** tạo khoá ngoại liên kết.
  - **Then** có thể chọn Cột con (`Field`), Bảng cha tham chiếu (`Reference Table`), Cột cha (`Reference Field`), và hành động `On Delete` / `On Update` (`CASCADE`, `SET NULL`, `RESTRICT`, `NO ACTION`).
- **Acceptance Scenario 3.4 (Tab SQL Preview & Preview Token)**:
  - **Given** người dùng đã thực hiện các thay đổi trong Table Designer và bấm tab `SQL Preview` hoặc bấm nút `Save`.
  - **When** xem trước câu lệnh DDL sinh ra (`CREATE TABLE ...` hoặc `ALTER TABLE ... ADD/MODIFY COLUMN ...`).
  - **Then** người dùng nhìn thấy đầy đủ câu lệnh SQL chính xác và được yêu cầu xác nhận (Preview Token) trước khi DDL được áp dụng vào server.

---

### User Story 4: Ghim tab kết quả truy vấn & Tuỳ biến bố cục (Results Pinning & Layout) (Priority: P2)

**Mô tả**: Là người dùng thường xuyên chạy nhiều truy vấn SQL so sánh kết quả, tôi muốn ghim (`Pin`) tab kết quả lại để không bị ghi đè khi chạy câu lệnh tiếp theo, đồng thời linh hoạt đổi bố cục hiển thị kết quả (Dưới / Phải).

- **Acceptance Scenario 4.1 (Pin Result Tab)**:
  - **Given** người dùng đang xem tab `Result 1` trong SqlView.
  - **When** nhấn nút biểu tượng `[📌 Pin]` trên thanh công cụ tab kết quả hoặc nhấp phải chọn `Pin Tab`.
  - **Then** tab `Result 1` được đánh dấu icon Ghim và di chuyển sang bên trái. Khi người dùng chạy câu lệnh SQL tiếp theo, hệ thống tự động mở thêm tab `Result 2` mà không làm mất dữ liệu của `Result 1`.
- **Acceptance Scenario 4.2 (Unpin Tab)**:
  - **Given** một tab kết quả đang được ghim.
  - **When** người dùng bấm lại vào nút `[📌 Unpin]`.
  - **Then** tab trở lại trạng thái bình thường và sẽ được tái sử dụng ở lần chạy truy vấn kế tiếp.
- **Acceptance Scenario 4.3 (Result Layout Split Toggle)**:
  - **Given** người dùng đang mở SqlView.
  - **When** bấm nút chuyển đổi Layout `[Bottom Split]` $\leftrightarrow$ `[Right Split]`.
  - **Then** khung hiển thị kết quả chuyển đổi mượt mà giữa dạng chia dọc (nằm dưới trình soạn thảo) và chia ngang (nằm bên phải trình soạn thảo), có thanh tay kéo (splitter) điều chỉnh độ rộng linh hoạt.

---

### User Story 5: Nhận diện màu sắc kết nối & Tìm kiếm CSDL (Connection Colorings & Find in DB) (Priority: P2)

**Mô tả**: Là người dùng kết nối tới nhiều môi trường (Production, Staging, Local Dev), tôi muốn gán màu cho kết nối để tránh thao tác nhầm trên database thật, và muốn có công cụ tìm kiếm nhanh chuỗi dữ liệu trong toàn bộ CSDL.

- **Acceptance Scenario 5.1 (Assign Connection Color)**:
  - **Given** người dùng nhấp phải vào một kết nối trên cây điều hướng hoặc trong `ConnectionDialog`.
  - **When** chọn `Color` $\rightarrow$ chọn một màu (Đỏ, Cam, Vàng, Xanh lá, Xanh dương, Tím).
  - **Then** icon kết nối trên cây điều hướng đổi sang viền/chấm màu tương ứng, và thanh Tab bar / Header của các cửa sổ thuộc kết nối đó có dải viền màu nhận diện nổi bật.
- **Acceptance Scenario 5.2 (Find in Database Dialog)**:
  - **Given** người dùng mở menu `Tools -> Find in Database` hoặc phím tắt `Ctrl+Shift+F`.
  - **When** nhập từ khoá tìm kiếm (ví dụ `'John'`), chọn phạm vi tìm kiếm (Toàn database hoặc danh sách bảng được chọn), và bấm `[Find]`.
  - **Then** hệ thống quét các bảng và hiển thị danh sách các dòng dữ liệu khớp, cho phép nhấp đúp vào kết quả để mở DataGrid nhảy trực tiếp đến dòng đó.

---

## 3. Yêu cầu chức năng (Functional Requirements - FR)

### Nhóm A: DataGrid Navigation & Cell Helpers (Gói 1)
- **FR-001**: DataGrid MUST hiển thị Bottom Navigation Bar bao gồm:
  - Nút thêm bản ghi mới `[+]` (phím tắt `Ctrl+N` hoặc `Insert`).
  - Nút xoá bản ghi đã chọn `[-]` (phím tắt `Ctrl+Delete`).
  - Nút áp dụng thay đổi `[✓]` (phím tắt `Ctrl+S`).
  - Nút huỷ thay đổi chưa lưu `[✗]` (phím tắt `Escape`).
  - Nút làm mới dữ liệu `[↻]` (phím tắt `F5`).
- **FR-002**: Bottom Navigation Bar MUST hiển thị thông tin phân trang:
  - Bộ nút lật trang `[⏮ Trang đầu]`, `[◀ Trang trước]`, `[Ô nhập trang / Tổng trang]`, `[▶ Trang sau]`, `[⏭ Trang cuối]`.
  - Nhãn hiển thị số dòng: `Record X of Y in page Z` (tính toán dựa trên offset và limit hiện tại).
  - Dropdown chọn số dòng mỗi trang (`Page Size` / `Limit`): `100`, `200`, `500`, `1000`, `All`.
- **FR-003**: Context Menu trên ô dữ liệu (Cell Context Menu) MUST cung cấp các lệnh:
  - `Set to NULL`: Đặt giá trị ô thành `null`.
  - `Set to Empty String`: Đặt giá trị ô thành chuỗi rỗng `""`.
  - `Copy`: Sao chép giá trị ô.
  - `Copy As` $\rightarrow$ `Insert Statement` (sinh câu lệnh `INSERT INTO ... VALUES (...)`).
  - `Copy As` $\rightarrow$ `Update Statement` (sinh câu lệnh `UPDATE ... SET ... WHERE ...`).
  - `Copy As` $\rightarrow$ `Tab-Separated Values (TSV)` (định dạng dán thẳng vào bảng tính Excel).
  - `Filter -> Field Value`: Thêm điều kiện lọc theo giá trị của ô hiện tại.

### Nhóm B: Visual Filter & Sort Toolbar (Gói 2)
- **FR-004**: DataGrid MUST hỗ trợ thanh `Filter & Sort Panel` (bật/tắt qua nút trên Object Toolbar hoặc phím tắt `Ctrl+R`):
  - Hỗ trợ thêm nhiều điều kiện lọc kết hợp bằng toán tử logic `AND` / `OR`.
  - Mỗi điều kiện gồm: `[Checkbox kích hoạt]`, `[Dropdown Cột]`, `[Dropdown Toán tử]`, `[Input Giá trị]`.
  - Danh sách toán tử hỗ trợ: `=`, `!=`, `<`, `<=`, `>`, `>=`, `contains`, `does not contain`, `starts with`, `ends with`, `is null`, `is not null`, `is between`.
- **FR-005**: Thanh Filter & Sort MUST hỗ trợ sắp xếp đa cột (Multi-column Sort):
  - Chọn danh sách cột cần sắp xếp và hướng `ASC` / `DESC`.
  - Cho phép kéo thả hoặc dùng nút mũi tên đổi độ ưu tiên sắp xếp giữa các cột.

### Nhóm C: Tabbed Table Designer (Gói 3)
- **FR-006**: Table Designer (`DesignView.tsx`) MUST tổ chức thành 4 tab chính:
  - **Tab 1: Fields (Danh sách Cột)**: Quản lý cột với các thuộc tính Tên cột, Kiểu dữ liệu (ánh xạ theo engine), Độ dài/Quy mô, Cho phép NULL, Khoá chính, Tự tăng (Auto Inc), Giá trị mặc định, và Ghi chú (Comment). Hỗ trợ nút Thêm cột, Xoá cột, và Di chuyển vị trí cột (Move Up / Move Down).
  - **Tab 2: Indexes (Chỉ mục)**: Quản lý danh sách chỉ mục gồm Tên Index, Cột thành phần, Loại Index (`NORMAL`, `UNIQUE`, `FULLTEXT`), Thuật toán (`BTREE`, `HASH`).
  - **Tab 3: Foreign Keys (Khoá ngoại)**: Quản lý ràng buộc khoá ngoại gồm Tên khoá ngoại, Cột con, Schema/Bảng cha tham chiếu, Cột cha tham chiếu, Quy tắc `On Delete` và `On Update`.
  - **Tab 4: SQL Preview (Xem trước DDL)**: Hiển thị câu lệnh SQL DDL chính xác được sinh ra tự động trước khi người dùng nhấn Lưu (`Save`).
- **FR-007**: Mọi thao tác lưu trong Table Designer MUST tuân thủ nghiêm ngặt quy tắc Preview Token (ADR-0010, Rule 5).

### Nhóm D: Query Results Pinning & Layout Toggle (Gói 4)
- **FR-008**: Mỗi tab kết quả trong `SqlView` MUST có nút `[📌 Pin]` (hoặc context menu `Pin Tab`):
  - Khi được ghim, tab giữ nguyên dữ liệu và không bị xoá hoặc ghi đè ở lần thực thi SQL tiếp theo.
  - Lần chạy tiếp theo sẽ tự sinh tab mới (`Result 2`, `Result 3`...).
  - Hỗ trợ nút `[Unpin]` để mở ghim và cho phép tái sử dụng tab.
- **FR-009**: `SqlView` MUST cung cấp nút chuyển đổi Layout kết quả:
  - `Bottom Split`: Trình soạn thảo ở trên, Kết quả ở dưới (mặc định).
  - `Right Split`: Trình soạn thảo bên trái, Kết quả bên phải (phù hợp màn hình rộng).
  - Có thanh tay kéo (splitter) có thể kéo thả để điều chỉnh tỷ lệ kích thước.

### Nhóm E: Connection Colorings & Find in Database (Gói 5)
- **FR-010**: Cung cấp tính năng gán nhãn màu sắc cho kết nối (`Connection Colorings`):
  - Bảng màu: Đỏ (Prod), Vàng/Cam (Staging), Xanh lá (Dev), Xanh dương (Test), Tím, Xám.
  - Màu sắc được lưu bền vững vào thông tin profile kết nối trong `workspace.db`.
  - Hiển thị chấm/viền màu tại node kết nối trên Navigation Tree và đường viền trên đỉnh của các tab làm việc thuộc kết nối đó.
- **FR-011**: Hộp thoại tìm kiếm `Find in Database/Schema` (`Ctrl+Shift+F`):
  - Cho phép nhập từ khoá tìm kiếm, chọn chế độ khớp (`Contains`, `Exact Match`, `Regex`).
  - Cho phép chọn phạm vi bảng cần quét dữ liệu.
  - Hiển thị kết quả tìm kiếm theo danh sách: `Tên Bảng | Tên Cột | Giá trị Khớp`. Nhấp đúp vào kết quả sẽ mở DataGrid trỏ thẳng tới dòng dữ liệu đó.

---

## 4. Yêu cầu phi chức năng & Bảo mật (Non-Functional & Security Requirements)

- **SR-001 (Không rò rỉ thông tin nhạy cảm)**: Các tính năng tìm kiếm `Find in Database` và sao chép `Copy As` phải tôn trọng quyền truy cập (read-only mode), không ghi log chứa giá trị nhạy cảm vào trace log.
- **SR-002 (Preview Token cho DDL Designer)**: Toàn bộ thao tác tạo/sửa bảng trong Table Designer phải sinh DDL rõ ràng qua RPC `ddl.previewTable` / `ddl.applyTable` có preview token.
- **NFR-001 (Hiệu năng Lưới dữ liệu)**: Các thao tác lọc (Filter), sắp xếp (Sort), chuyển trang (Paging) trên DataGrid phải hoàn thành phản hồi dưới 200ms đối với bảng có hàng trăm nghìn dòng.
- **NFR-002 (Khả năng tương thích Monorepo & UI Rules)**:
  - `packages/ui` tuyệt đối không import `node:*`, `electron`, hay driver database.
  - Mọi chuỗi hiển thị qua hàm dịch đa ngôn ngữ `t(...)` (đủ 3 ngôn ngữ: Tiếng Việt, Tiếng Anh, Tiếng Nhật).
  - Không hardcode màu hex trong component — 100% qua token CSS (`--bg`, `--pane`, `--border`, `--accent`, `--text`, v.v.).

---

## 5. Tiêu chí thành công (Success Criteria)

- **SC-001**: 100% các bảng khi mở trong DataGrid đều hiển thị Bottom Navigation Bar đầy đủ các nút `+`, `-`, `✓`, `✗`, `↻`, phân trang và limit dropdown hoạt động chính xác.
- **SC-002**: Người dùng nhấp phải vào ô dữ liệu bất kỳ có thể chọn `Set to NULL`, `Set to Empty String`, và `Copy As (Insert/Update/TSV)` với nội dung sao chép hợp lệ.
- **SC-003**: Người dùng có thể lọc dữ liệu trực quan bằng thanh `Filter & Sort Panel` trên nhiều cột mà không cần gõ câu lệnh SQL WHERE thủ công.
- **SC-004**: Trình thiết kế bảng `Table Designer` hiển thị đầy đủ 4 tab: Fields, Indexes, Foreign Keys, SQL Preview; cho phép thêm/sửa/xoá cột, index, FK và xem trước DDL hợp lệ.
- **SC-005**: Tab kết quả truy vấn trong `SqlView` có thể ghim `Pin` để giữ lại kết quả giữa các lần chạy liên tiếp.
- **SC-006**: Chuyển đổi bố cục kết quả truy vấn giữa `Bottom Split` và `Right Split` hoạt động mượt mà với splitter kéo thả.
- **SC-007**: Gán màu kết nối hiển thị đúng nhãn màu trên cây điều hướng và thanh tab của kết nối đó.
- **SC-008**: Hộp thoại `Find in Database` tìm kiếm chính xác chuỗi ký tự trên các bảng được chọn trong CSDL.
- **SC-009**: Toàn bộ các test suite mới (DOM unit test và Playwright E2E) đạt 100% pass, lệnh `pnpm verify` thoát với mã 0.
- **SC-010**: Không có bất kỳ vi phạm nào đối với 10 điều cấm trong `docs/05-rules/AGENTS.md`.

---

## 6. Phạm vi loại trừ (Out of Scope)

Theo yêu cầu của người dùng, để tập trung tối đa vào trải nghiệm UI/UX cốt lõi và tránh các tính năng cao siêu không cần thiết:
- Không triển khai các tính năng Cloud / Team Collaboration (Navicat Cloud, On-Prem Server, Project Members).
- Không triển khai hệ thống BI Dashboards & 20 loại biểu đồ phức tạp.
- Không triển khai Data Profiling phân tích phân phối xác suất thống kê.
- Không triển khai PL/SQL & PL/pgSQL Step-by-Step Debugger.
- Không triển khai Data Dictionary Designer xuất file PDF layout tạp chí.
- Không triển khai bộ sinh dữ liệu ngẫu nhiên 20 danh mục (Data Generation).
