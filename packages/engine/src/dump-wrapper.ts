import { spawn, type ChildProcess } from 'node:child_process'

export interface DumpWrapperOptions {
  engine: 'postgres' | 'mysql'
  host: string
  port: number
  database: string
  user: string
  password?: string
  outputFilePath: string
}

export class NativeDumpWrapper {
  /**
   * Spawns native mysqldump or pg_dump process if available on host system
   */
  public static executeDump(options: DumpWrapperOptions): Promise<{ exitCode: number }> {
    return new Promise((resolve, reject) => {
      const binary = options.engine === 'postgres' ? 'pg_dump' : 'mysqldump'
      const args: string[] = []

      if (options.engine === 'postgres') {
        args.push('-h', options.host, '-p', String(options.port), '-U', options.user, '-f', options.outputFilePath, options.database)
      } else {
        args.push('-h', options.host, '-P', String(options.port), '-u', options.user, `-r${options.outputFilePath}`, options.database)
      }

      const env = { ...process.env }
      if (options.password) {
        if (options.engine === 'postgres') env.PGPASSWORD = options.password
        else if (options.engine === 'mysql') env.MYSQL_PWD = options.password
      }

      let child: ChildProcess
      try {
        child = spawn(binary, args, { env })
      } catch (err) {
        return reject(err)
      }

      child.on('error', (err) => reject(err))
      child.on('close', (code) => {
        resolve({ exitCode: code ?? 0 })
      })
    })
  }
}
