import type { Command, Surface, TargetKind } from './types'

export class CommandRegistry {
  private readonly commands: Command[] = []
  private readonly commandsById = new Map<string, Command>()

  public register(cmd: Command): void {
    if (this.commandsById.has(cmd.id)) {
      throw new Error(`[CommandRegistry] Lệnh với id "${cmd.id}" đã tồn tại. Không được đăng ký trùng.`)
    }
    this.commands.push(cmd)
    this.commandsById.set(cmd.id, cmd)
  }

  public registerAll(cmds: readonly Command[]): void {
    for (const cmd of cmds) {
      this.register(cmd)
    }
  }

  public get(id: string): Command | undefined {
    return this.commandsById.get(id)
  }

  public all(): readonly Command[] {
    return this.commands
  }

  /**
   * Trả về danh sách lệnh cho bề mặt và mục tiêu theo đúng THỨ TỰ KHAI BÁO (contracts/command-registry.md §4).
   */
  public commandsFor(surface: Surface, target?: TargetKind): readonly Command[] {
    return this.commands.filter((cmd) => {
      const surfaceMatches = cmd.surfaces.includes(surface)
      if (!surfaceMatches) return false
      if (target === undefined) return true
      return cmd.targets.includes(target)
    })
  }

  public clear(): void {
    this.commands.length = 0
    this.commandsById.clear()
  }
}

export const commandRegistry = new CommandRegistry()

export function registerCommand(cmd: Command): void {
  commandRegistry.register(cmd)
}

export function commandsFor(surface: Surface, target?: TargetKind): readonly Command[] {
  return commandRegistry.commandsFor(surface, target)
}
