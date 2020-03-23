const { remote: { BrowserView, getCurrentWindow, session, app }, ipcRenderer } = require('electron')
const contextMenu = require('electron-context-menu')
const win = getCurrentWindow()
//win.webContents.openDevTools()
//console.log(`default? - ${app.isDefaultProtocolClient('msteams')}`)

const customTitlebar = require('custom-electron-titlebar')
const titlebar = new customTitlebar.Titlebar({
    backgroundColor: customTitlebar.Color.fromHex('#464775'),
    unfocusEffect: false
})
titlebar.updateTitle('Microsoft Teams - Multitenant')

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

const tabsListElem = document.querySelector('#tabs-list')

const createContextMenuItemsForTabView = (tabView) => [
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
]

const openTab = (tabId) => {
  const previousTabId = currentTabId
  currentTabId = tabId
  settings.set('currentTabId', tabId)

  const tabBtn = document.querySelector(`[data-tab-id="${tabId}"]`)
  tabBtn.classList.add('is-current')
  const tabView = tabViews[tabId]
  win.addBrowserView(tabView)
  updateTabViewBounds(win.getBounds(), tabId)
  
  if(previousTabId === tabId) return

  const previousTab = document.querySelector(`[data-tab-id="${previousTabId}"]`)
  if(previousTab) {
    previousTab.classList.remove('is-current')
  }
  const previousTabView = tabViews[previousTabId]
  if(previousTabView) {
    win.removeBrowserView(previousTabView)
  }
}
const initTab = async (tabId, tab, isNew = false) => {
  const tabSession = session.fromPartition(`persist:tabs:${tabId}`)

  tabSession.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36')
  
  // Copy cookies to the new tab to skip the login screen
  if(isNew && Object.keys(tabViews).length) {
    try {
      const cookies = await (tabViews[Object.keys(tabViews)[0]]).webContents.session.cookies.get({})
      for(let cookie of cookies) {
        const scheme = cookie.secure ? "https" : "http"
        const host = (cookie.domain[0] === ".") ? cookie.domain.substr(1) : cookie.domain
        cookie = {
          url: scheme + "://" + host,
          name: cookie.name,
          value: cookie.value,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          expirationDate: cookie.expirationDate
        }
        await tabSession.cookies.set(cookie)
      }
    } catch(error) {
      console.warn('Failed to copy existing tab cookies to the new tab:', error)
    }
  }

  tabSession.setPermissionCheckHandler(async (webContents, permission, details) => {
    return true
  })
  tabSession.setPermissionRequestHandler(async (webContents, permission, callback, details) => {
    callback(true)
  })
  
  const path = require('path')
  tabSession.setPreloads([path.join(__dirname, 'preload-teams.js')]);
  const webPreferences = {
    //sandbox: true, // Keep set to false to allow setUrl from 'launch-from-protocol' handler
    session: tabSession,
    enableRemoteModule: true,
    // experimentalFeatures: true,
    webSecurity: true,
    // allowRunningInsecureContent: true,
    // allowDisplayingInsecureContent: true,
    // contextIsolation: true,
    // nodeIntegration: false,
    // nodeIntegrationInWorker: false,
    plugins: true
  }
  let tabView = new BrowserView({
    webPreferences
  })

  tabViews[tabId] = tabView
  win.addBrowserView(tabView) //Hack: Temporarily add to current Window to load the page
  updateTabViewBounds(win.getBounds(), tabId) //Hack: Temporarily render in current size to load the page

  // Block desktop script to prevent "Uncaught IPC object is null" error on next page reload
  // https://statics.teams.cdn.office.net/hashedjs/4-app.desktop.min-3ab81b16.js
  tabView.webContents.session.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    callback({cancel: (details.url.indexOf('app.desktop.min') !== -1)})
  })

  contextMenu({
    window: tabView.webContents,
    append: (params, contextWindow) => createContextMenuItemsForTabView(tabView),
  })

  const tabBtn = document.createElement('button')
  tabBtn.setAttribute('class', 'tab')
  tabBtn.setAttribute('data-tab-id', tabId)
  tabBtn.setAttribute('title', tab.tenantName || '') 
  tabBtn.addEventListener('click', () => {
    openTab(tabId)
  })
  tabsListElem.appendChild(tabBtn)

  const tabIcon = document.createElement('span')
  tabIcon.setAttribute('class', 'tab__icon')
  tabBtn.appendChild(tabIcon)
  
  //tabView.webContents.openDevTools()
  tabView.webContents.on('dom-ready', () => {
    if(tabIcon.innerHTML === '!') return // did-fail-load was triggered first

    const url = tabView.webContents.getURL()
    const teamsUrlIndex = url.indexOf('://teams.microsoft.com')
    if(teamsUrlIndex !== -1) {
      tabView.webContents.insertCSS(`
        waffle, 
        get-app-button,
        .powerbar-profile .activity-badge-parent {
          display: none !important;
        }
      `)
    } else {
      tabBtn.classList = 'tab' + (tabBtn.classList.contains('is-current') ? ' is-current' : '')
      tabIcon.classList = 'tab__icon'
      tabIcon.innerHTML = '*'
      tabView.webContents.executeJavaScript(`
        const dontShowAgainInputCheckbox = document.querySelector('[name="DontShowAgain"]');
        if(dontShowAgainInputCheckbox) {
          dontShowAgainInputCheckbox.checked = true;
  
          const inputSubmit = document.querySelector('[type="submit"]');
          if(inputSubmit) {
            inputSubmit.click();
          }
        }
      `)
    }
  })

  tabView.webContents.on('new-window', (e, url) => {
    e.preventDefault()
    require('open')(url)
  })

  tabView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    tabBtn.classList = 'tab' + (tabBtn.classList.contains('is-current') ? ' is-current' : '')
    tabIcon.classList = 'tab__icon tab__icon--has-error'
    tabIcon.innerHTML = '!'
    try {
      tabView.webContents.executeJavaScript(`
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
            }
          </style>
          <div>
            <h1>Failed to load the page</h1>
            <button id="reload-btn">click here to reload</button>
            <p>Error: ${errorDescription} <br/>URL: <a href="${validatedURL}">${validatedURL}</a></p>
          </div>
        \`;
        document.querySelector('#reload-btn')
          .addEventListener('click', () => {
            document.body.innerHTML = '';
            location.reload();
          });
      `)
    } catch(error) {
      console.error(error)
    }
  })
  tabView.webContents.on('will-navigate', () => {
    tabBtn.classList = 'tab' + (tabBtn.classList.contains('is-current') ? ' is-current' : '')
    tabIcon.classList = 'tab__icon'
    tabIcon.innerHTML = '<span class="tab__loading"></span>'
    const animStartTime = 1.5 + (Math.random());
    tabIcon.style.setProperty('--animation-start-time', animStartTime +'s');
  })
  tabView.webContents.on('ipc-message', (event, channel, { badge, tenantName, tenantId }) => {
    if(channel !== 'tab-info') return

    if(tenantName) {
      tabs[tabId].tenantName = tenantName
      tabBtn.setAttribute('title', tenantName) 
      tabBtn.children[0].textContent = tenantName.substr(0, 2)
      const tenantColorH = (tenantName.charCodeAt(0) * tenantName.charCodeAt(1)) * 49 % 360
      tabBtn.style.setProperty('--tenant-color-h', tenantColorH)
      tabBtn.classList.add('is-tenant')
    } else {
      tabBtn.classList.remove('is-tenant')
    }

    if(tenantId) {
      tab.tenantId = tenantId
    } else if(tab.tenantId) {
      delete tab.tenantId
    }

    tabBtn.setAttribute('data-count', badge)
    if(badge) {
      tabBtn.classList.add('tab--has-badge')
    } else {
      tabBtn.classList.remove('tab--has-badge')
    }
    tab.badge = badge
    tabIcon.classList = 'tab__icon'

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
  
  tabView.webContents.loadURL('https://teams.microsoft.com/')
  win.removeBrowserView(tabView)
}

const updateBounds = (_event, newBounds) => updateTabViewBounds(win.getBounds(), currentTabId)
win.on('resize', updateBounds)
win.on('restore', updateBounds)

const addTab = async () => {
  const highestTabId = Object.keys(tabs).reduce((highestTabId, tabId) => (highestTabId < tabId) ? tabId : highestTabId, 0)

  const tab = {
    id: parseInt(highestTabId, 10) + 1,
    tenantName: ''
  }
  tabs[tab.id] = tab
  await initTab(tab.id, tab, true)
  settings.set('tabs', tabs)

  openTab(tab.id)
  return tab
}
document.querySelector('#add-tab').addEventListener('click', async () => await addTab())

Object.keys(tabs).forEach(tabId => {
  initTab(tabId, tabs[tabId])
})
if(currentTabId && Object.keys(tabs).find(tabId => tabId === currentTabId)) {
  openTab(currentTabId)
} else if(Object.keys(tabs).length) {
  openTab(Object.keys(tabs)[0])
}

ipcRenderer.on('launch-from-protocol', async (sender, protocolUrl) => {
  const guidRegex = /(?<guid>[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12})/g
  let matches = []
  let guids = []
  while (matches = guidRegex.exec(protocolUrl)) {
    guids.push(matches.groups.guid);   
  }

  let tab = Object.keys(tabs).map((tabId) => tabs[tabId]).find(tab => tab.tenantId && guids.some(guid => guid === tab.tenantId))
  if(!tab) {
    tab = await addTab()
  } else {
    openTab(tab.id)
  }

  const tabView = tabViews[tab.id]
  const url = protocolUrl.replace('msteams:/', 'https://teams.microsoft.com/_#/')
  tabView.webContents.loadURL(url)
})


const removeTab = async (tabId) => {
  settings.set('tabs', tabs)

  tabsListElem.removeChild(document.querySelector(`[data-tab-id="${tabId}"]`))

  const tabView = tabViews[tabId]
  const session = tabView.webContents.session
  await session.clearStorageData()
  await session.clearCache()
  tabView.destroy()

  delete tabs[tabId]
  delete tabViews[tabId]

  if(currentTabId === tabId && Object.keys(tabs).length)
    openTab(Object.keys(tabs)[0])
}

contextMenu({
  window: win,
  append: (params, contextWindow) => {
    const tabElem = document.elementsFromPoint(contextWindow.x, contextWindow.y).find(elem => elem.classList.contains('tab'))
    if(tabElem) {
      const tabId = tabElem.getAttribute('data-tab-id')

      return [ 
        {
          label: 'Remove tenant',
          click: () => removeTab(tabId)
        },
        ...createContextMenuItemsForTabView(tabViews[tabId]),
      ]
    } else {
      return [
        { role: "reload" },
        { role: "forceReload" },
      ]
    }
  },
})