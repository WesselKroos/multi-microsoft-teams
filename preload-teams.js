const { ipcRenderer, desktopCapturer } = require('electron')

window.addEventListener("error", function (...args) {
  console.warn("MICROSOFT TEAMS - MULTITENANT - Error occurred! Refreshing the tab in 5 seconds if the appbar-list has not been loaded by then.");
  setTimeout(() => {
    if(document.querySelector('[acc-role-dom="appbar-list"]')) return
    console.warn("MICROSOFT TEAMS - MULTITENANT - Failed to load the appbar-list. Clearing data and refreshing the tab!");
    ipcRenderer.send('tab-load-error')
  }, 5000)
  return false;
})
window.addEventListener('unhandledrejection', function (...args) {
  console.warn("MICROSOFT TEAMS - MULTITENANT - Unhandled Rejection occurred! Refreshing the tab in 5 seconds if the appbar-list has not been loaded by then.");
  setTimeout(() => {
    if(document.querySelector('[acc-role-dom="appbar-list"]')) return
    console.warn("MICROSOFT TEAMS - MULTITENANT - Failed to load the appbar-list. Clearing data and refreshing the tab!");
    ipcRenderer.send('tab-load-error')
  }, 5000)
})

let updateBadgesTimeout = undefined
const updateBadges = async () => {
  let badge = 0
  const badges = [...document.querySelectorAll('.app-bar .activity-badge:not(.dot-activity-badge)')]
  badges.forEach(badgeElem => {
    let count = parseInt(badgeElem.textContent, 10)
    badge += isNaN(count) ? 1 : count
  })

  let tenantName = ''
  const tenantNameElem = document.querySelector('.app-header-bar-tenant-name')
  if (tenantNameElem) {
    tenantName = tenantNameElem.textContent
  }

  let tenantId = ''
  const latestOid = localStorage.getItem('ts.latestOid')
  if(latestOid) {
    const database = await indexedDB.databases()
    tenantId = database.map(database => {
      //Teams:settings:<tenantId>:<latestOid>
      const matches = database.name.match(/Teams:settings:(?<tenantId>[^:]*):(?<Oid>[^:]*)/)
      if(matches && matches.groups.Oid === latestOid)
        return matches.groups.tenantId
    }).find(tenantId => tenantId)
  }

  ipcRenderer.send('tab-info', {
    badge,
    tenantName,
    tenantId
  })

  updateBadgesTimeout = undefined
}
const scheduleUpdateBadges = () => {
  if (updateBadgesTimeout) return
  updateBadgesTimeout = setTimeout(updateBadges, 500)
}

document.addEventListener('DOMContentLoaded', () => {
  const observer = new MutationObserver((mutationsList, observer) => {
    for (let mutation of mutationsList) {
      if (mutation.type === 'childList') {
        var useWebAppLink = document.querySelector('.use-app-lnk')
        if (useWebAppLink) {
          useWebAppLink.click()
          return
        }

        scheduleUpdateBadges()
      }
    }
  })
  observer.observe(document.body, 
    { attributes: true, childList: true, subtree: true })
})

//SCREEN SHARING WORKAROUND

// window.oldGetSupportedConstraints = window.navigator.mediaDevices.getSupportedConstraints.bind(window.navigator.mediaDevices)
// window.navigator.mediaDevices.getSupportedConstraints = (...args) => {
//   console.log('GetSupportedConstraints CALLED WITH ARGS:', ...args)
//   const supportedConstrains = window.oldGetSupportedConstraints.call(window, ...args)
//   console.log('SupportedConstraints:', supportedConstrains)
//   return supportedConstrains
// }

