import type { ContentKind, ObjectKind } from '@corvus/contract'

/**
 * Bảng ánh xạ từ ObjectKind sang ContentKind mặc định khi chọn trong cây điều hướng.
 * Ép kiểu Record<ObjectKind, ContentKind> để bảo đảm không loại đối tượng nào
 * thiếu màn hình hiển thị (Bất biến IV-E / FR-015).
 */
export const CONTENT_FOR_KIND: Record<ObjectKind, ContentKind> = {
  table: 'data',
  view: 'data',
  materializedView: 'data',
  collection: 'data',
  keyspace: 'data',
  procedure: 'definition',
  function: 'definition',
  package: 'definition',
  trigger: 'definition',
  sequence: 'definition',
  index: 'definition',
  domain: 'definition',
  type: 'definition',
  event: 'definition',
}
