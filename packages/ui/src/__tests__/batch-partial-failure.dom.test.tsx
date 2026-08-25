import { describe, expect, it, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { DdlPartialFailureDialog } from '../components/dialogs/DdlPartialFailureDialog'

afterEach(() => {
  cleanup()
})

describe('Batch Partial Failure DOM Tests (T119 / FR-052)', () => {
  it('render DdlPartialFailureDialog hiển thị chi tiết đối tượng thành công và thất bại', () => {
    const { getByText, getAllByText } = renderStudio(
      <DdlPartialFailureDialog
        tableName="customer"
        steps={[
          { statement: 'ALTER TABLE customer ADD COLUMN vip INT;', status: 'success' },
          { statement: 'ALTER TABLE customer ADD CONSTRAINT fk_tier FOREIGN KEY (tier_id) REFERENCES tiers(id);', status: 'failed', errorMessage: 'Foreign key constraint fails' },
        ]}
        onClose={() => {}}
      />,
    )

    expect(getAllByText(/customer/i).length).toBeGreaterThan(0)
    expect(getByText(/Foreign key constraint fails/i)).toBeDefined()
  })
})
