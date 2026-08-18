import type { SqlDialect } from './dialect'
import { quoteIdentifier } from './dialect'

export interface UserDef {
  username: string
  host?: string
  password?: string
  authPlugin?: string
}

export interface GrantDef {
  privileges: string[]
  database?: string
  table?: string
  grantee: string
  host?: string
  isRevoke?: boolean
  withGrantOption?: boolean
}

/**
 * Generates CREATE/ALTER/DROP USER statements with optional password masking for preview
 */
export function generateUserSql(
  action: 'create' | 'alter' | 'drop',
  user: UserDef,
  dialect: SqlDialect,
  maskPassword = false,
): string {
  const host = user.host || '%'
  const passwordDisplay = maskPassword ? '********' : user.password || ''

  if (dialect === 'mysql') {
    if (action === 'drop') {
      return `DROP USER '${user.username}'@'${host}';`
    }
    if (action === 'create') {
      const pluginClause = user.authPlugin ? ` WITH ${user.authPlugin}` : ''
      const identifiedClause = user.password ? ` IDENTIFIED BY '${passwordDisplay}'` : ''
      return `CREATE USER '${user.username}'@'${host}'${pluginClause}${identifiedClause};`
    }
    // Alter
    if (user.password) {
      return `ALTER USER '${user.username}'@'${host}' IDENTIFIED BY '${passwordDisplay}';`
    }
    return `-- No changes for '${user.username}'@'${host}'`
  }

  // PostgreSQL
  if (action === 'drop') {
    return `DROP ROLE "${user.username}";`
  }
  if (action === 'create') {
    const pwd = user.password ? ` PASSWORD '${passwordDisplay}'` : ''
    return `CREATE ROLE "${user.username}" WITH LOGIN${pwd};`
  }
  // Alter
  if (user.password) {
    return `ALTER ROLE "${user.username}" WITH PASSWORD '${passwordDisplay}';`
  }
  return `-- No changes for "${user.username}"`
}

/**
 * Generates GRANT / REVOKE statements for privileges
 */
export function generateGrantSql(grant: GrantDef, dialect: SqlDialect): string {
  const privs = grant.privileges.join(', ')
  const target =
    grant.table && grant.database
      ? `${quoteIdentifier(grant.database, dialect)}.${quoteIdentifier(grant.table, dialect)}`
      : grant.database
      ? `${quoteIdentifier(grant.database, dialect)}.*`
      : '*.*'

  const grantee =
    dialect === 'mysql'
      ? `'${grant.grantee}'@'${grant.host || '%'}'`
      : `"${grant.grantee}"`

  if (grant.isRevoke) {
    return `REVOKE ${privs} ON ${target} FROM ${grantee};`
  }

  const withGrant = grant.withGrantOption ? ' WITH GRANT OPTION' : ''
  return `GRANT ${privs} ON ${target} TO ${grantee}${withGrant};`
}
