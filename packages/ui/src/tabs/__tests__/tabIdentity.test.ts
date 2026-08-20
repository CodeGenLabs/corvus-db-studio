import { describe, expect, it } from 'vitest'
import {
  isSameTabIdentity,
  tabIdentityKey,
  tabTitleOf,
  type ObjectTabIdentity,
  type ToolTabIdentity,
} from '../tabIdentity'

describe('Tab Identity (T043 / Invariant IV-F)', () => {
  it('data của bảng X khác design của bảng X (khác ContentKind => hai tab riêng)', () => {
    const dataTab: ObjectTabIdentity = {
      type: 'object',
      contentKind: 'data',
      connectionId: 'conn-1',
      database: 'sakila',
      namespace: 'public',
      objectKind: 'table',
      name: 'film',
    }
    const designTab: ObjectTabIdentity = {
      type: 'object',
      contentKind: 'design',
      connectionId: 'conn-1',
      database: 'sakila',
      namespace: 'public',
      objectKind: 'table',
      name: 'film',
    }
    expect(isSameTabIdentity(dataTab, designTab)).toBe(false)
    expect(tabIdentityKey(dataTab)).not.toBe(tabIdentityKey(designTab))
  })

  it('bán_hàng.đơn_hàng khác kho.đơn_hàng (khác namespace => hai tab riêng)', () => {
    const salesOrder: ObjectTabIdentity = {
      type: 'object',
      contentKind: 'data',
      connectionId: 'conn-1',
      database: 'erp',
      namespace: 'bán_hàng',
      objectKind: 'table',
      name: 'đơn_hàng',
    }
    const warehouseOrder: ObjectTabIdentity = {
      type: 'object',
      contentKind: 'data',
      connectionId: 'conn-1',
      database: 'erp',
      namespace: 'kho',
      objectKind: 'table',
      name: 'đơn_hàng',
    }
    expect(isSameTabIdentity(salesOrder, warehouseOrder)).toBe(false)
    expect(tabIdentityKey(salesOrder)).not.toBe(tabIdentityKey(warehouseOrder))
  })

  it('cùng bảng qua hai lần nhấn cho cùng một danh tính tab', () => {
    const click1: ObjectTabIdentity = {
      type: 'object',
      contentKind: 'data',
      connectionId: 'conn-1',
      database: 'sakila',
      namespace: 'public',
      objectKind: 'table',
      name: 'customer',
    }
    const click2: ObjectTabIdentity = {
      type: 'object',
      contentKind: 'data',
      connectionId: 'conn-1',
      database: 'sakila',
      namespace: 'public',
      objectKind: 'table',
      name: 'customer',
    }
    expect(isSameTabIdentity(click1, click2)).toBe(true)
    expect(tabIdentityKey(click1)).toBe(tabIdentityKey(click2))
  })

  it('hai ToolTabIdentity khác seq là hai tab độc lập', () => {
    const sql1: ToolTabIdentity = {
      type: 'tool',
      toolKind: 'sql',
      seq: 1,
      connectionId: 'conn-1',
    }
    const sql2: ToolTabIdentity = {
      type: 'tool',
      toolKind: 'sql',
      seq: 2,
      connectionId: 'conn-1',
    }
    expect(isSameTabIdentity(sql1, sql2)).toBe(false)
    expect(tabIdentityKey(sql1)).not.toBe(tabIdentityKey(sql2))
    expect(tabTitleOf(sql1)).toBe('SQL Query')
    expect(tabTitleOf(sql2)).toBe('SQL Query #2')
  })
})
