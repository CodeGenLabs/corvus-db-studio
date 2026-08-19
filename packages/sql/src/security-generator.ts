import type { SqlDialect } from './dialect'
import { quoteIdentifier, quoteLiteral } from './dialect'

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
    const quotedAccount = `${quoteLiteral(user.username, 'mysql')}@${quoteLiteral(host, 'mysql')}`
    if (action === 'drop') {
      return `DROP USER ${quotedAccount};`
    }
    if (action === 'create') {
      const safePluginClause = user.authPlugin ? ` WITH ${quoteIdentifier(user.authPlugin, 'mysql')}` : ''
      const safeIdentifiedClause = user.password ? ` IDENTIFIED BY ${quoteLiteral(passwordDisplay, 'mysql')}` : ''
      return `CREATE USER ${quotedAccount}${safePluginClause}${safeIdentifiedClause};`
    }
    // Alter
    if (user.password) {
      return `ALTER USER ${quotedAccount} IDENTIFIED BY ${quoteLiteral(passwordDisplay, 'mysql')};`
    }
    return `-- No changes for ${quotedAccount}`
  }

  // PostgreSQL
  const quotedRole = quoteIdentifier(user.username, 'postgres')
  if (action === 'drop') {
    return `DROP ROLE ${quotedRole};`
  }
  if (action === 'create') {
    const safePwd = user.password ? ` PASSWORD ${quoteLiteral(passwordDisplay, 'postgres')}` : ''
    return `CREATE ROLE ${quotedRole} WITH LOGIN${safePwd};`
  }
  // Alter
  if (user.password) {
    return `ALTER ROLE ${quotedRole} WITH PASSWORD ${quoteLiteral(passwordDisplay, 'postgres')};`
  }
  return `-- No changes for ${quotedRole}`
}

/**
 * Generates GRANT / REVOKE statements for privileges
 */
export function generateGrantSql(grant: GrantDef, dialect: SqlDialect): string {
  const safePrivs = grant.privileges.join(', ')
  const quotedTarget =
    grant.table && grant.database
      ? `${quoteIdentifier(grant.database, dialect)}.${quoteIdentifier(grant.table, dialect)}`
      : grant.database
      ? `${quoteIdentifier(grant.database, dialect)}.*`
      : '*.*'

  const quotedGrantee =
    dialect === 'mysql'
      ? `${quoteLiteral(grant.grantee, 'mysql')}@${quoteLiteral(grant.host || '%', 'mysql')}`
      : quoteIdentifier(grant.grantee, dialect)

  if (grant.isRevoke) {
    return `REVOKE ${safePrivs} ON ${quotedTarget} FROM ${quotedGrantee};`
  }

  const safeWithGrant = grant.withGrantOption ? ' WITH GRANT OPTION' : ''
  return `GRANT ${safePrivs} ON ${quotedTarget} TO ${quotedGrantee}${safeWithGrant};`
}
