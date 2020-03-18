const { app, BrowserView, BrowserWindow, session, Menu, ipcMain, nativeImage } = require('electron')
app.allowRendererProcessReuse = false

app.setAppUserModelId(process.execPath)

const path = require('path')
const iconPath = path.join(__dirname, "build", "icon.png")
const iconImage = nativeImage.createFromPath(iconPath)

// const path = require('path')

// let win = undefined
// const tabs = []

// const viewAnchor = {
//   x: 80, 
//   y: 30
// }
// const updateViewBounds = (bounds) => {
//   tabs.forEach(view => {
//     view.setBounds({ 
//       ...viewAnchor, 
//       width: bounds.width - viewAnchor.x, // - 16, 
//       height: bounds.height - viewAnchor.y // - 59
//     })
//   })
// }

// const addTab = (tabId) => {
//   const winSession = session.fromPartition(`persist:tabs:${tabId}`)
//   winSession.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36')
//   // winSession.setPermissionCheckHandler((webContents, permission) => {
//   //   console.log('REQUEST FOR PERMISSION:', permission)
//   //   return true
//   // })
//   // console.log('session:', winSession)
//   winSession.setPreloads([path.join(__dirname, 'preload-teams.js')]);
//   const webPreferences = {
//     sandbox: true,
//     session: winSession,
//     enableRemoteModule: false,
//     experimentalFeatures: true,
//     webSecurity: true,
//     allowRunningInsecureContent: false,
//     contextIsolation: true,
//     nodeIntegration: false,
//     nodeIntegrationInWorker: false,
//     plugins: false
//   }
//   let view = new BrowserView({
//     webPreferences
//   })
//   win.addBrowserView(view)
//   tabs.push(view)
//   updateViewBounds(win.getBounds())
//   //view.webContents.openDevTools()
//   view.webContents.loadURL('https://teams.microsoft.com/')
//   //{"extraHeaders" : "pragma: no-cache\n"}
  
  
//   // view.webContents.executeJavaScript(`console.log('wessel eval!');fn = () => {}; navigator.serviceWorker.register = () => new Promise(fn, fn);console.log('wessel evalled!');`)
// }

app.whenReady()
  .then(function() {
    Menu.setApplicationMenu(null)
    let win = new BrowserWindow({ 
      width: 1920, 
      height: 1100,
      title: 'Microsoft Multitenant Teams',
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
    // win.on('will-resize', (_event, newBounds) => updateViewBounds(newBounds))
    // win.on('resize', (_event, newBounds) => updateViewBounds(win.getBounds()))
    
    //win.webContents.openDevTools()
    //addTab('1')
  })

// ipcMain.handle('badge-count', async (event, someArgument) => {
//   console.log('Received badge count:', someArgument)
//   return 10
// })