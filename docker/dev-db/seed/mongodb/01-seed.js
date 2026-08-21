/* global db, NumberDecimal, NumberLong, BinData */
// MongoDB Seed Script for corvus_dev
// data-model.md §2, FR-010, FR-011

const dbName = 'corvus_dev'
const targetDb = db.getSiblingDB(dbName)

try {
  targetDb.createUser({
    user: 'corvus',
    pwd: 'corvus_dev_pw',
    roles: [{ role: 'readWrite', db: 'corvus_dev' }, { role: 'dbAdmin', db: 'corvus_dev' }],
  })
} catch {
  // User might already exist
}

try {
  db.getSiblingDB('admin').createUser({
    user: 'corvus',
    pwd: 'corvus_dev_pw',
    roles: [{ role: 'root', db: 'admin' }],
  })
} catch {
  // User might already exist
}

// 1. Country collection
targetDb.country.drop()
targetDb.country.createIndex({ country: 1 }, { unique: true })
targetDb.country.insertMany([
  { country_id: 1, country: 'Việt Nam', iso_code: 'VN', last_update: new Date('2026-01-01T00:00:00Z') },
  { country_id: 2, country: 'Japan', iso_code: 'JP', last_update: new Date('2026-01-01T00:00:00Z') },
  { country_id: 3, country: 'Brazil', iso_code: 'BR', last_update: new Date('2026-01-01T00:00:00Z') },
  { country_id: 4, country: 'United States', iso_code: 'US', last_update: new Date('2026-01-01T00:00:00Z') },
  { country_id: 5, country: 'Germany', iso_code: 'DE', last_update: new Date('2026-01-01T00:00:00Z') },
])

// 2. City collection
targetDb.city.drop()
targetDb.city.createIndex({ country_id: 1 })
targetDb.city.insertMany([
  { city_id: 1, country_id: 1, city: 'Hà Nội', note: null },
  { city_id: 2, country_id: 1, city: 'Đà Nẵng', note: '' },
  { city_id: 3, country_id: 2, city: 'Tokyo', note: 'thủ đô' },
  { city_id: 4, country_id: 3, city: 'São Paulo', note: 'kinh tế' },
  { city_id: 5, country_id: 4, city: 'New York', note: 'tài chính' },
])

// 3. order_details collection
targetDb.order_details.drop()
targetDb.order_details.insertOne({
  id: 1,
  'sản lượng': NumberDecimal('1250.5000'),
  select: 'standard selection',
})

// 4. types_probe collection
targetDb.types_probe.drop()
targetDb.types_probe.insertOne({
  id: 1,
  big_val: NumberLong('9223372036854775807'),
  numeric_val: NumberDecimal('12345678901234567890.0123456789'),
  bool_val: true,
  text_null: null,
  text_empty: '',
  json_val: { a: [1, 2, 3] },
  bytes_val: BinData(0, '3q2+7w=='), // 0xdeadbeef
  ts_val: new Date('2026-08-18T09:00:00Z'),
})

// 5. Customer collection
targetDb.customer.drop()
targetDb.customer.createIndex({ email: 1 }, { unique: true })
targetDb.customer.createIndex({ country_id: 1 })
targetDb.customer.insertMany([
  { customer_id: 1, country_id: 1, email: 'customer0001@example.invalid', full_name: 'Nguyen Van A', created_at: new Date('2026-01-01T08:00:00Z'), is_active: true },
  { customer_id: 2, country_id: 1, email: 'customer0002@example.invalid', full_name: 'Tran Thi B', created_at: new Date('2026-01-02T09:30:00Z'), is_active: true },
  { customer_id: 3, country_id: 2, email: 'customer0003@example.invalid', full_name: 'Kenji Sato', created_at: new Date('2026-01-03T10:15:00Z'), is_active: true },
  { customer_id: 4, country_id: 2, email: 'customer0004@example.invalid', full_name: 'Yuki Tanaka', created_at: new Date('2026-01-04T11:00:00Z'), is_active: false },
  { customer_id: 5, country_id: 3, email: 'customer0005@example.invalid', full_name: 'Lucas Silva', created_at: new Date('2026-01-05T12:45:00Z'), is_active: true },
  { customer_id: 6, country_id: 3, email: 'customer0006@example.invalid', full_name: 'Beatriz Souza', created_at: new Date('2026-01-06T14:20:00Z'), is_active: true },
  { customer_id: 7, country_id: 4, email: 'customer0007@example.invalid', full_name: 'John Doe', created_at: new Date('2026-01-07T15:10:00Z'), is_active: true },
  { customer_id: 8, country_id: 4, email: 'customer0008@example.invalid', full_name: 'Jane Smith', created_at: new Date('2026-01-08T16:00:00Z'), is_active: true },
  { customer_id: 9, country_id: 5, email: 'customer0009@example.invalid', full_name: 'Hans Mueller', created_at: new Date('2026-01-09T17:30:00Z'), is_active: false },
  { customer_id: 10, country_id: 5, email: 'customer0010@example.invalid', full_name: 'Emma Weber', created_at: new Date('2026-01-10T18:00:00Z'), is_active: true },
])

// 6. order_log collection (~100,000 documents)
targetDb.order_log.drop()
targetDb.order_log.createIndex({ customer_id: 1 })
targetDb.order_log.createIndex({ placed_at: 1 })
targetDb.order_log.createIndex({ status: 1 })

const statuses = ['completed', 'pending', 'shipped', 'cancelled']
const baseTime = new Date('2026-01-01T00:00:00Z').getTime()
const batchSize = 10000
for (let batch = 0; batch < 10; batch++) {
  const docs = []
  for (let i = 1; i <= batchSize; i++) {
    const s = batch * batchSize + i
    docs.push({
      order_log_id: s,
      customer_id: ((s - 1) % 10) + 1,
      amount: NumberDecimal((((s * 17) % 50000 + 1000) / 100).toFixed(2)),
      status: statuses[s % 4],
      placed_at: new Date(baseTime + s * 60000),
    })
  }
  targetDb.order_log.insertMany(docs)
}

// 7. Marker collection
targetDb.corvus_env_marker.drop()
targetDb.corvus_env_marker.insertOne({
  key: 'corvus_dev',
  value: 'ready',
  seeded_at: new Date('2026-01-01T00:00:00Z'),
  seed_version: '1.0.0',
})

print('[mongodb-seed] Hoàn tất nạp dữ liệu mẫu cho corvus_dev')
