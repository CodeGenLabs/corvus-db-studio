export interface ServerVersionInfo {
  contractVersion: string
  clientSupportedMinVersion: string
  isCompatible: boolean
}

export class VersionCheckManager {
  public static checkCompatibility(
    serverContractVersion: string,
    clientContractVersion: string,
  ): boolean {
    const [sMajor] = serverContractVersion.split('.')
    const [cMajor] = clientContractVersion.split('.')

    // Breaking major mismatch triggers HTTP 426 / Reload Screen
    return sMajor === cMajor
  }
}
