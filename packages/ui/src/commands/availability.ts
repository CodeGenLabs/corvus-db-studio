import type { ActiveContext } from '../context/activeContext'
import type { AvailabilityVerdict, Command } from './types'

/**
 * Hàm duy nhất trong toàn UI quyết định khả dụng của một lệnh (FR-046).
 *
 * Mọi bề mặt (Toolbar, MenuBar, ContextMenu, CommandPalette) đều gọi hàm này.
 *
 * Lưu ý về lý do trả về:
 * - 'hidden' CHỈ được trả về cho lý do 'engine-unsupported'.
 * - Khi `capabilities === null` (chưa tải xong hoặc chưa mở kết nối), mặc định an toàn
 *   là trả về 'disabled' với lý do 'capabilities-unknown'.
 *
 * [GIẢI THÍCH MẶC ĐỊNH AN TOÀN - contracts/active-context.md §4]:
 * Điểm này cố ý khác `useNavTree.ts:85` (ở đó mặc định `hasCatalogs: true` khi caps null
 * vì ở cây điều hướng đoán sai chỉ tốn một lần fetch). Tại đây, nếu đoán sai có thể chạy DDL
 * hoặc DML sai engine, do đó bắt buộc phải chặn cho tới khi có CapabilitySet xác thực.
 */
export function evaluate(
  cmd: Command,
  ctx: ActiveContext,
): AvailabilityVerdict {
  const { availability, cardinality, targets } = cmd

  // 1. Kiểm tra kết nối
  if (availability.needsConnection && ctx.connectionState !== 'open') {
    return { state: 'disabled', reason: 'no-connection' }
  }

  // 2. Kiểm tra năng lực engine (CapabilitySet)
  if (availability.capability !== undefined) {
    if (ctx.capabilities === null) {
      // Mặc định an toàn: chưa có capabilities thì vô hiệu hoá với lý do capabilities-unknown
      return { state: 'disabled', reason: 'capabilities-unknown' }
    }

    if (!availability.capability(ctx.capabilities)) {
      // Lý do duy nhất trả về 'hidden'
      return { state: 'hidden', reason: 'engine-unsupported' }
    }
  }

  // 3. Kiểm tra loại đối tượng (ObjectKind)
  if (availability.objectKinds !== undefined && availability.objectKinds.length > 0) {
    if (!ctx.selection.kind || !availability.objectKinds.includes(ctx.selection.kind)) {
      return { state: 'disabled', reason: 'wrong-object-kind' }
    }
  }

  // 4. Kiểm tra số lượng đối tượng đang chọn (cardinality)
  const requiresObjectTarget =
    targets.includes('object') ||
    targets.includes('sub-element') ||
    targets.includes('database') ||
    targets.includes('namespace')

  if (requiresObjectTarget && targets.length === 1 && !targets.includes('empty')) {
    if (ctx.selection.names.length === 0) {
      return { state: 'disabled', reason: 'no-selection' }
    }
  }

  if (cardinality === 'single' && ctx.selection.names.length > 1) {
    return { state: 'disabled', reason: 'multi-selection-unsupported' }
  }

  // 5. Kiểm tra phân quyền (nếu có cấu hình - FR-048)
  if (availability.permission !== undefined) {
    if (ctx.permissions !== undefined && !ctx.permissions.includes(availability.permission)) {
      return { state: 'disabled', reason: 'insufficient-permission' }
    }
  }

  return { state: 'enabled' }
}
