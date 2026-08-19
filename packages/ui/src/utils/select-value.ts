/**
 * Đọc giá trị `<select>` một cách type-safe thay vì `e.target.value as any`.
 *
 * `HTMLSelectElement.value` luôn là `string`, nhưng state của ta là union hẹp.
 * Ép bằng `as any` sẽ cho phép mọi chuỗi lọt vào state — nếu ai đó đổi `<option>`
 * mà quên đổi union thì lỗi chỉ lộ ra lúc chạy. Hàm này kiểm ở runtime và rơi về
 * giá trị mặc định, đồng thời giữ đúng kiểu ở compile-time.
 */
export function selectValue<const T extends string>(
  raw: string,
  allowed: readonly T[],
  fallback: T,
): T {
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback
}
