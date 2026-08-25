import { ContextMenu } from '../ContextMenu'
import { useActiveContext } from '../../context/useActiveContext'
import { useStudio, useClient } from '../../store/studio'
import type { ObjectKind, DialogId } from '@corvus/contract'

export interface ObjectContextMenuProps {
  x: number
  y: number
  objectName: string
  objectType: ObjectKind
  onClose: () => void
}

export function ObjectContextMenu({
  x,
  y,
  onClose,
}: ObjectContextMenuProps) {
  const ctx = useActiveContext()
  const client = useClient()
  const { openTab, set } = useStudio()

  return (
    <ContextMenu
      x={x}
      y={y}
      surface="ctx-nav"
      targetKind="object"
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
