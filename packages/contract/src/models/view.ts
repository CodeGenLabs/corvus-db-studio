export type ContentKind = 'objectList' | 'data' | 'design' | 'definition' | 'er' | 'objects'

export type ToolKind = 'sql' | 'compare' | 'backup' | 'jobs' | 'monitor'

export type View = ContentKind | ToolKind

export type InfoTab = 'info' | 'ddl' | 'activity' | 'ai'

export type DialogId = 'settings' | 'about' | 'updates' | 'users' | 'findInDatabase' | null

export type MenuKey = 'file' | 'edit' | 'view' | 'tools' | 'window' | 'help'
