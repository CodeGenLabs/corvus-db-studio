import { ContextMenu } from '../ContextMenu'
import { useActiveContext } from '../../context/useActiveContext'
import { useStudio, useClient } from '../../store/studio'
import type { CellValue, DialogId } from '@corvus/contract'

export interface CellContextMenuProps {
  x: number
  y: number
  cellValue?: CellValue
  columnName?: string
  onClose: () => void
  onSetNull?: () => void
  onSetEmptyString?: () => void
  onFilterEquals?: () => void
  onFilterNotEquals?: () => void
  onCopyValue?: () => void
  onOpenCellEditor?: () => void
}

export function CellContextMenu({
  x,
  y,
  onClose,
}: CellContextMenuProps) {
  const ctx = useActiveContext()
  const client = useClient()
  const { openTab, set } = useStudio()

  return (
    <ContextMenu
      x={x}
      y={y}
      surface="ctx-data-grid"
      targetKind="cell"
      activeContext={ctx}
      commandContext={{
        active: ctx,
        client,
        openTab,
        openDialog: (d) => set({ dialog: d as DialogId }),
      }}
      onClose={onClose}
    />
  )
}
