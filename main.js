const { app, BrowserWindow, Menu, ipcMain, nativeImage, screen, systemPreferences, protocol } = require('electron')

const path = require('path')
const settings = require('electron-settings')

app.allowRendererProcessReuse = false
app.setAppUserModelId('Multi Microsoft Teams')

const singleInstanceLock = app.requestSingleInstanceLock()
if (!singleInstanceLock) {
  app.quit()
} else {
  let win;

  app.setAsDefaultProtocolClient('msteams')
  const handleIfLaunchedFromProtocol = (args) => {
    const procotolUrl = args.find(arg => arg.startsWith('msteams:'))
    if(procotolUrl) {
      win.webContents.send('launch-from-protocol', procotolUrl)
    }
  }

  app.on('ready', () => {
    const iconPath = path.join(__dirname, "build", "icon.png")
    const iconImage = nativeImage.createFromPath(iconPath)
    
    const winBounds = settings.get('win.bounds') || { width: 1920, height: 1080 }
    const screenBounds = screen.getPrimaryDisplay().workAreaSize
    winBounds.width = Math.min(screenBounds.width, winBounds.width)
    winBounds.height = Math.min(screenBounds.height, winBounds.height)
    winBounds.x = Math.max(0, winBounds.x)
    winBounds.y = Math.max(0, winBounds.y)
    if(winBounds.x + winBounds.width > screenBounds.width) {
      winBounds.x = Math.max(0, screenBounds.width - winBounds.width)
    }
    if(winBounds.y + winBounds.height > screenBounds.height) {
      winBounds.y = Math.max(0, screenBounds.height - winBounds.height)
    }

    Menu.setApplicationMenu(null)
    win = new BrowserWindow({ 
      minWidth: 788,
      minHeight: 530,
      width: winBounds.width, 
      height: winBounds.height,
      x: winBounds.x,
      y: winBounds.y,
      show: false,
      frame: false,
      title: 'Multi Microsoft Teams',
      icon: iconImage,
      webPreferences: {
        nodeIntegration: true
      }
    })
    win.loadFile('index.html')
    win.on('close', () => {
      settings.set('win.bounds', win.getBounds())
      settings.set('win.isMaximized', win.isMaximized())
      settings.set('win.isMinimized', win.isMinimized())
    })
    win.on('closed', () => {
      win = null
    })
    if(settings.get('win.isMaximized'))
      win.maximize()
    if(settings.get('win.isMinimized'))
      win.minimize()
    else
      win.show()

    const WindowsBadge = require('electron-windows-badge')
    new WindowsBadge(win, {
      color: '#dc2a11',
      font: 'Segoe UI',
      fit: false
    })
    
    handleIfLaunchedFromProtocol(process.argv)

    try {
      const { autoUpdater } = require('electron-updater')
      autoUpdater.checkForUpdatesAndNotify()
      
      autoUpdater.on('error', (error) => {
        win.webContents.send('update-error', error)
      })
    } catch(ex) {
      win.webContents.send('update-error', ex)
    }

  })

  // Someone tried to run a second instance, we should focus our window.
  app.on('second-instance', (event, commandLines, workingDirectory) => {
    if (!win) return

    if (win.isMinimized()) 
      win.restore()
    win.focus()

    handleIfLaunchedFromProtocol(commandLines)
  })
}