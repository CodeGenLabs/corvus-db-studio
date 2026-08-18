export interface GridCoordinate {
  rowIndex: number
  colIndex: number
}

export function handleGridKeyNavigation(
  e: React.KeyboardEvent,
  current: GridCoordinate,
  maxRows: number,
  maxCols: number,
): GridCoordinate | null {
  const { rowIndex, colIndex } = current

  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault()
      return { rowIndex: Math.max(0, rowIndex - 1), colIndex }
    case 'ArrowDown':
      e.preventDefault()
      return { rowIndex: Math.min(maxRows - 1, rowIndex + 1), colIndex }
    case 'ArrowLeft':
      e.preventDefault()
      return { rowIndex, colIndex: Math.max(0, colIndex - 1) }
    case 'ArrowRight':
      e.preventDefault()
      return { rowIndex, colIndex: Math.min(maxCols - 1, colIndex + 1) }
    case 'Home':
      e.preventDefault()
      return { rowIndex: e.ctrlKey ? 0 : rowIndex, colIndex: 0 }
    case 'End':
      e.preventDefault()
      return { rowIndex: e.ctrlKey ? maxRows - 1 : rowIndex, colIndex: maxCols - 1 }
    case 'PageUp':
      e.preventDefault()
      return { rowIndex: Math.max(0, rowIndex - 20), colIndex }
    case 'PageDown':
      e.preventDefault()
      return { rowIndex: Math.min(maxRows - 1, rowIndex + 20), colIndex }
    default:
      return null
  }
}
