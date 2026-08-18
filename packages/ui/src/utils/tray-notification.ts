export interface TrayNotificationPayload {
  title: string
  body: string
  jobId?: string
  urgent?: boolean
}

export class DesktopTrayManager {
  public static sendNotification(payload: TrayNotificationPayload): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(payload.title, {
          body: payload.body,
          icon: '/favicon.ico',
        })
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            new Notification(payload.title, {
              body: payload.body,
              icon: '/favicon.ico',
            })
          }
        })
      }
    }
  }
}
