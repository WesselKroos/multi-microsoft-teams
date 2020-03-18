function(e, t, i) {
  "use strict";
  Object.defineProperty(t, "__esModule", {
      value: !0
  });
  var n = function() {
      function e(e, t, i, n, s, r, a, o, c, l, p, u, h) {
          this.constants = e,
          this.resources = t,
          this.settingsService = i,
          this.platformDetectService = n,
          this.loggingService = s,
          this.teamsIconUrl = r,
          this.storageService = a,
          this.$translate = o,
          this.showToastr = c,
          this.toastr = l,
          this.showDesktopNotification = p,
          this.logPanelView = u,
          this.logPanelAction = h,
          this.COOLING_PERIOD_HOURS = 24,
          this.DEFAULT_TOAST_CLASS = "ts-toast-default"
      }
      return e.prototype.setupNotifications = function() {
          if (!this.settingsService.valueAsBoolean(this.constants.settings.names.runningscenariotests) && !this.platformDetectService.isSurfaceHub()) {
              if (this.scenario = this.loggingService.newScenario(this.constants.scenarios.notifications.desktopEnablement.name),
              !Notify.isSupported)
                  return this.scenario.fail({
                      reason: this.constants.scenarios.notifications.desktopEnablement.markers.notSupported
                  }),
                  void this.logPanelView({
                      column: "notSupported"
                  }, teamspace.PanelType.weboptin, teamspace.PanelRegion.toast);
              switch (Notify.permissionLevel) {
              case "granted":
                  this.scenario.stop({
                      reason: this.constants.scenarios.notifications.desktopEnablement.markers.alreadyEnabled
                  });
                  break;
              case "denied":
                  this.scenario.stop({
                      reason: this.constants.scenarios.notifications.desktopEnablement.markers.alreadyDisabled
                  });
                  break;
              case "default":
                  this.handleDefaultPermissionLevel()
              }
          }
      }
      ,
      e.prototype.handleDefaultPermissionLevel = function() {
          var e = this
            , t = this.storageService.get(this.constants.storageServiceKeys.deskNotifToastState, !1);
          t && t.firstDismissTime ? (moment().toDate().getTime() - t.firstDismissTime) / this.constants.timeInMiliseconds.hour > this.COOLING_PERIOD_HOURS ? t.secondDismissTime ? this.scenario.stop({
              reason: this.constants.scenarios.notifications.desktopEnablement.markers.alreadyOptedOut
          }) : t.secondDismissTime || this.createPermissionToastr(this.$translate.instant(this.resources.strings.notification_enable_desktop_fallback_message), this.$translate.instant(this.resources.strings.notification_enable_desktop_button_yes), this.askForPermission.bind(this), this.$translate.instant(this.resources.strings.notification_enable_desktop_fallback_button_no), function() {
              e.toastDismissHandler("secondDismissTime", e.constants.scenarios.notifications.desktopEnablement.markers.neverAskAgain)
          }, this.constants.scenarios.notifications.desktopEnablement.markers.permissionToastrFallback) : this.scenario.stop({
              reason: this.constants.scenarios.notifications.desktopEnablement.markers.coolingPeriod
          }) : this.createPermissionToastr(this.$translate.instant(this.resources.strings.notification_enable_desktop_message), this.$translate.instant(this.resources.strings.notification_enable_desktop_button_yes), this.askForPermission.bind(this), this.$translate.instant(this.resources.strings.notification_enable_desktop_button_no), function() {
              e.toastDismissHandler("firstDismissTime", e.constants.scenarios.notifications.desktopEnablement.markers.askMeLater)
          }, this.constants.scenarios.notifications.desktopEnablement.markers.permissionToastr)
      }
      ,
      e.prototype.toastDismissHandler = function(e, t) {
          var i = this.storageService.get(this.constants.storageServiceKeys.deskNotifToastState, !1) || {};
          i[e] = moment().toDate().getTime(),
          this.storageService.set(this.constants.storageServiceKeys.deskNotifToastState, i, !1),
          this.scenario.stop({
              reason: t
          }),
          this.logPanelAction(teamspace.components.PanelActionOutcome.deny, teamspace.components.PanelActionScenario.toastclick, teamspace.components.PanelActionScenarioType.deny, teamspace.PanelType.weboptin, teamspace.components.PanelModuleType.toast, teamspace.components.PanelModuleName.toastitem, {
              column: t === this.constants.scenarios.notifications.desktopEnablement.markers.askMeLater ? this.constants.scenarios.notifications.desktopEnablement.markers.permissionToastr : this.constants.scenarios.notifications.desktopEnablement.markers.permissionToastrFallback
          })
      }
      ,
      e.prototype.createPermissionToastr = function(e, t, i, n, s, r) {
          var a = this
            , o = null
            , c = [{
              action: function() {
                  a.toastr.clear(o),
                  i(r)
              },
              actionKind: teamspace.services.NotificationActionKind.ToastButton,
              label: t
          }, {
              action: function() {
                  a.toastr.clear(o),
                  s()
              },
              actionKind: teamspace.services.NotificationActionKind.ToastButton,
              label: n
          }];
          o = this.showToastr({
              title: e,
              message: "",
              notificationType: SkypeX.Services.NotificationType.DesktopNotification,
              userImage: this.teamsIconUrl,
              actions: c,
              primaryAction: c[0],
              timeout: !1,
              type: this.DEFAULT_TOAST_CLASS
          }, c[0].action.bind(this)),
          this.scenario.mark(r),
          this.logPanelView({
              column: r
          }, teamspace.PanelType.weboptin, teamspace.PanelRegion.toast)
      }
      ,
      e.prototype.askForPermission = function(e) {
          this.scenario.mark(this.constants.scenarios.notifications.desktopEnablement.markers.browserDialog),
          Notify.requestPermission(this.onPermissionGranted.bind(this, e), this.onPermissionDenied.bind(this, e)),
          this.logPanelAction(teamspace.components.PanelActionOutcome.grant, teamspace.components.PanelActionScenario.toastclick, teamspace.components.PanelActionScenarioType.grant, teamspace.PanelType.weboptin, teamspace.components.PanelModuleType.toast, teamspace.components.PanelModuleName.toastitem, {
              column: e
          })
      }
      ,
      e.prototype.onPermissionGranted = function(e) {
          Notify.permissionLevel = "granted",
          this.scenario.stop({
              reason: this.constants.scenarios.notifications.desktopEnablement.markers.permissionGranted
          }),
          this.showDesktopNotification({
              title: this.$translate.instant(this.resources.strings.notification_enable_desktop_demo_title),
              message: this.$translate.instant(this.resources.strings.notification_enable_desktop_demo_message)
          }, {
              img: this.teamsIconUrl,
              key: null
          }),
          this.logPanelAction(teamspace.components.PanelActionOutcome.grant, teamspace.components.PanelActionScenario.popupclick, teamspace.components.PanelActionScenarioType.grant, teamspace.PanelType.weboptin, teamspace.components.PanelModuleType.popup, teamspace.components.PanelModuleName.popupitem, {
              column: e
          })
      }
      ,
      e.prototype.onPermissionDenied = function(e) {
          Notify.permissionLevel = "denied",
          this.scenario.fail({
              reason: this.constants.scenarios.notifications.desktopEnablement.markers.permissionDenied
          }),
          this.logPanelAction(teamspace.components.PanelActionOutcome.deny, teamspace.components.PanelActionScenario.popupclick, teamspace.components.PanelActionScenarioType.deny, teamspace.PanelType.weboptin, teamspace.components.PanelModuleType.popup, teamspace.components.PanelModuleName.popupitem, {
              column: e
          })
      }
      ,
      e
  }();
  t.WebNotificationsEnablement = n
}