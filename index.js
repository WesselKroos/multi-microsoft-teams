const { remote: { BrowserView, getCurrentWindow, session }, ipcRenderer } = require('electron')
const win = getCurrentWindow()
//win.webContents.openDevTools()

const contextMenu = require('electron-context-menu')
contextMenu({
  window: win,
  prepend: (params, browserWindow) => [
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "pasteAndMatchStyle" },
      { role: "selectAll" },
      { role: "reload" },
      { role: "forceReload" }, 
  ],
})

const customTitlebar = require('custom-electron-titlebar')
const titlebar = new customTitlebar.Titlebar({
    backgroundColor: customTitlebar.Color.fromHex('#464775'),
    unfocusEffect: false
})
titlebar.updateTitle('Microsoft Multitenant Teams')
win.setTitle('Microsoft Multitenant Teams')

let currentTabsBadge = 0
const settings = require('electron-settings')
const tabs = settings.get('tabs') || []
let currentTabId = settings.get('currentTabId') || 0
const tabViews = []
const viewAnchor = {
  x: 68, 
  y: 30
}
const updateTabViewBounds = (bounds, tabId) => {
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

  const tabView = tabViews[tabId - 1]
  tabView.setBounds({ 
    ...viewAnchor, 
    width: bounds.width - viewAnchor.x, // - 16, 
    height: bounds.height - viewAnchor.y // - 59
  })
}

const openTab = (tabId) => {
  const previousTabId = currentTabId
  currentTabId = tabId
  settings.set('currentTabId', tabId)

  const tab = document.querySelector(`#tab-${tabId}`)
  tab.classList.add('is-current')
  const tabView = tabViews[tabId - 1]
  win.addBrowserView(tabView)
  updateTabViewBounds(win.getBounds(), tabId)
  contextMenu({
    window: tabView.webContents,
    prepend: (params, browserWindow) => [
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteAndMatchStyle" },
        { role: "selectAll" },
        { role: "reload" },
        { role: "forceReload" }, 
    ],
  })
  
  if(previousTabId === tabId) return

  const previousTab = document.querySelector(`#tab-${previousTabId}`)
  if(previousTab) {
    previousTab.classList.remove('is-current')
  }
  const previousTabView = tabViews[previousTabId - 1]
  if(previousTabView) {
    win.removeBrowserView(previousTabView)
  }
}
const addTab = (tabId, tab) => {
  const tabSession = session.fromPartition(`persist:tabs:${tabId}`)
  tabSession.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36')
  tabSession.setPermissionCheckHandler((webContents, permission, details) => {
    //console.log('CHECK FOR PERMISSION:', permission)
    return true
  })
  tabSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    //console.log('REQUEST FOR PERMISSION:', permission)
    callback(true)
  })
  const path = require('path')
  tabSession.setPreloads([path.join(__dirname, 'preload-teams.js')]);
  const webPreferences = {
    // sandbox: true,
    session: tabSession,
    // enableRemoteModule: false,
    // experimentalFeatures: true,
    // webSecurity: false,
    // allowRunningInsecureContent: true,
    // contextIsolation: false,
    // nodeIntegration: false,
    // nodeIntegrationInWorker: false,
    // plugins: true
  }
  let view = new BrowserView({
    webPreferences
  })
  tabViews.push(view)
  win.addBrowserView(view) //Hack: Temporarily add to current Window to load the page
  updateTabViewBounds(win.getBounds(), tabId) //Hack: Temporarily render in current size to load the page
  //view.webContents.openDevTools()
  view.webContents.loadURL('https://teams.microsoft.com/')
  win.removeBrowserView(view)
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

  const tabBtn = document.createElement('button')
  tabBtn.setAttribute('id', `tab-${tabId}`)
  tabBtn.setAttribute('class', 'tab')
  tabBtn.setAttribute('tabId', tabId)
  tabBtn.setAttribute('title', tab.tenantName || '') 
  tabBtn.addEventListener('click', () => {
    openTab(tabId)
  })
  tabBtn.addEventListener('contextmenu', e => {
    //todo: remove tab & session
  })
  document.querySelector('#tabs-list').appendChild(tabBtn)

  const tabIcon = document.createElement('span')
  tabIcon.setAttribute('class', 'tab__icon')
  tabIcon.textContent = (tab.tenantName || '..').substr(0, 2)
  tabBtn.appendChild(tabIcon)
  
  view.webContents.addListener("ipc-message", (event, channel, { badge, tenantName }) => {
    if(channel !== 'tab-info') return

    if(tenantName) {
      tabs[tabId - 1].tenantName = tenantName
      tabBtn.setAttribute('title', tenantName) 
      tabBtn.children[0].textContent = tenantName.substr(0, 2)
    }

    tabBtn.setAttribute('data-count', badge)
    if(badge) {
      tabBtn.classList.add('tab--has-badge')
    } else {
      tabBtn.classList.remove('tab--has-badge')
    }
    tab.badge = badge

    settings.set('tabs', tabs)

    const tabsBadge = tabs.reduce((badge, tab) => {
      if(tab.badge)
        badge += tab.badge
      return badge
    }, 0)
    ipcRenderer.sendSync('update-badge', tabsBadge || null)
    if(currentTabsBadge !== tabsBadge) {
      currentTabsBadge = tabsBadge
      if(tabsBadge && !document.hasFocus())
        win.flashFrame(true)
    }
  })
}


//win.on('will-resize', (_event, newBounds) => updateTabViewBounds(newBounds))
win.on('resize', (_event, newBounds) => updateTabViewBounds(win.getBounds(), currentTabId))

window.onload = setTimeout(() => {
  for(let i = 0; i < tabs.length; i++) {
    addTab(i + 1, tabs[i])
  }
  if(currentTabId)
    openTab(currentTabId)
}, 1)


document.querySelector('#add-tab').addEventListener('click', () => {
  const tabId = tabViews.length + 1
  const tab = {
    id: tabId,
    tenantName: '..'
  }
  addTab(tabId, tab)

  tabs.push(tab)
  settings.set('tabs', tabs)

  openTab(tabId)
})