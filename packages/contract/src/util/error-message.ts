/**
 * Lấy thông điệp lỗi an toàn từ giá trị `unknown` của khối catch.
 *
 * Dùng thay cho `catch (err: any)` + `err.message`: `catch` luôn nhận `unknown` vì
 * JavaScript cho phép ném bất cứ thứ gì (string, number, object rỗng…).
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message: unknown }).message
    if (typeof m === 'string') return m
  }
  return String(err)
}

/** Bọc giá trị `unknown` thành `Error`, giữ nguyên nếu đã là `Error`. */
export function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(errorMessage(err), { cause: err })
}
