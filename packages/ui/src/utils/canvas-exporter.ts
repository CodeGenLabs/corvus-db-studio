export function exportSvgToBlob(svgElement: SVGSVGElement): Blob {
  const serializer = new XMLSerializer()
  const source = serializer.serializeToString(svgElement)
  return new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportCanvasToPng(svgElement: SVGSVGElement, filename = 'erd-diagram.png'): void {
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(svgElement)
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  const image = new Image()
  image.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = svgElement.clientWidth || 1200
    canvas.height = svgElement.clientHeight || 800
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, filename)
        }
      }, 'image/png')
    }
    URL.revokeObjectURL(url)
  }
  image.src = url
}
