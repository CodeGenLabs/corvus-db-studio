export interface ResultChunk<T = any> {
  rows: T[]
  isLastChunk: boolean
  totalCount?: number
}

export class ResultRingBuffer<T = any> {
  private buffer: T[] = []
  private maxCapacity: number

  constructor(maxCapacity: number = 200_000) {
    this.maxCapacity = maxCapacity
  }

  public appendChunk(chunk: ResultChunk<T>): void {
    this.buffer.push(...chunk.rows)
    if (this.buffer.length > this.maxCapacity) {
      // Trim from beginning if exceeded max capacity
      const excess = this.buffer.length - this.maxCapacity
      this.buffer.splice(0, excess)
    }
  }

  public getRows(): readonly T[] {
    return this.buffer
  }

  public getLength(): number {
    return this.buffer.length
  }

  public clear(): void {
    this.buffer = []
  }
}
