const { remote: { BrowserView, getCurrentWindow, session }} = require('electron')
const win = getCurrentWindow()
//win.webContents.openDevTools()

const customTitlebar = require('custom-electron-titlebar')
const titlebar = new customTitlebar.Titlebar({
    backgroundColor: customTitlebar.Color.fromHex('#464775'),
    unfocusEffect: false
})
titlebar.updateTitle('Microsoft Teams')

const settings = require('electron-settings')
let tabsAmount = settings.get('tabs.amount') || 0
let currentTabId = settings.get('tabs.current') || 0
const tabViews = []
const viewAnchor = {
  x: 68, 
  y: 30
}
const updateTabViewBounds = (bounds) => {
  if(!currentTabId) return

  if(bounds.x === -8 && bounds.y === -8) {
    // Maximized size is incorrect
    bounds = {
      x: 0,
      y: 0,
      width: bounds.width - 15,
      height: bounds.height - 15
    }
  }

  const tabView = tabViews[currentTabId - 1]
  tabView.setBounds({ 
    ...viewAnchor, 
    width: bounds.width - viewAnchor.x, // - 16, 
    height: bounds.height - viewAnchor.y // - 59
  })
}
try {


const openTab = (tabId) => {
  const previousTabId = currentTabId

  currentTabId = tabId
  settings.set('tabs.current', tabId)
  const tab = document.querySelector(`#tab-${tabId}`)
  tab.setAttribute('class', 'tab is-current')
  updateTabViewBounds(win.getBounds())
  
  if(previousTabId === tabId) return

  const previousTab = document.querySelector(`#tab-${previousTabId}`)
  if(previousTab) {
    previousTab.setAttribute('class', 'tab')
  }
  const previousTabView = tabViews[previousTabId - 1]
  if(previousTabView) {
    previousTabView.setBounds({ 
      ...viewAnchor, 
      width: 0,
      height: 0
    })
  }
}
const addTab = (tabId) => {
  const tabSession = session.fromPartition(`persist:tabs:${tabId}`)
  tabSession.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36')
  tabSession.setPermissionCheckHandler((webContents, permission, details) => {
    console.log('CHECK FOR PERMISSION:', permission)
    return true
  })
  tabSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    console.log('REQUEST FOR PERMISSION:', permission)
    callback(true)
  })
  const path = require('path')
  tabSession.setPreloads([path.join(__dirname, 'preload-teams.js')]);
  const webPreferences = {
    sandbox: true,
    session: tabSession,
    enableRemoteModule: false,
    experimentalFeatures: true,
    webSecurity: false,
    allowRunningInsecureContent: true,
    contextIsolation: false,
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    plugins: true
  }
  let view = new BrowserView({
    webPreferences
  })
  win.addBrowserView(view)
  tabViews.push(view)
  const bounds = win.getBounds()
  view.setBounds({ 
    ...viewAnchor,
    x: (bounds.width) - tabId,
    y: (bounds.height - viewAnchor.y) + 1, //Hack to load them all
    width: bounds.width - viewAnchor.x, // - 16, 
    height: bounds.height - viewAnchor.y // - 59
  })
  //view.webContents.openDevTools()
  view.webContents.loadURL('https://teams.microsoft.com/')
  //{"extraHeaders" : "pragma: no-cache\n"}
  // view.webContents.on('did-redirect-navigation', () => {
  //   console.log('REDIRECTED!')
  //   view.webContents.executeJavaScript(`
  //     console.log('wessel eval!');
      
  //     window.Notification = {
  //       permission: 'default',
  //       requestPermission: (a, b, c) => {
  //         console.log('requestpermission?')
  //       }
  //     };
  //   `)
  // })
  // view.webContents.executeJavaScript(`
  //   console.log('wessel eval!');
    
  //   window.Notification = {
  //     permission: 'default',
  //     requestPermission: (a, b, c) => {
  //       console.log('requestpermission?')
  //     }
  //   };
  // `)

  const tab = document.createElement('button')
  tab.setAttribute('id', `tab-${tabId}`)
  tab.setAttribute('class', 'tab')
  tab.setAttribute('tabId', tabId)
  tab.textContent = tabId
  tab.addEventListener('click', () => {
    openTab(tabId)
  })
  tab.addEventListener('contextmenu', e => {
    //todo: remove tab & session
  })
  document.querySelector('#tabs-list').appendChild(tab)
}


//win.on('will-resize', (_event, newBounds) => updateTabViewBounds(newBounds))
win.on('resize', (_event, newBounds) => updateTabViewBounds(win.getBounds()))

window.onload = setTimeout(() => {
  for(let i = 1; i <= tabsAmount; i++) {
    addTab(i)
  }
  if(currentTabId)
    openTab(currentTabId)
}, 1)


document.querySelector('#add-tab').addEventListener('click', () => {
  const tabId = tabViews.length + 1
  addTab(tabId)

  tabsAmount++
  settings.set('tabs.amount', tabsAmount)

  openTab(tabId)
})

} catch(ex) {
  console.error(ex)
}