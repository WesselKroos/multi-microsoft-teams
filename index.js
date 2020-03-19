const { remote: { BrowserView, getCurrentWindow, session }, ipcRenderer } = require('electron')
const win = getCurrentWindow()
//win.webContents.openDevTools()

const contextMenu = require('electron-context-menu')
contextMenu({
  window: win,
  append: (params, contextWindow) => [
    { role: "reload" },
    { role: "forceReload" },
  ],
})

const customTitlebar = require('custom-electron-titlebar')
const titlebar = new customTitlebar.Titlebar({
    backgroundColor: customTitlebar.Color.fromHex('#464775'),
    unfocusEffect: false
})
titlebar.updateTitle(' ')
win.setTitle('Microsoft Teams - Multitenant')

let currentTabsBadge = 0
const settings = require('electron-settings')
const tabs = settings.get('tabs') || {}
let currentTabId = settings.get('currentTabId') || 0
const tabViews = {}
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

  const tabView = tabViews[tabId]
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
  const tabView = tabViews[tabId]
  win.addBrowserView(tabView)
  updateTabViewBounds(win.getBounds(), tabId)
  contextMenu({
    window: tabView.webContents,
    append: (params, contextWindow) => [
      // { role: "cut" },
      // { role: "copy" },
      // { role: "paste" },
      { type: 'separator' },
      { 
        label: 'Reload',
        submenu: [
          { 
            label: 'Reload',
            click: async () => {
              tabView.webContents.reload()
            }
          },
          { type: 'separator' },
          { 
            label: 'Clear cache -> Reload',
            click: async () => {
              await tabView.webContents.session.clearAuthCache()
              await tabView.webContents.session.clearCache()
              tabView.webContents.reload()
            }
          },
          {
            label: 'Clear data and cache -> Reload',
            click: async () => {
              await tabView.webContents.session.clearAuthCache()
              await tabView.webContents.session.clearCache()
              //await tabView.webContents.session.clearHostResolverCache()
              await tabView.webContents.session.clearStorageData({
                storages: ['appcache', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'serviceworkers', 'cachestorage']
              })
              tabView.webContents.reload()
            }
          },
          {
            label: 'Logout -> Reload',
            click: async () => {
              await tabView.webContents.session.clearAuthCache()
              await tabView.webContents.session.clearCache()
              //await tabView.webContents.session.clearHostResolverCache()
              await tabView.webContents.session.clearStorageData()
              tabView.webContents.reload()
            }
          }
        ]
      }
    ],
  })
  
  if(previousTabId === tabId) return

  const previousTab = document.querySelector(`#tab-${previousTabId}`)
  if(previousTab) {
    previousTab.classList.remove('is-current')
  }
  const previousTabView = tabViews[previousTabId]
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
    // allowDisplayingInsecureContent: true,
    // contextIsolation: false,
    // nodeIntegration: false,
    // nodeIntegrationInWorker: false,
    // plugins: true
  }
  let view = new BrowserView({
    webPreferences
  })
  tabViews[tabId] = view
  win.addBrowserView(view) //Hack: Temporarily add to current Window to load the page
  updateTabViewBounds(win.getBounds(), tabId) //Hack: Temporarily render in current size to load the page

  const tabBtn = document.createElement('button')
  tabBtn.setAttribute('id', `tab-${tabId}`)
  tabBtn.setAttribute('class', 'tab')
  tabBtn.setAttribute('tabId', tabId)
  tabBtn.setAttribute('title', tab.tenantName || '') 
  tabBtn.addEventListener('click', () => {
    openTab(tabId)
  })
  tabBtn.addEventListener('contextmenu', e => {
    e.preventDefault()
    
    delete tabs[tabId]
    settings.set('tabs', tabs)

    document.querySelector('#tabs-list').removeChild(tabBtn)

    view.destroy()
    tabSession.clearStorageData()
    tabSession.clearCache()
  })
  document.querySelector('#tabs-list').appendChild(tabBtn)

  const tabIcon = document.createElement('span')
  tabIcon.setAttribute('class', 'tab__icon')
  tabBtn.appendChild(tabIcon)
  
  //view.webContents.openDevTools()
  view.webContents.on('dom-ready', () => {
    if(tabIcon.innerHTML === '!') return

    tabIcon.innerHTML = '..'
    view.webContents.insertCSS('waffle, get-app-button { display: none !important; }')

    view.webContents.executeJavaScript(`
      const dontShowAgainInputCheckbox = document.querySelector('[name="DontShowAgain"]');
      if(dontShowAgainInputCheckbox) {
        dontShowAgainInputCheckbox.checked = true;

        const inputSubmit = document.querySelector('[type="submit"]');
        if(inputSubmit) {
          inputSubmit.click();
        }
      }
    `)
  })

  view.webContents.on('new-window', (e, url) => {
    e.preventDefault()
    require('open')(url)
  })

  view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    tabIcon.innerHTML = '!'
    tabIcon.classList.add('tab__icon--has-error')
    try {
      view.webContents.executeJavaScript(`
        if(document.head)
          document.head.remove();

        document.body.innerHTML = \`
          <style>
            body {
              height: 100vh;
              margin: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: 'Segoe UI';
              background: #f3f2f1;
              color: #000;
            }
            div {
              display: flex;
              flex-direction: column;
              width: 300px;
              max-width: calc(100% - 50px);
              padding: 20px;
              border-radius: 4px;
              font-size: 12px;
              background: #fff;
            }
            h1 {
              font-size: 20px;
              display: table-cell;
              margin: 0 auto;
            }
            button {
              -webkit-appearance: none;
              display: table-cell;
              margin: 20px auto;
              box-shadow: rgba(0, 0, 0, 0.75) 0px 1px 3px 0px;
              border: none;
              border-radius: 2px;
              padding: 10px 20px;
              background: #464775;
              color: #fff;
              cursor: pointer;
              outline: none;
            }
            button:hover {
              background: #6264a7;
            }
            button:hover {
              box-shadow: rgba(0, 0, 0, 0.75) 0px 1px 3px 0px inset;
            }
            p {
              border-top: 2px solid #f3f2f1;
              padding: 20px 20px 0;
              margin: 0 -20px;
              width: calc(100% + 40px);
            }
          </style>
          <div>
            <h1>Failed to load the page</h1>
            <button onclick="document.body.innerHTML = ''; location.reload();">click here to reload</button>
            <p>Error: ${errorDescription} <br/>URL: <a href="${validatedURL}">${validatedURL}</a></p>
          </div>
        \`;
      `)
    } catch(error) {
      console.error(error)
    }
  })
  view.webContents.on('will-navigate', () => {
    tabIcon.classList.remove('tab__icon--has-error')
    tabIcon.innerHTML = '<span class="tab__loading"></span>'
    const animStartTime = 1.5 + (Math.random());
    tabIcon.style.setProperty('--animation-start-time', animStartTime +'s');
  })
  view.webContents.on('ipc-message', (event, channel, { badge, tenantName }) => {
    if(channel !== 'tab-info') return

    if(tenantName) {
      tabs[tabId].tenantName = tenantName
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

    const tabsBadge = Object.keys(tabs).map(tabId => tabs[tabId]).reduce((badge, tab) => {
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
  
  view.webContents.loadURL('https://teams.microsoft.com/')
  win.removeBrowserView(view)
}

const updateBounds = (_event, newBounds) => updateTabViewBounds(win.getBounds(), currentTabId)
win.on('resize', updateBounds)
win.on('restore', updateBounds)

Object.keys(tabs).forEach(tabId => {
  addTab(tabId, tabs[tabId])
})
if(currentTabId && Object.keys(tabs).find(tabId => tabId === currentTabId)) {
  openTab(currentTabId)
} else if(Object.keys(tabs).length) {
  openTab(Object.keys(tabs)[0])
}


document.querySelector('#add-tab').addEventListener('click', () => {
  const highestTabId = Object.keys(tabs).reduce((highestTabId, tabId) => (highestTabId < tabId) ? tabId : highestTabId, 0)

  const tab = {
    id: highestTabId + 1,
    tenantName: '..'
  }
  tabs[tab.id] = tab
  addTab(tab.id, tab)
  settings.set('tabs', tabs)

  openTab(tab.id)
})