import React from 'react'

/**
 * Helper to dynamically load heavy studio views on demand to keep initial gzip bundle <= 900KB
 */
export function createLazyView<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T } | T>,
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const module = await factory()
    return 'default' in module ? { default: module.default } : { default: module as any }
  })
}
