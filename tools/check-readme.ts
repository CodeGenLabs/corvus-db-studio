import fs from 'node:fs'
import path from 'node:path'
import { CONTAINER_ENGINES } from './devdb/ports'

/**
 * CI check đảm bảo mọi cổng database trong ports.ts đều được tài liệu hoá trong README.md
 * (FR-035, SC-015).
 */
function main() {
  const readmePath = path.resolve(process.cwd(), 'README.md')
  if (!fs.existsSync(readmePath)) {
    console.error('❌ README.md không tồn tại ở thư mục gốc!')
    process.exit(1)
  }

  const readme = fs.readFileSync(readmePath, 'utf8')
  let hasError = false

  console.log('🔍 Kiểm tra tài liệu hoá cổng database trong README.md...')

  for (const spec of CONTAINER_ENGINES) {
    const portStr = String(spec.port)
    if (!readme.includes(portStr)) {
      console.error(`❌ Cổng ${portStr} của ${spec.displayName} (${spec.engine}) chưa được ghi trong README.md!`)
      hasError = true
    } else {
      console.log(`  ✓ ${spec.displayName} (${spec.engine}): cổng ${portStr} đã có trong README.md`)
    }
  }

  // Kiểm tra cảnh báo an toàn cổng 1433 của máy trạm
  if (!readme.includes('1433')) {
    console.error('❌ README.md phải chứa ghi chú an toàn về cổng 1433 (dành riêng cho host SQL Server, không map vào docker)!')
    hasError = true
  } else {
    console.log('  ✓ Ghi chú an toàn cổng 1433 đã có trong README.md')
  }

  if (hasError) {
    console.error('❌ Kiểm tra README.md thất bại!')
    process.exit(1)
  }

  console.log('✅ Toàn bộ cổng database và ghi chú an toàn đã được tài liệu hoá đầy đủ trong README.md.')
}

main()
