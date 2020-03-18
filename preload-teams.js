const { ipcRenderer } = require('electron')
//console.log('preload-teams!')

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

const updateBadges = () => {
  let count = 0;
  const badges = ([...document.querySelectorAll('.activity-badge:not(.dot-activity-badge)')]);
  badges.forEach(badge => {
    count += parseInt(badge.textContent, 10)
  })
  //console.log('Badge count:', count)
  ipcRenderer.send('badge-count', count)
}

document.addEventListener("DOMContentLoaded", () => {
  const observer = new MutationObserver((mutationsList, observer) => {
    for(let mutation of mutationsList) {
      if (mutation.type === 'childList') {
        //console.log('A child node has been added or removed.', mutation)
        // const addedBadges = ([...mutation.addedNodes]).filter(node => {
        //   if(!node.getAttribute) return false
        //   const classes = node.getAttribute('class')
        //   //console.log(classes, node)
        //   if(!classes || classes.indexOf('activity-badge') === -1) return false
        //   return true
        // })
        //if(addedBadges.length) {
        //  console.log('Badges added: ', addedBadges.length)
          updateBadges()
        //}
      }
      // else if (mutation.type === 'attributes') {
      //   console.log('The ' + mutation.attributeName + ' attribute was modified.', mutation)
      // }
    }
  })
  observer.observe(document.body, 
    { attributes: true, childList: true, subtree: true })
  //observer.disconnect()
})

// console.log('preload-teams?', window, window.Notification)
// window.OldNotification = window.Notification;

// class ElectronNotification extends window.OldNotification {
//   permission = 'default'
// }
// window.Notification = ElectronNotification


// ipcRenderer.invoke('badge-count', 2).then((result) => {
//   console.log('Received badge count result:', result)
// })
