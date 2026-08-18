export type BackupErrorCode =
  | 'DISK_FULL'
  | 'BACKUP_CORRUPT'
  | 'RESTORE_PARTIAL'
  | 'PERMISSION_DENIED'
  | 'UNSUPPORTED_VERSION'

export interface BackupErrorResult {
  code: BackupErrorCode
  userMessage: string
  remedyAction: string
  partialState?: {
    executedStatements: number
    failedStatement?: string
  }
}

export class BackupErrorHandler {
  public static handleDiskFull(availableBytes: number, requiredBytes: number): BackupErrorResult {
    const availMb = (availableBytes / (1024 * 1024)).toFixed(1)
    const reqMb = (requiredBytes / (1024 * 1024)).toFixed(1)
    return {
      code: 'DISK_FULL',
      userMessage: `Không đủ dung lượng đĩa trống để tạo file backup (Trống: ${availMb} MB, Cần: ${reqMb} MB).`,
      remedyAction: 'Vui lòng giải phóng dung lượng đĩa hoặc chọn thư mục lưu trữ khác.',
    }
  }

  public static handleBackupCorrupt(reason: string): BackupErrorResult {
    return {
      code: 'BACKUP_CORRUPT',
      userMessage: `Tệp sao lưu bị hỏng hoặc không đúng định dạng: ${reason}`,
      remedyAction: 'Vui lòng kiểm tra lại checksum SHA-256 của file hoặc tạo lại file backup mới.',
    }
  }

  public static handleRestorePartial(
    executedStatements: number,
    failedStatement: string,
    errorMsg: string,
  ): BackupErrorResult {
    return {
      code: 'RESTORE_PARTIAL',
      userMessage: `Khôi phục bị gián đoạn sau ${executedStatements} câu lệnh do lỗi: ${errorMsg}`,
      remedyAction: 'Nếu không bật transaction, một số bảng đã được tạo. Vui lòng kiểm tra lại schema.',
      partialState: {
        executedStatements,
        failedStatement,
      },
    }
  }
}