// const oldMediaDevicesEnumerateDevices = window.navigator.mediaDevices.enumerateDevices.bind(window.navigator.mediaDevices)
// window.navigator.mediaDevices.enumerateDevices = (...args) => {
//   return new Promise(async (resolve, reject) => {
//     try {
//       console.log('mediaDevices.enumerateDevices CALLED WITH ARGS:', ...args)
//       const devices = await oldMediaDevicesEnumerateDevices(...args)
//       console.log('devices:', devices)
//       resolve(devices)
//     } catch(err) {
//       console.error(err)
//       reject(err)
//     }
//   })
// }
// const oldGetUserMedia = window.navigator.mediaDevices.getUserMedia.bind(window.navigator.mediaDevices)
// window.navigator.mediaDevices.getUserMedia = (...args) => {
//   console.log('GETUSERMEDIA CALLED WITH ARGS:', ...args)
//   return oldGetUserMedia(...args)
// }
// const oldWebkitGetUserMedia = window.navigator.mediaDevices.webkitGetUserMedia.bind(window.navigator.mediaDevices)
// window.navigator.mediaDevices.webkitGetUserMedia = (...args) => {
//   console.log('webkitGetUserMedia CALLED WITH ARGS:', ...args)
//   return oldWebkitGetUserMedia(...args)
// }

if(navigator.mediaDevices) {
  window.navigator.mediaDevices.getDisplayMedia = (...args) => {
    return new Promise(async (resolve, reject) => {
      try {
        const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] })

        const selectionElem = document.createElement('div')
        selectionElem.classList = 'desktop-capturer-selection'
        selectionElem.innerHTML = `
          <style>
            .desktop-capturer-selection {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100vh;
              background: rgba(30,30,30,.75);
              color: #fff;
              z-index: 10000000;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .desktop-capturer-selection__scroller {
              width: 100%;
              max-height: 100vh;
              overflow-y: auto;
            }
            .desktop-capturer-selection__list {
              max-width: calc(100% - 100px);
              margin: 50px;
              padding: 0;
              display: flex;
              flex-wrap: wrap;
              list-style: none;
              overflow: hidden;
              justify-content: center;
            }
            .desktop-capturer-selection__item {
              display: flex;
              margin: 4px;
            }
            .desktop-capturer-selection__btn {
              display: flex;
              flex-direction: column;
              align-items: stretch;
              width: 145px;
              margin: 0;
              border: 0;
              border-radius: 3px;
              padding: 4px;
              background: #252626;
              text-align: left;
              transition: background-color .15s, box-shadow .15s;
            }
            .desktop-capturer-selection__btn:hover,
            .desktop-capturer-selection__btn:focus {
              background: rgba(98,100,167,.8);
            }
            .desktop-capturer-selection__thumbnail {
              width: 100%;
              height: 81px;
              object-fit: cover;
            }
            .desktop-capturer-selection__name {
              margin: 6px 0 6px;
              white-space: nowrap;
              text-overflow: ellipsis;
              overflow: hidden;
            }
          </style>
          <div class="desktop-capturer-selection__scroller">
            <ul class="desktop-capturer-selection__list">
              ${sources.map(({id, name, thumbnail, display_id, appIcon}) => `
                <li class="desktop-capturer-selection__item">
                  <button class="desktop-capturer-selection__btn" data-id="${id}" title="${name}">
                    <img class="desktop-capturer-selection__thumbnail" src="${thumbnail.toDataURL()}" />
                    <span class="desktop-capturer-selection__name">${name}</span>
                  </button>
                </li>
              `).join('')}
            </ul>
          </div>
        `
        document.body.appendChild(selectionElem)

        document.querySelectorAll('.desktop-capturer-selection__btn')
          .forEach(button => {
            button.addEventListener('click', async () => {
              try {
                const id = button.getAttribute('data-id')
                const source = sources.find(source => source.id === id)
                if(!source) {
                  throw new Error(`Source with id ${id} does not exist`)
                }
                
                const getUserMediaArgs = {
                  audio: false,
                  video: {
                    mandatory: {
                      chromeMediaSource: 'desktop',
                      chromeMediaSourceId: source.id
                    }
                  }
                }
                const stream = await window.navigator.mediaDevices.getUserMedia(getUserMediaArgs)
                resolve(stream)

                selectionElem.remove()
              } catch (err) {
                console.error('Error selecting desktop capture source:', err)
                reject(err)
              }
            })
          })
      } catch (err) {
        console.error('Error displaying desktop capture sources:', err)
        reject(err)
        return
      }
    })
  }
}