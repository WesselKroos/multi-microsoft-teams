const { ipcRenderer } = require('electron')

if(navigator.serviceWorker) {
navigator.serviceWorker.getRegistrations().then(
  function(registrations) {
    for(let registration of registrations) {  
      registration.unregister()
    }

    if(registrations.length) {
      location.reload()
    }
  })
}

let updateBadgesTimeout = undefined
const updateBadges = () => {
  let badge = 0;
  const badges = ([...document.querySelectorAll('.app-bar .activity-badge:not(.dot-activity-badge)')]);
  badges.forEach(badgeElem => {
    let count = parseInt(badgeElem.textContent, 10)
    badge += (isNaN(count) ? 1 : count)
  })

  let tenantName = ''
  const tenantNameElem = document.querySelector('.app-header-bar-tenant-name')
  if(tenantNameElem) {
    tenantName = tenantNameElem.textContent
  }

  ipcRenderer.send('tab-info', {
    badge,
    tenantName
  })

  updateBadgesTimeout = undefined
}
const scheduleUpdateBadges = () => {
  if(updateBadgesTimeout) return
  updateBadgesTimeout = setTimeout(updateBadges, 500)
}

document.addEventListener("DOMContentLoaded", () => {
  const observer = new MutationObserver((mutationsList, observer) => {
    for(let mutation of mutationsList) {
      if (mutation.type === 'childList') {
        var useWebAppLink = document.querySelector('.use-app-lnk')
        if(useWebAppLink) {
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