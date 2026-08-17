import type { DriverId } from '@corvus/contract'
import type { DatabaseDriver } from './types'

class DriverRegistry {
  private readonly drivers = new Map<DriverId, DatabaseDriver>()

  register(driver: DatabaseDriver): void {
    if (this.drivers.has(driver.id)) {
      throw new Error(`Driver with id '${driver.id}' is already registered`)
    }
    this.drivers.set(driver.id, driver)
  }

  get(id: DriverId): DatabaseDriver | undefined {
    return this.drivers.get(id)
  }

  list(): DatabaseDriver[] {
    return Array.from(this.drivers.values())
  }

  has(id: DriverId): boolean {
    return this.drivers.has(id)
  }
}

export const driverRegistry = new DriverRegistry()

export function registerDriver(driver: DatabaseDriver): void {
  driverRegistry.register(driver)
}

export function getDriver(id: DriverId): DatabaseDriver | undefined {
  return driverRegistry.get(id)
}

export function listDrivers(): DatabaseDriver[] {
  return driverRegistry.list()
}
