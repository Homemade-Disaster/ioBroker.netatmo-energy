
const NotificationEmail     = 'E-Mail';
const NotificationTelegram  = 'Telegram';
const NotificationPushover  = 'Pushover';
const NotificationWhatsapp  = 'WhatsApp';
const ErrorNotification     = 'Error';
const InfoNotification      = 'Info';
const WarningNotification   = 'Warn';

// send notifications
function sendNotification(adapter, errortype, subject, messageText) {
	if(!adapter.config.notificationEnabled) return;
	if (!((adapter.config.notifications.substring(0,1) != '0' && errortype == InfoNotification) || (adapter.config.notifications.substring(1,2) != '0' && errortype == WarningNotification) || (adapter.config.notifications.substring(2,3) != '0' && errortype == ErrorNotification))) return;

	switch(adapter.config.notificationsType) {
		case NotificationEmail:
			//email
			if (adapter.email.instance !== '' && adapter.email.instance !== null && adapter.email.instance !== undefined) {
				setTimeout(function () {
					adapter.sendTo(adapter.email.instance, 'send', { text: 'Netatmo Energy:\n' + messageText, to: adapter.email.emailReceiver, subject: subject, from: adapter.email.emailSender });
				}, adapter.config.WaitToSend * 1000);
				return;
			}
			break;
		case NotificationPushover:
			//pushover
			if (adapter.pushover.instance !== '' && adapter.pushover.instance !== null && adapter.pushover.instance !== undefined) {
				if (adapter.pushover.SilentNotice === 'true' || adapter.pushover.SilentNotice === true) {
					setTimeout(function () {
						adapter.sendTo(adapter.pushover.instance, 'send', { message: 'Netatmo Energy:\n' + messageText, sound: '', priority: -1, title: subject, device: adapter.pushover.deviceID });
					}, adapter.pushover.pushoverWaiting);
				} else {
					setTimeout(function () {
						adapter.sendTo(adapter.pushover.instance, 'send', { message: 'Netatmo Energy:\n' + messageText, sound: '', title: subject, device: adapter.pushover.deviceID });
					}, adapter.config.WaitToSend * 1000);
				}
			}
			break;
		case NotificationTelegram:
			//telegram
			if (adapter.telegram.instance !== '' && adapter.telegram.instance !== null && adapter.telegram.instance !== undefined) {
				if (adapter.telegram.User && adapter.telegram.User === 'allTelegramUsers') {
					setTimeout(function () {
						adapter.sendTo(adapter.telegram.instance, 'send', { text: 'Netatmo Energy:\n' + subject + ' - ' + messageText, disable_notification: adapter.telegram.SilentNotice });
					}, adapter.telegram.telegramWaiting);
				} else {
					setTimeout(function () {
						adapter.sendTo(adapter.telegram.instance, 'send', { user: adapter.telegram.User, text: 'Netatmo Energy:\n' + subject + ' - ' + messageText, disable_notification: adapter.telegram.SilentNotice });
					}, adapter.config.WaitToSend * 1000);
				}
			}
			break;
		case NotificationWhatsapp:
			//whatsapp
			if (adapter.whatsapp.instance !== '' && adapter.whatsapp.instance !== null && adapter.whatsapp.instance !== undefined) {
				setTimeout(function () {
					adapter.sendTo(adapter.whatsapp.instance, 'send', { text: 'Netatmo Energy:\n' + subject + ' - ' + messageText });
				}, adapter.config.WaitToSend * 1000);
			}
			break;
	}
}

module.exports = {
	sendNotification
};
