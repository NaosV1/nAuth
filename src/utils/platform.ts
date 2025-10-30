import type { PlatformInfo } from '@types/index'

/**
 * Detects the current platform the app is running on
 */
export function getPlatformInfo(): PlatformInfo {
  // Check if running in Electron
  const isElectron = !!(
    typeof window !== 'undefined' &&
    window.process &&
    (window.process as any).type === 'renderer'
  )

  // Check if running in Capacitor
  const isCapacitor = !!(
    typeof window !== 'undefined' && (window as any).Capacitor
  )

  let platform: PlatformInfo['platform'] = 'web'
  if (isElectron) {
    platform = 'electron'
  } else if (isCapacitor) {
    const cap = (window as any).Capacitor
    if (cap.getPlatform() === 'ios') {
      platform = 'ios'
    } else if (cap.getPlatform() === 'android') {
      platform = 'android'
    }
  }

  return {
    isElectron,
    isCapacitor,
    platform,
  }
}

/**
 * Check if running on mobile platform
 */
export function isMobile(): boolean {
  const { platform } = getPlatformInfo()
  return platform === 'ios' || platform === 'android'
}

/**
 * Check if running on desktop platform
 */
export function isDesktop(): boolean {
  return getPlatformInfo().platform === 'electron'
}
