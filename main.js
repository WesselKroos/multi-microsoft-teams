const { app, BrowserView, BrowserWindow, session, Menu, ipcMain, nativeImage } = require('electron')
app.allowRendererProcessReuse = false

app.setAppUserModelId(process.execPath)

const path = require('path')
const iconPath = path.join(__dirname, "build", "icon.png")
const iconImage = nativeImage.createFromPath(iconPath)

app.whenReady()
  .then(function() {
    Menu.setApplicationMenu(null)
    let win = new BrowserWindow({ 
      width: 1920, 
      height: 1100,
      title: 'Microsoft Teams - Multitenant',
      icon: iconImage,
      webPreferences: {
        nodeIntegration: true
      }, 
      frame: false
    })
    win.loadFile('index.html')
    win.on('closed', () => {
      win = null
    })
    
    const WindowsBadge = require('electron-windows-badge')
    new WindowsBadge(win, {
      color: '#dc2a11',
      font: 'Segoe UI',
      fit: false
    })
  })

// ipcMain.handle('badge-count', async (event, someArgument) => {
//   console.log('Received badge count:', someArgument)
//   return 10
// })