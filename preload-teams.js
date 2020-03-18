console.log('preload-teams!')

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

// console.log('preload-teams?', window, window.Notification)
// window.OldNotification = window.Notification;

// class ElectronNotification extends window.OldNotification {
//   permission = 'default'
// }
// window.Notification = ElectronNotification