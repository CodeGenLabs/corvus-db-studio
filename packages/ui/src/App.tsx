import type { Transport } from '@corvus/contract'
import { FilterPanel } from './components/FilterPanel'
import { InfoPane } from './components/InfoPane'
import { MenuBar } from './components/MenuBar'
import { NavPane } from './components/NavPane'
import { ObjectToolbar } from './components/ObjectToolbar'
import { StatusBar } from './components/StatusBar'
import { TabStrip } from './components/TabStrip'
import { TitleBar } from './components/TitleBar'
import { Toolbar } from './components/Toolbar'
import { AboutDialog } from './components/dialogs/AboutDialog'
import { CommandPalette } from './components/dialogs/CommandPalette'
import { ConnectionDialog } from './components/dialogs/ConnectionDialog'
import { SettingsDialog } from './components/dialogs/SettingsDialog'
import { UpdatesDialog } from './components/dialogs/UpdatesDialog'
import { UsersDialog } from './components/dialogs/UsersDialog'
import { StudioProvider, useStudio } from './store/studio'
import { BackupView } from './views/BackupView'
import { CompareView } from './views/CompareView'
import { DataView } from './views/DataView'
import { DesignView } from './views/DesignView'
import { ErView } from './views/ErView'
import { JobsView } from './views/JobsView'
import { ObjectsView } from './views/ObjectsView'
import { SqlView } from './views/SqlView'
import { DefinitionView } from './views/DefinitionView'
import { MonitorView } from './views/MonitorView'
import { WelcomeView } from './views/WelcomeView'

function ActiveView() {
  const { s } = useStudio()

  if (s.tabs.length === 0 && !s.selTable && !s.selNode) {
    return <WelcomeView />
  }

  switch (s.view) {
    case 'objects':
    case 'objectList':
      return <ObjectsView />
    case 'data':
      return <DataView />
    case 'definition':
      return <DefinitionView />
    case 'sql':
      return <SqlView />
    case 'compare':
      return <CompareView />
    case 'er':
      return <ErView />
    case 'design':
      return <DesignView />
    case 'backup':
      return <BackupView />
    case 'jobs':
      return <JobsView />
    case 'monitor':
      return <MonitorView />
    default:
      return <WelcomeView />
  }
}

function Shell() {
  const { s, set } = useStudio()
  const filterOpen = s.showFilter && (s.view === 'data' || s.view === 'objects')

  return (
    <div
      data-theme={s.theme}
      data-mono={s.cfg.mono}
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        fontSize: 12,
        lineHeight: 1.35,
        color: 'var(--text)',
        background: 'var(--bg)',
        border: '1px solid var(--border-strong)',
        boxShadow: 'var(--shadow)',
        position: 'relative',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <TitleBar />
      <MenuBar />
      <Toolbar />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <NavPane />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--pane)' }}>
          <TabStrip />
          <ObjectToolbar />
          {filterOpen && <FilterPanel />}
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', position: 'relative' }}>
            <ActiveView />
          </div>
        </div>

        <InfoPane />
      </div>

      <StatusBar />

      {/* Click-away catchers for the two lightweight popovers. */}
      {s.menu && <div onClick={() => set({ menu: null })} style={{ position: 'absolute', inset: 0, zIndex: 40 }} />}
      {s.userMenu && <div onClick={() => set({ userMenu: false })} style={{ position: 'absolute', inset: 0, zIndex: 65 }} />}

      {s.dialog === 'users' && <UsersDialog />}
      {s.dialog === 'settings' && <SettingsDialog />}
      {s.dialog === 'about' && <AboutDialog />}
      {s.dialog === 'updates' && <UpdatesDialog />}
      {s.showConn && <ConnectionDialog />}
      {s.showPalette && <CommandPalette />}
    </div>
  )
}

export interface CorvusAppProps {
  transport?: Transport
}

export default function App({ transport }: CorvusAppProps = {}) {
  return (
    <StudioProvider transport={transport}>
      <Shell />
    </StudioProvider>
  )
}
