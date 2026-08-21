import { describe, expect, it, vi } from 'vitest'
import { setupTestEnvironment } from '../resolve'

describe('testenv · testcontainers fallback behavior (T050, R-4, R-5)', () => {
  it('setupTestEnvironment kích hoạt fallbackContainerFactory và gọi teardown khi hoàn tất', async () => {
    const mockStop = vi.fn().mockResolvedValue(undefined)
    const mockFactory = vi.fn().mockResolvedValue({
      profile: {
        id: 'mock-tc',
        name: 'mock testcontainers',
        driverId: 'postgres',
        host: '127.0.0.1',
        port: 54999,
        database: 'corvus_test',
        user: 'corvus',
        password: 'corvus_password',
      },
      stop: mockStop,
    })

    // Sử dụng fake port để cưỡng bức fallback
    process.env.DEV_DB_POSTGRES_PORT = '59999'

    try {
      const handle = await setupTestEnvironment(
        'postgres',
        undefined,
        undefined,
        mockFactory,
      )

      expect(mockFactory).toHaveBeenCalled()
      expect(handle.isStaticStack).toBe(false)
      expect(handle.profile.port).toBe(54999)

      await handle.teardown()
      expect(mockStop).toHaveBeenCalled()
    } finally {
      delete process.env.DEV_DB_POSTGRES_PORT
    }
  })

  it('setupTestEnvironment ném lỗi rõ ràng khi không có dev-db và không có fallback factory', async () => {
    process.env.DEV_DB_POSTGRES_PORT = '59999'

    try {
      await expect(
        setupTestEnvironment('postgres', undefined, undefined, undefined),
      ).rejects.toThrow(/chưa sẵn sàng/)
    } finally {
      delete process.env.DEV_DB_POSTGRES_PORT
    }
  })
})
