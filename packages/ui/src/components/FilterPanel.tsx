import { useState, useEffect } from 'react'
import type { ColumnDef } from '@corvus/contract'
import { quoteIdentifier } from '@corvus/sql'
import { useStudio } from '../store/studio'

export interface FilterPanelProps {
  columns?: ColumnDef[]
  initialClause?: string
  onApplyFilter?: (clause: string) => void
  onClose?: () => void
}

export interface FilterRuleItem {
  id: string
  join: 'AND' | 'OR'
  field: string
  op: string
  value: string
  value2?: string
}

export interface SortRuleItem {
  id: string
  field: string
  dir: 'ASC' | 'DESC'
}

const OPERATORS = [
  { label: '=', value: '=' },
  { label: '!=', value: '!=' },
  { label: '<', value: '<' },
  { label: '<=', value: '<=' },
  { label: '>', value: '>' },
  { label: '>=', value: '>=' },
  { label: 'contains', value: 'LIKE' },
  { label: 'starts with', value: 'STARTS_WITH' },
  { label: 'ends with', value: 'ENDS_WITH' },
  { label: 'is null', value: 'IS NULL' },
  { label: 'is not null', value: 'IS NOT NULL' },
  { label: 'between', value: 'BETWEEN' },
]

export function FilterPanel({
  columns = [],
  initialClause = '',
  onApplyFilter,
  onClose,
}: FilterPanelProps) {
  const { t } = useStudio()
  const firstCol = columns[0]?.name || 'id'

  const [rules, setRules] = useState<FilterRuleItem[]>([
    { id: '1', join: 'AND', field: firstCol, op: '=', value: '' },
  ])
  const [sortRules, setSortRules] = useState<SortRuleItem[]>([])
  const [mode, setMode] = useState<'builder' | 'text'>('builder')
  const [customText, setCustomText] = useState(initialClause)

  useEffect(() => {
    if (initialClause) {
      setCustomText(initialClause)
    }
  }, [initialClause])

  const addRule = () => {
    setRules([
      ...rules,
      { id: String(Date.now()), join: 'AND', field: firstCol, op: '=', value: '' },
    ])
  }

  const removeRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id))
  }

  const updateRule = (id: string, partial: Partial<FilterRuleItem>) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, ...partial } : r)))
  }

  const addSortRule = () => {
    setSortRules([
      ...sortRules,
      { id: String(Date.now()), field: firstCol, dir: 'ASC' },
    ])
  }

  const removeSortRule = (id: string) => {
    setSortRules(sortRules.filter((s) => s.id !== id))
  }

  const updateSortRule = (id: string, partial: Partial<SortRuleItem>) => {
    setSortRules(sortRules.map((s) => (s.id === id ? { ...s, ...partial } : s)))
  }

  const quoteWhereClause = (): string => {
    if (mode === 'text') return customText
    const validRules = rules.filter((r) => r.field && (r.op.includes('NULL') || r.value !== ''))
    if (!validRules.length) return ''
    return validRules
      .map((r, i) => {
        const safePrefix = i === 0 ? '' : r.join + ' '
        const quotedField = quoteIdentifier(r.field)
        if (r.op === 'IS NULL' || r.op === 'IS NOT NULL') {
          return safePrefix + quotedField + ' ' + r.op
        }
        const safeVal = r.value.replace(/'/g, "''")
        if (r.op === 'LIKE') {
          return safePrefix + quotedField + " LIKE '%" + safeVal + "%'"
        }
        if (r.op === 'STARTS_WITH') {
          return safePrefix + quotedField + " LIKE '" + safeVal + "%'"
        }
        if (r.op === 'ENDS_WITH') {
          return safePrefix + quotedField + " LIKE '%" + safeVal + "'"
        }
        if (r.op === 'BETWEEN') {
          const safeVal2 = (r.value2 || '').replace(/'/g, "''")
          return safePrefix + quotedField + " BETWEEN '" + safeVal + "' AND '" + safeVal2 + "'"
        }
        const safeLiteral = /^[0-9.]+$/.test(r.value) ? r.value : "'" + safeVal + "'"
        return safePrefix + quotedField + ' ' + r.op + ' ' + safeLiteral
      })
      .join(' ')
  }

  const handleApply = () => {
    const clause = quoteWhereClause()
    onApplyFilter?.(clause)
  }

  const handleClear = () => {
    setRules([{ id: '1', join: 'AND', field: firstCol, op: '=', value: '' }])
    setSortRules([])
    setCustomText('')
    onApplyFilter?.('')
  }

  const safeClausePreview = quoteWhereClause()

  return (
    <div
      data-testid="filter-panel"
      style={{
        flex: 'none',
        borderBottom: '1px solid var(--border-strong)',
        background: 'var(--pane2)',
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* ── Header Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase' }}>
            {t.filterAndSort}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="radio"
                name="filterMode"
                checked={mode === 'builder'}
                onChange={() => setMode('builder')}
              />
              Builder
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="radio"
                name="filterMode"
                checked={mode === 'text'}
                onChange={() => setMode('text')}
              />
              SQL
            </label>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            data-testid="btn-close-filter-panel"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text3)',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Filter Conditions Area ── */}
      {mode === 'builder' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rules.map((rule, idx) => (
            <div key={rule.id} data-testid={'filter-rule-' + idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {idx > 0 ? (
                <select
                  data-testid={'select-rule-join-' + idx}
                  value={rule.join}
                  onChange={(e) => updateRule(rule.id, { join: e.target.value as 'AND' | 'OR' })}
                  style={{
                    width: 60,
                    height: 22,
                    fontSize: 11,
                    background: 'var(--pane)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    borderRadius: 3,
                  }}
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              ) : (
                <span style={{ width: 60, fontSize: 11, color: 'var(--text3)', textAlign: 'right', paddingRight: 4 }}>
                  WHERE
                </span>
              )}

              {/* Column Selector */}
              <select
                data-testid={'select-rule-field-' + idx}
                value={rule.field}
                onChange={(e) => updateRule(rule.id, { field: e.target.value })}
                style={{
                  minWidth: 120,
                  height: 22,
                  fontSize: 11,
                  fontFamily: 'var(--mono)',
                  background: 'var(--pane)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  borderRadius: 3,
                }}
              >
                {columns.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Operator Selector */}
              <select
                data-testid={'select-rule-op-' + idx}
                value={rule.op}
                onChange={(e) => updateRule(rule.id, { op: e.target.value })}
                style={{
                  width: 100,
                  height: 22,
                  fontSize: 11,
                  background: 'var(--pane)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  borderRadius: 3,
                }}
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>

              {/* Value Input */}
              {!rule.op.includes('NULL') && (
                <input
                  type="text"
                  data-testid={'input-rule-value-' + idx}
                  value={rule.value}
                  placeholder="Value…"
                  onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                  style={{
                    flex: 1,
                    maxWidth: 200,
                    height: 22,
                    fontSize: 11,
                    fontFamily: 'var(--mono)',
                    padding: '0 6px',
                    background: 'var(--pane)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    borderRadius: 3,
                  }}
                />
              )}

              {/* Second value input for BETWEEN */}
              {rule.op === 'BETWEEN' && (
                <>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>AND</span>
                  <input
                    type="text"
                    data-testid={'input-rule-value2-' + idx}
                    value={rule.value2 || ''}
                    placeholder="Value 2…"
                    onChange={(e) => updateRule(rule.id, { value2: e.target.value })}
                    style={{
                      flex: 1,
                      maxWidth: 200,
                      height: 22,
                      fontSize: 11,
                      fontFamily: 'var(--mono)',
                      padding: '0 6px',
                      background: 'var(--pane)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      borderRadius: 3,
                    }}
                  />
                </>
              )}

              {rules.length > 1 && (
                <button
                  type="button"
                  data-testid={'btn-remove-rule-' + idx}
                  onClick={() => removeRule(rule.id)}
                  style={{
                    width: 22,
                    height: 22,
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--red)',
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <button
              type="button"
              data-testid="btn-add-condition"
              onClick={addRule}
              style={{
                padding: '2px 8px',
                background: 'transparent',
                border: '1px dashed var(--border-strong)',
                borderRadius: 3,
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              + {t.addCondition}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <textarea
            data-testid="textarea-filter-sql"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="status = 1 AND age > 25"
            style={{
              width: '100%',
              height: 60,
              padding: '6px 8px',
              fontSize: 11.5,
              fontFamily: 'var(--mono)',
              background: 'var(--pane)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text)',
              resize: 'vertical',
            }}
          />
        </div>
      )}

      {/* ── Sort Rules Area ── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text3)' }}>ORDER BY:</span>
          {sortRules.map((sRule, sIdx) => (
            <div key={sRule.id} data-testid={'sort-rule-' + sIdx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <select
                data-testid={'select-sort-field-' + sIdx}
                value={sRule.field}
                onChange={(e) => updateSortRule(sRule.id, { field: e.target.value })}
                style={{
                  height: 20,
                  fontSize: 10.5,
                  fontFamily: 'var(--mono)',
                  background: 'var(--pane)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  borderRadius: 2,
                }}
              >
                {columns.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                data-testid={'btn-toggle-sort-dir-' + sIdx}
                onClick={() => updateSortRule(sRule.id, { dir: sRule.dir === 'ASC' ? 'DESC' : 'ASC' })}
                style={{
                  height: 20,
                  padding: '0 4px',
                  fontSize: 10,
                  fontWeight: 600,
                  background: 'var(--pane)',
                  border: '1px solid var(--border)',
                  color: 'var(--accent)',
                  borderRadius: 2,
                  cursor: 'pointer',
                }}
              >
                {sRule.dir}
              </button>

              <button
                type="button"
                data-testid={'btn-remove-sort-' + sIdx}
                onClick={() => removeSortRule(sRule.id)}
                style={{
                  height: 20,
                  width: 18,
                  padding: 0,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text3)',
                  cursor: 'pointer',
                  fontSize: 10,
                }}
              >
                ✕
              </button>
            </div>
          ))}

          <button
            type="button"
            data-testid="btn-add-sort"
            onClick={addSortRule}
            style={{
              height: 20,
              padding: '0 6px',
              background: 'transparent',
              border: '1px dashed var(--border)',
              borderRadius: 2,
              color: 'var(--text2)',
              cursor: 'pointer',
              fontSize: 10.5,
            }}
          >
            + Sort
          </button>
        </div>
      </div>

      {/* ── Actions Footer ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            data-testid="btn-apply-filter"
            onClick={handleApply}
            style={{
              padding: '4px 12px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 3,
              color: 'var(--on-accent)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            {t.applyFilter}
          </button>
          <button
            type="button"
            data-testid="btn-clear-filter"
            onClick={handleClear}
            style={{
              padding: '4px 10px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 3,
              color: 'var(--text2)',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            {t.clearFilter}
          </button>
        </div>

        <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>
          {safeClausePreview ? 'WHERE ' + safeClausePreview : '-- no criteria'}
        </span>
      </div>
    </div>
  )
}
