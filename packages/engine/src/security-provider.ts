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
      const login = user.canLogin !== false ? 'LOGIN' : 'NOLOGIN'
      const superuser = user.isSuperuser ? 'SUPERUSER' : 'NOSUPERUSER'
      const pwd = user.password ? ` PASSWORD '${user.password.replace(/'/g, "''")}'` : ''
      return `CREATE ROLE "${user.username.replace(/"/g, '""')}" WITH ${login} ${superuser}${pwd};`
    }

    if (dialect === 'mysql') {
      const pwd = user.password ? ` IDENTIFIED BY '${user.password.replace(/'/g, "''")}'` : ''
      return `CREATE USER '${user.username.replace(/'/g, "\\'")}'@'%'${pwd};`
    }

    return `-- SQLite does not support server-level users`
  }

  public static generateGrant(dialect: 'postgres' | 'mysql' | 'sqlite', grant: SecurityGrantSpec): string {
    const privs = grant.privileges.join(', ')
    let target = 'ALL TABLES IN SCHEMA public'
    if (grant.table) {
      target = `TABLE ${grant.schema ? `"${grant.schema}"."${grant.table}"` : `"${grant.table}"`}`
    }

    if (dialect === 'postgres') {
      const withOption = grant.withGrantOption ? ' WITH GRANT OPTION' : ''
      return `GRANT ${privs} ON ${target} TO "${grant.grantee}"${withOption};`
    }

    if (dialect === 'mysql') {
      const mysqlTarget = grant.table ? `\`${grant.database || '*'}\`.\`${grant.table}\`` : `\`${grant.database || '*'}\`.*`
      const withOption = grant.withGrantOption ? ' WITH GRANT OPTION' : ''
      return `GRANT ${privs} ON ${mysqlTarget} TO '${grant.grantee}'@'%'${withOption};`
    }

    return `-- SQLite does not support GRANT statements`
  }
}
