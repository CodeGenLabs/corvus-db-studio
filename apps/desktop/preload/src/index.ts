import { contextBridge, ipcRenderer } from 'electron'
import { exposeCorvusBridge } from '@corvus/transport-ipc/preload'

exposeCorvusBridge(contextBridge, ipcRenderer)
