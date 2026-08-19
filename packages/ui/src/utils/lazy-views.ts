import React from 'react'

/**
 * Helper to dynamically load heavy studio views on demand to keep initial gzip bundle <= 900KB
 */
export function createLazyView<P extends object, T extends React.ComponentType<P> = React.ComponentType<P>>(
  factory: () => Promise<{ default: T } | T>,
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const loaded = await factory()
    // Module có thể export default hoặc export chính component (interop CJS/ESM).
    return 'default' in loaded ? { default: loaded.default } : { default: loaded }
  })
}
