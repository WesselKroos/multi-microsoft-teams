const { app, BrowserWindow, Menu, ipcMain, nativeImage, screen, systemPreferences, protocol } = require('electron')
const path = require('path')
const settings = require('electron-settings')

app.allowRendererProcessReuse = false
app.setAppUserModelId(process.execPath)



const singleInstanceLock = app.requestSingleInstanceLock()
if (!singleInstanceLock) {
  app.quit()
} else {
  let win;

  app.setAsDefaultProtocolClient('msteams')

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
      title: 'Microsoft Teams - Multitenant',
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

    // ipcMain.handle('badge-count', async (event, someArgument) => {
    //   console.log('Received badge count:', someArgument)
    //   return 10
    // })

    console.log('systemPreferences: ', systemPreferences)
    
    ipcMain.handle('permission-check-media', async (event, someArgument) => {
      // var microphone = systemPreferences.getMediaAccessStatus('microphone')
      // var camera = systemPreferences.getMediaAccessStatus('camera')
      // var screen = systemPreferences.getMediaAccessStatus('screen')
      // console.log('Permission check results: ', microphone, camera, screen)
      // return { microphone, camera, screen }
      return true
    })
    ipcMain.handle('permission-request-media', async (event, someArgument) => {
      // var microphone = await systemPreferences.askForMediaAccess('microphone')
      // var camera = await systemPreferences.askForMediaAccess('camera')
      // console.log('Permission request results: ', microphone, camera)
      // return { microphone, camera }
      return true
    })
  })

  // Someone tried to run a second instance, we should focus our window.
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (!win) return

    if (win.isMinimized()) 
      win.restore()
    win.focus()
  })
}