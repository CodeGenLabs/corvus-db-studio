export interface ExtractedBackupSection {
  type: 'ddl' | 'dml' | 'header'
  objectName?: string
  sql: string
}

export interface ExtractedBackupMetadata {
  database?: string
  dialect?: string
  createdAt?: string
  version?: string
  tables?: string[]
}

/**
 * Extracts metadata properties from backup SQL header comments
 */
export function extractBackupMetadata(headerContent: string): ExtractedBackupMetadata | null {
  const lines = headerContent.split('\n')
  const meta: ExtractedBackupMetadata = {}

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('-- Database:')) {
      meta.database = trimmed.replace('-- Database:', '').trim()
    } else if (trimmed.startsWith('-- Dialect:')) {
      meta.dialect = trimmed.replace('-- Dialect:', '').trim()
    } else if (trimmed.startsWith('-- CreatedAt:')) {
      meta.createdAt = trimmed.replace('-- CreatedAt:', '').trim()
    } else if (trimmed.startsWith('-- Version:')) {
      meta.version = trimmed.replace('-- Version:', '').trim()
    }
  }

  return Object.keys(meta).length > 0 ? meta : null
}

/**
 * Extracts SQL statements and sections from raw backup SQL text without storing full temporary database files
 */
export function extractSqlFromBackup(backupContent: string): ExtractedBackupSection[] {
  const sections: ExtractedBackupSection[] = []
  const lines = backupContent.split('\n')

  let currentSection: ExtractedBackupSection | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('-- CORVUS BACKUP HEADER') || trimmed.startsWith('-- HEADER:')) {
      if (currentSection) sections.push(currentSection)
      currentSection = { type: 'header', sql: line + '\n' }
    } else if (trimmed.startsWith('CREATE TABLE') || trimmed.startsWith('CREATE VIEW') || trimmed.startsWith('CREATE PROCEDURE') || trimmed.startsWith('CREATE FUNCTION')) {
      if (currentSection) sections.push(currentSection)
      const parts = trimmed.split(' ')
      const objectName = parts[2]?.replace(/[`"']/g, '')
      currentSection = { type: 'ddl', objectName, sql: line + '\n' }
    } else if (trimmed.startsWith('INSERT INTO') || trimmed.startsWith('COPY ')) {
      if (currentSection && currentSection.type !== 'dml') {
        sections.push(currentSection)
        currentSection = { type: 'dml', sql: line + '\n' }
      } else if (currentSection) {
        currentSection.sql += line + '\n'
      } else {
        currentSection = { type: 'dml', sql: line + '\n' }
      }
    } else if (currentSection) {
      currentSection.sql += line + '\n'
    }
  }

  if (currentSection) {
    sections.push(currentSection)
  }

  return sections
}
