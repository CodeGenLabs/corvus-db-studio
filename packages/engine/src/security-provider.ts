import { quoteIdentifier, quoteLiteral } from '@corvus/sql'

export interface SecurityUserSpec {
  username: string
  password?: string
  roles?: string[]
  canLogin?: boolean
  isSuperuser?: boolean
}

export interface SecurityGrantSpec {
  grantee: string
  isRole?: boolean
  privileges: string[]
  database?: string
  schema?: string
  table?: string
  withGrantOption?: boolean
}

export class EngineSecurityProvider {
  public static generateCreateUser(dialect: 'postgres' | 'mysql' | 'sqlite', user: SecurityUserSpec): string {
    if (dialect === 'postgres') {
      const safeLogin = user.canLogin !== false ? 'LOGIN' : 'NOLOGIN'
      const safeSuperuser = user.isSuperuser ? 'SUPERUSER' : 'NOSUPERUSER'
      const safePwd = user.password ? ` PASSWORD ${quoteLiteral(user.password, 'postgres')}` : ''
      const quotedRole = quoteIdentifier(user.username, 'postgres')
      return `CREATE ROLE ${quotedRole} WITH ${safeLogin} ${safeSuperuser}${safePwd};`
    }

    if (dialect === 'mysql') {
      const safePwd = user.password ? ` IDENTIFIED BY ${quoteLiteral(user.password, 'mysql')}` : ''
      const quotedAccount = `${quoteLiteral(user.username, 'mysql')}@'%'`
      return `CREATE USER ${quotedAccount}${safePwd};`
    }

    return `-- SQLite does not support server-level users`
  }

  public static generateGrant(dialect: 'postgres' | 'mysql' | 'sqlite', grant: SecurityGrantSpec): string {
    const safePrivs = grant.privileges.join(', ')
    const safeWithOption = grant.withGrantOption ? ' WITH GRANT OPTION' : ''

    if (dialect === 'postgres') {
      let quotedTarget = 'ALL TABLES IN SCHEMA public'
      if (grant.table) {
        quotedTarget = `TABLE ${grant.schema ? `${quoteIdentifier(grant.schema, 'postgres')}.${quoteIdentifier(grant.table, 'postgres')}` : quoteIdentifier(grant.table, 'postgres')}`
      }
      const quotedGrantee = quoteIdentifier(grant.grantee, 'postgres')
      return `GRANT ${safePrivs} ON ${quotedTarget} TO ${quotedGrantee}${safeWithOption};`
    }

    if (dialect === 'mysql') {
      const quotedDb = grant.database ? quoteIdentifier(grant.database, 'mysql') : '*'
      const quotedTbl = grant.table ? quoteIdentifier(grant.table, 'mysql') : '*'
      const quotedTarget = `${quotedDb}.${quotedTbl}`
      const quotedGrantee = `${quoteLiteral(grant.grantee, 'mysql')}@'%'`
      return `GRANT ${safePrivs} ON ${quotedTarget} TO ${quotedGrantee}${safeWithOption};`
    }

    return `-- SQLite does not support GRANT statements`
  }
}
