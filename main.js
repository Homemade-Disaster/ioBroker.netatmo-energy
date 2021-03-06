'use strict';

// Load modules
const utils = require('@iobroker/adapter-core');
//const abort = require('abort-controller');
const fetch = require('fetch');
const mytools = require('./lib/mytools');

//Define global constants
// Netatmo API requests
const Netatmo_TokenRequest_URL            = 'https://api.netatmo.net/oauth2/token';
const Netatmo_APIrequest_URL              = 'https://api.netatmo.com/api/';

const APIRequest_homesdata                = 'homesdata';
const APIRequest_homesdata_NAPlug         = 'NAPlug';

const APIRequest_homestatus               = 'homestatus';

const APIRequest_getroommeasure		        = 'getroommeasure';
const APIRequest_getmeasure				        = 'getmeasure';

const APIRequest_setroomthermpoint        = 'setroomthermpoint';
const APIRequest_setroomthermpoint_manual = 'manual';

const APIRequest_setthermmode             = 'setthermmode';
const APIRequest_setthermmode_schedule    = 'schedule';
const APIRequest_setthermmode_hg          = 'hg';
const APIRequest_setthermmode_away        = 'away';

const APIRequest_switchhomeschedule       = 'switchhomeschedule';

const APIRequest_synchomeschedule         = 'synchomeschedule';

// Energy APP
const Trigger_applychanges								= 'applychanges';
const Trigger_refresh_all 								= 'refresh_structure';
const Trigger_SetTemp                     = 'SetTemp';

// Energy APP Channels / States
const Device_APIRequests                  = 'energyAPP';

const Channel_APIRequests									= 'APIRequests';
const Channel_homesdata										= 'homesdata';
const Channel_homestatus									= 'homestatus';
const Channel_getroommeasure							= 'getroommeasure';
const Channel_getmeasure									= 'getmeasure';

const Channel_setthermmode					  		= 'setthermmode';
const Channel_status											= 'status';
const Channel_trigger											= 'trigger';
const Channel_switchhomeschedule					= 'switchhomeschedule';
const Channel_synchomeschedule						= 'synchomeschedule';
const Channel_parameters									= 'parameters';

const Channel_Status_API_running					= 'status';
const Channel_settings										= 'settings';
const Channel_modulestatus								= 'modulestatus';

const State_TempChanged										= 'TempChanged';
const State_TempChanged_Mode							= 'mode';
const State_TempChanged_Endtime						= 'endtime';
const State_therm_setpoint_temperature		= 'therm_setpoint_temperature';
const State_schedule_id										= 'schedule_id';
const State_zones													= 'zones';
const State_timetable											= 'timetable';
const State_hg_temp												= 'hq_temp';
const State_away_temp											= 'away_temp';
const State_gateway_types									= 'gateway_types';
const State_device_types									= 'device_types';
const State_device_id											= 'device_id';
const State_room_id												= 'room_id';
const State_scale													= 'scale';
const State_type													= 'type';
const State_date_begin										= 'date_begin';
const State_date_end											= 'date_end';
const State_limit													= 'limit';
const State_optimize											= 'optimize';
const State_real_time											= 'real_time';
const State_response											= 'response';
const State_Time_Exec											= 'time_exec';
const State_Status_API_running						= 'running';

//Value lists
const List_mode														= '{"manual": "manual temperature", "max": "maximum temperature", "hq": "frost guardian temperature", "home": "home temperature" }';
const List_gateway_type										= '{"NAPlug": "Relay / Smart vales", "NATherm1": "Smart Thermostat (NATherm1)", "NRV": "Smart Thermostat (NRV)" }';
const List_device_types 									= '{"thermostat": "Thermostat" }';
const List_scale													= '{"30min": "30 Minits", "1hour": "one hour", "3hours": "Three hours", "1day": "One day", "1week": "One Week"}';
const List_type_mm												= '{"boileron": "Boiler on", "boileroff": "Boiler off", "sum_boiler_on": "Sum of Boiler on", "sum_boiler_off": "Sum of Boiler off"}';
const List_type_rm												= '{"temperature": "Temperature"}';

//notifications
const NotificationEmail     = 'E-Mail';
const NotificationTelegram  = 'Telegram';
const NotificationPushover  = 'Pushover';
const NotificationWhatsapp  = 'WhatsApp';
const NoticeTypeLong        = 'longNotice';
const ErrorNotification     = 'Error';
const InfoNotification      = 'Info';
const WarningNotification   = 'Warn';

// Main Class
class NetatmoEnergy extends utils.Adapter {
	/**
	 * @param {Partial<utils.AdapterOptions>} [adapter={}]
	 */
	constructor(adapter) {
		super({
			...adapter,
			name: 'netatmo-energy',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		//this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));

		this.globalDevice               = null;
		this.globalAPIChannel           = null;
		this.globalAPIChannelTrigger    = null;
		this.globalAPIStatus				    = null;
		this.globalNetatmo_AccessToken  = null;
		this.globalRefreshToken         = null;
		this.globalNetatmo_ExpiresIn    = 0;
		this.globalScheduleObjects      = {};
		this.globalScheduleList         = {};
		this.globalScheduleListArray    = [];
		this.globalRoomId               = {};
		this.globalRoomIdArray          = [];
		this.globalDeviceId             = {};
		this.globalDeviceIdArray        = [];
		this.systemlang 							  = 'de';
		this.telegramm 									= {};
		this.whatsapp 									= {};
		this.pushover 									= {};
		this.email		 									= {};
		this.adapterIntervals           = [];
		//this.FetchAbortController 			= new abort.AbortController();
	}
	// Decrypt password
	decrypt(key, value) {
		let result = '';
		for (let i = 0; i < value.length; ++i) {
			result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
		}
		return result;
	}

	// Is called when databases are connected and adapter received configuration
	async onReady() {
		//Check adapter configuration
		if (!this.config.HomeId || !this.config.ClientId || !this.config.ClientSecretID || !this.config.User || !this.config.Password) {
			this.log.error('*** Adapter deactivated, missing adaper configuration !!! ***');
			this.setForeignState('system.adapter.' + this.namespace + '.alive', false);
		}
		//Passwort decryption
		await this.getForeignObject('system.config', (err, obj) => {
			this.systemLang = obj.common.language;
			if (!this.supportsFeature() || !this.supportsFeature('ADAPTER_AUTO_DECRYPT_NATIVE')) {
				if (obj && obj.native && obj.native.secret) {
					this.config.Password = this.decrypt(obj.native.secret, this.config.Password);
				}
				else {
					this.config.Password = this.decrypt('Zgfr56gFe87jJOM', this.config.Password);
				}
			}
		});
		this.initAdapter(this.systemLang);
		this.startAdapter();
	}

	// Start initialization adapter
	initAdapter(systemLang) {
		// define global constants
		this.globalDevice              = this.namespace + '.' + Device_APIRequests;
		this.globalAPIChannel          = this.namespace + '.' + Device_APIRequests + '.' + Channel_APIRequests;
		this.globalAPIChannelTrigger   = this.namespace + '.' + Device_APIRequests + '.' + Channel_trigger;
		this.globalAPIChannelStatus    = this.namespace + '.' + Device_APIRequests + '.' + Channel_Status_API_running;

		this.telegram = {
			type: 'message',
			instance: this.config.telegramInstance,
			SilentNotice: this.config.telegramSilentNotice,
			User: this.config.telegramUser,
			systemLang
		};

		this.whatsapp = {
			type: 'message',
			instance: this.config.whatsappInstance,
			systemLang
		};

		this.pushover = {
			type: 'message',
			instance: this.config.pushoverInstance,
			SilentNotice: this.config.pushoverSilentNotice,
			deviceID: this.config.pushoverDeviceID,
			systemLang
		};

		this.email = {
			type: 'message',
			instance: this.config.emailInstance,
			emailReceiver: this.config.emailReceiver,
			emailSender: this.config.emailSender,
			systemLang
		};
	}

	// Start initialization
	async startAdapter() {
		// Set polling intervall
		const refreshtime = this.config.refreshstates;
		const that = this;
		const updateAPIStatus = async function () {
			that.log.debug(mytools.tl('API Request homestatus sent to API each', that.systemLang) + ' ', + refreshtime + mytools.tl('sec', that.systemLang));
			await that.RefreshWholeStructure(true);
		};
		if (refreshtime && refreshtime > 0) {
			that.log.info(mytools.tl('Refresh homestatus interval', that.systemLang) +' ' + refreshtime * 1000);
			// Timer
			that.adapterIntervals.push(setInterval(updateAPIStatus, refreshtime * 1000));
		}
		//Start initial requests for adapter
		await this.createEnergyAPP();
		await this.RefreshWholeStructure(false);
	}

	// Create APP Requests device
	async createEnergyAPP() {
		// Device energyAPP
		await this.createMyDevice(this.globalDevice, 'Netatmo Energy APP');
		// Channel APIRequests
		await this.createMyChannel(this.globalAPIChannel, 'Requests for Netatmo Energy API');

		// Channel setthomesdata
		await this.createMyChannel(this.globalAPIChannel + '.' + Channel_homesdata, 'API homesdata');
		await this.createMyChannel(this.globalAPIChannel + '.' + Channel_homesdata + '.' + Channel_parameters, 'parameters');
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_homesdata + '.'+ APIRequest_homesdata, 'homesdata', false, true, 'button', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_homesdata + '.'+ Channel_parameters + '.' + State_gateway_types, 'gateway types', '', true, 'text', true, true, List_gateway_type, false, false);
		await this.subscribeStates(this.globalAPIChannel + '.' + Channel_homesdata + '.' + APIRequest_homesdata);

		// Channel setthomestatus
		await this.createMyChannel(this.globalAPIChannel + '.' + Channel_homestatus, 'API homesstatus');
		await this.createMyChannel(this.globalAPIChannel + '.' + Channel_homestatus + '.' + Channel_parameters, 'parameters');
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_homestatus + '.'+ Channel_parameters + '.' + State_device_types, 'device types', '', true, 'text', true, true, List_device_types, false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_homestatus + '.' + APIRequest_homestatus, 'homesstatus', false, true, 'button', true, true, '', false, false);
		await this.subscribeStates(this.globalAPIChannel + '.' + Channel_homestatus + '.' + APIRequest_homestatus);

		// Channel setthermmode
		await this.createMyChannel(this.globalAPIChannel + '.' + Channel_setthermmode, 'API setthermmode');
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_setthermmode + '.'+ APIRequest_setthermmode + '_' + APIRequest_setthermmode_schedule, 'setthermmode_schedule', false, true, 'button', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_setthermmode + '.' + APIRequest_setthermmode + '_' + APIRequest_setthermmode_hg, 'setthermmode_hg', false, true, 'button', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_setthermmode + '.' + APIRequest_setthermmode + '_' + APIRequest_setthermmode_away, 'setthermmode_away', false, true, 'button', true, true, '', false, false);
		await this.subscribeStates(this.globalAPIChannel + '.' + Channel_setthermmode + '.' + APIRequest_setthermmode + '_' + APIRequest_setthermmode_schedule);
		await this.subscribeStates(this.globalAPIChannel + '.' + Channel_setthermmode + '.' + APIRequest_setthermmode + '_' + APIRequest_setthermmode_hg);
		await this.subscribeStates(this.globalAPIChannel + '.' + Channel_setthermmode + '.' + APIRequest_setthermmode + '_' + APIRequest_setthermmode_away);

		// Channel synchomeschedule
		await this.createMyChannel(this.globalAPIChannel + '.' + Channel_synchomeschedule, 'API synchomeschedule');
		await this.createMyChannel(this.globalAPIChannel + '.' + Channel_synchomeschedule + '.' + Channel_parameters, 'parameters');
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_synchomeschedule + '.' + APIRequest_synchomeschedule, 'synchomeschedule', false, true, 'button', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_synchomeschedule + '.' + Channel_parameters + '.' + State_schedule_id, 'Id of the schedule', '', true, 'text', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_synchomeschedule + '.' + Channel_parameters + '.' + State_zones, 'Array of data used to define time periods to build a schedule. More info on the Thermostat page. id of zone | type of zone | Name of zone | Temperature', '', true, 'list', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_synchomeschedule + '.' + Channel_parameters + '.' + State_timetable, 'Array describing the timetable. More info on the Thermostat page. ID of the zone - offset in minutes since Monday 00:00:01', '', true, 'list', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_synchomeschedule + '.' + Channel_parameters + '.' + State_hg_temp, 'Frost guard temperature value', 7, true, 'number', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_synchomeschedule + '.' + Channel_parameters + '.' + State_away_temp, 'Away temperature value', 12, true, 'number', true, true, '', false, false);
		await this.subscribeStates(this.globalAPIChannel + '.' + Channel_synchomeschedule + '.' + APIRequest_synchomeschedule);

		// Channel getroommeasure
		await this.createMyChannel(this.globalAPIChannel + '.' + Channel_getroommeasure, 'API getroommeasure');
		await this.createMyChannel(this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters, 'parameters');
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + APIRequest_getroommeasure, 'getroommeasure', false, true, 'button', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + State_response, 'Request response', '', true, 'text', false, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters + '.' + State_room_id, 'Id of room', '', true, 'text', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters + '.' + State_scale, 'Timelapse between two measurements', '', true, 'text', true, true, List_scale, false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters + '.' + State_type, 'Type of data to be returned. Setpoint temperature is only available for scales from 30 to 3hours and min/max temp and dates for scales from 1day to 1month.', '', true, 'text', true, true, List_type_rm, false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters + '.' + State_date_begin, 'Timestamp of the first measure to retrieve. Default is null', '', true, 'number', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters + '.' + State_date_end, 'Timestamp of the last measure to retrieve (default and max are 1024). Default is null', '', true, 'number', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters + '.' + State_limit, 'Maximum number of measurements (default and max Are 1024)', '', true, 'number', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters + '.' + State_optimize, 'Determines the format of the answer. Default is true. For mobile apps we recommend True and False if bandwidth isn\'t an issue as it is easier to parse', false, true, 'indicator', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters + '.' + State_real_time, 'real_time', false, true, 'indicator', true, true, '', false, false);
		await this.subscribeStates(this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + APIRequest_getroommeasure);

		// Channel getmeasure
		await this.createMyChannel(this.globalAPIChannel + '.' + Channel_getmeasure, 'API getmeasure');
		await this.createMyChannel(this.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters, 'parameters');
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getmeasure + '.' + APIRequest_getmeasure, 'getmeasure', false, true, 'button', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getmeasure + '.' + State_response, 'Request response', '', true, 'text', false, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters + '.' + State_device_id, 'Mac adress of the device', '', true, 'text', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters + '.' + State_scale, 'Timelapse between two measurements', '', true, 'text', true, true, List_scale, false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters + '.' + State_type, 'Type of data to be returned. Setpoint temperature is only available for scales from 30 to 3hours and min/max temp and dates for scales from 1day to 1month.', '', true, 'text', true, true, List_type_mm, false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters + '.' + State_date_begin, 'Timestamp of the first measure to retrieve. Default is null', '', true, 'number', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters + '.' + State_date_end, 'Timestamp of the last measure to retrieve (default and max are 1024). Default is null', '', true, 'number', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters + '.' + State_limit, 'Maximum number of measurements (default and max Are 1024)', '', true, 'number', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters + '.' + State_optimize, 'Determines the format of the answer. Default is true. For mobile apps we recommend True and False if bandwidth isn\'t an issue as it is easier to parse', false, true, 'indicator', true, true, '', false, false);
		await this.createNetatmoStructure(this.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters + '.' + State_real_time, 'real_time', false, true, 'indicator', true, true, '', false, false);
		await this.subscribeStates(this.globalAPIChannel + '.' + Channel_getmeasure + '.' + APIRequest_getmeasure);

		// Channel trigger
		await this.createMyChannel(this.globalAPIChannelTrigger, 'API setroomthermpoint');
		await this.createNetatmoStructure(this.globalAPIChannelTrigger + '.' + Trigger_applychanges, 'trigger to send changes to Netatmo Cloud', false, true, 'button', true, true, '', false, false);
		await this.subscribeStates(this.globalAPIChannelTrigger + '.' + Trigger_applychanges);
		await this.createNetatmoStructure(this.globalAPIChannelTrigger + '.' + Trigger_refresh_all, 'trigger to refresh homestructure from Netatmo Cloud', false, true, 'button', true, true, '', false, false);
		await this.subscribeStates(this.globalAPIChannelTrigger + '.' + Trigger_refresh_all);
		await this.createMyChannel(this.globalAPIChannelStatus, 'API Request status');
		await this.createNetatmoStructure(this.globalAPIChannelStatus + '.' + State_Status_API_running, 'API running status ', false, true, 'indicator', false, true, '', false, true);
	}


	//Send notification after request
	async sendRequestNotification(NetatmoRequest, NotificationType, addText, longText) {
		switch(NetatmoRequest) {
			//set requests
			case APIRequest_setroomthermpoint:
				this.sendNotification(this, NotificationType, NetatmoRequest, mytools.tl('Target temperature changed', this.systemLang) + ((this.config.NoticeType == NoticeTypeLong && longText != '') ? '\n' + longText : ''));
				break;
			case APIRequest_setthermmode:
				this.sendNotification(this, NotificationType, NetatmoRequest, mytools.tl('Mode for your heating system was set to', this.systemLang) + ' ' + addText + ((this.config.NoticeType == NoticeTypeLong && longText != '') ? '\n' + longText : ''));
				break;
			case APIRequest_switchhomeschedule:
				this.sendNotification(this, NotificationType, NetatmoRequest, mytools.tl('Changed schedule for your heating system to', this.systemLang) + ' ' +  addText + ((this.config.NoticeType == NoticeTypeLong && longText != '') ? '\n' + longText : ''));
				break;
			case APIRequest_synchomeschedule:
				this.sendNotification(this, NotificationType, NetatmoRequest, mytools.tl('Changed weekly schedule', this.systemLang) + ' ' + addText + ' ' + mytools.tl('for your heating system', this.systemLang) + ((this.config.NoticeType == NoticeTypeLong && longText != '') ? '\n' + longText : ''));
				break;
			//get requestst
			case APIRequest_getroommeasure:
				await this.getNameofRoom(addText.substring(addText.lastIndexOf('&room_id=') + 9, addText.lastIndexOf('&scale=')));
				break;
			case APIRequest_getmeasure:
				await this.getNameofDevice(addText.substring(addText.lastIndexOf('&device_id=') + 11, addText.lastIndexOf('&scale=')));
				break;
			default:
				this.sendNotification(this, NotificationType, NetatmoRequest, addText + ((this.config.NoticeType == NoticeTypeLong && longText != '') ? '\n' + longText : ''));
				break;
		}
	}

	// send notifications
	sendNotification(adapter, errortype, subject, messageText) {
		if(!this.config.notificationEnabled) return;
		if (!((this.config.notifications.substring(0,1) != '0' && errortype == InfoNotification) || (this.config.notifications.substring(1,2) != '0' && errortype == WarningNotification) || (this.config.notifications.substring(2,3) != '0' && errortype == ErrorNotification))) return;

		switch(this.config.notificationsType) {
			//email
			case NotificationEmail:
				if (this.email.instance !== '' && this.email.instance !== null && this.email.instance !== undefined) {
					adapter.sendTo(adapter.email.instance, 'send', { text: 'Netatmo Energy:\n' + messageText, to: adapter.email.emailReceiver, subject: subject, from: adapter.email.emailSender });
					return;
				}
				break;

			//pushover
			case NotificationPushover:
				if (this.pushover.instance !== '' && this.pushover.instance !== null && this.pushover.instance !== undefined) {
					if (this.pushover.SilentNotice === 'true' || this.pushover.SilentNotice === true) {
						adapter.sendTo(adapter.pushover.instance, 'send', { message: 'Netatmo Energy:\n' + messageText, sound: '', priority: -1, title: subject, device: adapter.pushover.deviceID });
					} else {
						adapter.sendTo(adapter.pushover.instance, 'send', { message: 'Netatmo Energy:\n' + messageText, sound: '', title: subject, device: adapter.pushover.deviceID });
					}
				}
				break;

			//telegram
			case NotificationTelegram:
				if (this.telegram.instance !== '' && this.telegram.instance !== null && this.telegram.instance !== undefined) {
					if (this.telegram.User && this.telegram.User === 'allTelegramUsers') {
						adapter.sendTo(adapter.telegram.instance, 'send', { text: 'Netatmo Energy:\n' + subject + ' - ' + messageText, disable_notification: adapter.telegram.SilentNotice });
					} else {
						adapter.sendTo(adapter.telegram.instance, 'send', { user: adapter.telegram.User, text: 'Netatmo Energy:\n' + subject + ' - ' + messageText, disable_notification: adapter.telegram.SilentNotice });
					}
				}
				break;

			//whatsapp
			case NotificationWhatsapp:
				if (this.whatsapp.instance !== '' && this.whatsapp.instance !== null && this.whatsapp.instance !== undefined) {
					adapter.sendTo(adapter.whatsapp.instance, 'send', { text: 'Netatmo Energy:\n' + subject + ' - ' + messageText });
				}
				break;
		}
	}

	// Send API inkluding tokenrequest
	async sendAPIRequest(APIRequest, setpayload, norefresh, lastrequest) {
		const Netatmo_Path = this.namespace;

		// Refresh the token after it nearly expires
		const expirationTimeInSeconds = this.globalNetatmo_ExpiresIn;
		const nowInSeconds = (new Date()).getTime() / 1000;
		const shouldRefresh = nowInSeconds >= expirationTimeInSeconds;

		this.log.debug('Start refresh request');
		await this.setState(this.globalAPIChannelStatus + '.' + State_Status_API_running, true, true);

		//Send Token request to API
		if (shouldRefresh || !this.globalNetatmo_AccessToken) {
			this.log.info(mytools.tl('Start Token-request:', this.systemLang) + ' ' + APIRequest + ' ' + setpayload);
			await this.getToken(this.config.HomeId,this.config.ClientId,this.config.ClientSecretID,this.config.User,this.config.Password)
				.then(tokenvalues => {
					this.globalNetatmo_AccessToken = tokenvalues.access_token;
					this.globalNetatmo_ExpiresIn   = tokenvalues.expires_in + ((new Date()).getTime() / 1000) - 20;
					this.globalRefreshToken        = tokenvalues.refresh_token;
					this.log.debug(mytools.tl('Token OK:', this.systemLang) + ' ' + this.globalNetatmo_AccessToken);
				})
				.catch(async (error) => {
					this.globalNetatmo_AccessToken = null;
					this.globalRefreshToken        = null;
					this.globalNetatmo_ExpiresIn   = 0;
					this.log.error(mytools.tl('Did not get a tokencode:', this.systemLang) + ' ' + error.error + ': ' + error.error_description);
					await this.sendRequestNotification(null, ErrorNotification, mytools.tl('API Token', this.systemLang) + '\n', mytools.tl('Did not get a tokencode:', this.systemLang), error.error + ': ' + error.error_description);
				});
		}

		// only send API request if we get the token
		if (this.globalNetatmo_AccessToken != '' || this.globalNetatmo_AccessToken) {
			if (APIRequest == APIRequest_homestatus) {
				this.globalRoomIdArray   = [];
				this.globalDeviceIdArray = [];
			}

			this.log.info(mytools.tl('Start API-request:', this.systemLang) + ' ' + APIRequest);
			await this.getAPIRequest(APIRequest,setpayload)
				.then(async (response) => {
					switch(APIRequest) {
						case APIRequest_getroommeasure:
							await this.setState(this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + State_response, JSON.stringify(response), true);
							await this.sendRequestNotification(APIRequest, InfoNotification, setpayload, JSON.stringify(response));
							break;
						case APIRequest_getmeasure:
							await this.setState(this.globalAPIChannel + '.' + Channel_getmeasure + '.' + State_response, JSON.stringify(response), true);
							await this.sendRequestNotification(APIRequest, InfoNotification, setpayload, JSON.stringify(response));
							break;
						case APIRequest_homesdata:
							await this.getValuesFromNetatmo(APIRequest,response,'','',Netatmo_Path, norefresh);
							break;
						case APIRequest_homestatus:
							await this.getValuesFromNetatmo(APIRequest,response,'','',Netatmo_Path, norefresh);
							await this.searchSchedule();
							break;
						default:
							this.log.debug(mytools.tl('API changes applied', this.systemLang) + ' ' + APIRequest);
					}
					this.log.debug(mytools.tl('API request finished', this.systemLang));
					if (lastrequest) {
						await this.setState(this.globalAPIChannelStatus + '.' + State_Status_API_running, false, true);
					}
				})
				.catch(error => {
					this.log.error(mytools.tl('API request not OK:', this.systemLang) + ' ' + error.error + ': ' + error.error_description);
					this.sendRequestNotification(null, ErrorNotification, APIRequest + '\n', mytools.tl('API request not OK:', this.systemLang), error.error + ': ' + error.error_description);
				});
		} else {
			if (lastrequest) {
				await this.setState(this.globalAPIChannelStatus + '.' + State_Status_API_running, false, true);
			}
		}
	}

	//get token from Netatmo
	getToken(HomeId,ClientId,ClientSecretID,User,Password) {
		this.globalNetatmo_AccessToken = null;
		let payload = '';

		if (!this.globalRefreshToken) {
			payload = 'grant_type=password&client_id=' + ClientId + '&client_secret=' + ClientSecretID + '&username=' + User + '&password=' + Password + '&scope=read_thermostat write_thermostat';
		} else {
			payload  = 'grant_type=refresh_token&refresh_token=' + this.globalRefreshToken + '&client_id=' + ClientId + '&client_secret=' + ClientSecretID;
		}
		return this._myFetch(Netatmo_TokenRequest_URL,payload);
	}

	//API request main routine
	getAPIRequest(NetatmoRequest, extend_payload) {
		const payload = 'access_token=' + this.globalNetatmo_AccessToken + '&home_id=' + this.config.HomeId + extend_payload;
		this.log.debug(mytools.tl('Request:', this.systemLang) + ' ' + Netatmo_APIrequest_URL + NetatmoRequest + ((payload) ? '?' + payload : payload));
		return this._myFetch(Netatmo_APIrequest_URL + NetatmoRequest, payload);
	}

	// send homesdata API Request
	async sendHomesdataAPIRequest (APIRequest, norefresh) {
		let gateway_types = await this.getValuefromDatapoint('&gateway_types=', this.globalAPIChannel + '.' + Channel_homestatus + '.' + Channel_parameters + '.' + State_gateway_types);
		if ((gateway_types.match(/&/g) || []).length != 1) {
			gateway_types = '&gateway_types=' + APIRequest_homesdata_NAPlug;
		}
		await this.sendAPIRequest(APIRequest, gateway_types, norefresh, true);
	}

	// send homesdata API Request
	async sendHomestatusAPIRequest (APIRequest, norefresh) {
		const device_types = await this.getValuefromDatapoint('&device_types=', this.globalAPIChannel + '.' + Channel_homestatus + '.' + Channel_parameters + '.' + State_device_types);
		await this.sendAPIRequest(APIRequest, device_types, norefresh, true);
	}

	// send getroomsmeasure API Request
	async sendRoomsmeasureAPIRequest (APIRequest, norefresh) {
		await this.setState(this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + State_response, '', true);

		let measure_payload = await this.getValuefromDatapoint('&room_id=',             this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters + '.' + State_room_id);
		measure_payload = measure_payload +	await this.getValuefromDatapoint('&scale=', this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters + '.' + State_scale);
		measure_payload = measure_payload +	await this.getValuefromDatapoint('&type=',  this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters + '.' + State_type);

		//let measure_payload = '&home_id=' + this.config.HomeId;
		if ((measure_payload.match(/&/g) || []).length == 3) {
			measure_payload = measure_payload +	await this.getValuefromDatapoint('&date_begin=', this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters + '.' + State_date_begin);
			measure_payload = measure_payload +	await this.getValuefromDatapoint('&date_end=',   this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters + '.' + State_date_end);
			measure_payload = measure_payload +	await this.getValuefromDatapoint('&limit=',      this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters + '.' + State_limit);
			measure_payload = measure_payload +	await this.getValuefromDatapoint('&optimize=',   this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters + '.' + State_optimize);
			measure_payload = measure_payload +	await this.getValuefromDatapoint('&real_time=',  this.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters + '.' + State_real_time);
			await this.sendAPIRequest(APIRequest, measure_payload, norefresh, true);
		} else {
			this.log.error(mytools.tl('API-getroosmeasure request is missing parameters', this.systemLang));
			await this.sendRequestNotification(null, WarningNotification, APIRequest + '\n', mytools.tl('Request is missing parameters', this.systemLang), mytools.tl('Actual payload:', this.systemLang) + ' ' + measure_payload);
		}
	}

	// send getroomsmeasure API Request
	async sendMeasureAPIRequest (APIRequest, norefresh) {
		await this.setState(this.globalAPIChannel + '.' + Channel_getmeasure + '.' + State_response, '', true);

		let measure_payload = await this.getValuefromDatapoint('&device_id=',           this.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters + '.' + State_device_id);
		measure_payload = measure_payload +	await this.getValuefromDatapoint('&scale=', this.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters + '.' + State_scale);
		measure_payload = measure_payload +	await this.getValuefromDatapoint('&type=',  this.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters + '.' + State_type);

		if ((measure_payload.match(/&/g) || []).length == 3) {
			measure_payload = measure_payload +	await this.getValuefromDatapoint('&date_begin=', this.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters + '.' + State_date_begin);
			measure_payload = measure_payload +	await this.getValuefromDatapoint('&date_end=',   this.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters + '.' + State_date_end);
			measure_payload = measure_payload +	await this.getValuefromDatapoint('&limit=',      this.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters + '.' + State_limit);
			measure_payload = measure_payload +	await this.getValuefromDatapoint('&optimize=',   this.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters + '.' + State_optimize);
			measure_payload = measure_payload +	await this.getValuefromDatapoint('&real_time=',  this.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters + '.' + State_real_time);
			await this.sendAPIRequest(APIRequest, measure_payload, norefresh, true);
		} else {
			this.log.error(mytools.tl('API-getmeasure request is missing parameters', this.systemLang));
			await this.sendRequestNotification(null, WarningNotification, APIRequest + '\n', mytools.tl('Request is missing parameters', this.systemLang), mytools.tl('Actual payload:', this.systemLang) + ' ' + measure_payload);
		}
	}

	//Send Changes to API
	async applyAPIRequest (NetatmoRequest,mode) {
		const that = this;
		return new Promise(
			function(resolve,reject) {

				const createAPIasync = async function(NetatmoRequest, mode, that) {
					await that.sendAPIRequest(NetatmoRequest, mode, false, true);
					resolve(true);
				};

				const createAPIAsync_syncrequest = async function(NetatmoRequest, that) {
					await that.sendSingleActualTemp(NetatmoRequest, false);
					resolve(true);
				};

				const createAPIapplyAsync_syncrequest = async function(NetatmoRequest, mode, that) {
					const searchstring = 'rooms\\.\\d+\\.' + Channel_settings + '\\.' + State_TempChanged + '';
					let changesmade = false;
					that.getStates(that.namespace + '.homes.*.rooms.*.' + Channel_settings + '.' + State_TempChanged,async function(error, states) {
						for(const id in states) {
							const adapterstates = await that.getStateAsync(id);

							if (id.search(searchstring) >= 0) {
								if (adapterstates && adapterstates.val === true) {
									await that.setState(id, false, true);

									const actPath   = id.substring(0,id.lastIndexOf('.'));
									const actParent = actPath.substring(0,actPath.lastIndexOf('.'));
									const newTemp   = await that.getStateAsync(actPath + '.' + Trigger_SetTemp);
									if (newTemp) {
										if (await that.applyActualTemp(newTemp,actPath,actParent,NetatmoRequest,mode)) {
											changesmade = true;
										}
									}
								}
							}
						}
						if (changesmade) {
							resolve(true);
						} else {
							reject(false);
						}
					});
				};

				switch (NetatmoRequest) {
					case APIRequest_setroomthermpoint:
						createAPIapplyAsync_syncrequest(NetatmoRequest, mode, that);
						break;

					case APIRequest_setthermmode:
						createAPIasync(NetatmoRequest, '&mode=' + mode, that);
						break;

					case APIRequest_switchhomeschedule:
						createAPIasync(NetatmoRequest, '&schedule_id=' + mode, that);
						break;

					case APIRequest_synchomeschedule:
						createAPIAsync_syncrequest(NetatmoRequest, that);
						break;
				}
			});
	}

	//Send Changes to API and create API status request
	async applySingleAPIRequest (NetatmoRequest,mode, info) {
		const that = this;
		await this.applyAPIRequest(NetatmoRequest,mode)
			.then(async () => {
				await that.sendRequestNotification(NetatmoRequest, InfoNotification, info, '');
				if (that.config.getchangesimmediately) {
					await that.RefreshWholeStructure(false);
				}})
			.catch(() => {
				//that.log.debug('No refresh necessary because there where no changes! Changes=');
			});
	}

	//Refresh whole structure
	async RefreshWholeStructure (norefresh) {
		await this.sendAPIRequest(APIRequest_homesdata, '', norefresh, false);
		await this.sendAPIRequest(APIRequest_homestatus, '', norefresh, true);
	}

	//Apply request to API for temp
	async applyActualTemp(newTemp,actPath,actParent,NetatmoRequest,mode) {
		const roomnumber        = await this.getStateAsync(actParent + '.id');
		const actTemp           = await this.getStateAsync(actParent + '.' + Channel_status + '.' + State_therm_setpoint_temperature);
		const actTemp_mode      = await this.getStateAsync(actParent + '.' + Channel_settings + '.' + State_TempChanged_Mode);
		const actTemp_endtime   = await this.getStateAsync(actParent + '.' + Channel_settings + '.' + State_TempChanged_Endtime);

		if (roomnumber && actTemp && actTemp.val != newTemp.val) {
			let extend_payload = '&room_id=' + roomnumber.val + '&temp=' + newTemp.val;
			if (actTemp_mode && actTemp_mode.val != '') {
				extend_payload = extend_payload + '&mode=' + actTemp_mode.val;
				await this.setState(actParent + '.' + Channel_settings + '.' + State_TempChanged_Mode, '', true);
			} else {
				extend_payload = extend_payload + '&mode=' + mode;
			}
			if (actTemp_endtime && actTemp_endtime.val != '') {
				if (await this.getDateFrom1970(actTemp_endtime.val) > Date.now()) {
					extend_payload = extend_payload + '&endtime=' + actTemp_endtime.val;
				}
				await this.setState(actParent + '.' + Channel_settings + '.' + State_TempChanged_Endtime, '', true);
			}
			await this.sendAPIRequest(NetatmoRequest, extend_payload, false, true);
			return true;
		} else {
			return false;
		}
	}

	//Apply single request to API for temp
	async applySingleActualTemp(newTemp,actPath,actParent,NetatmoRequest,mode) {
		await this.applyActualTemp(newTemp,actPath,actParent,NetatmoRequest,mode);
		if (this.config.getchangesimmediately) {
			await this.sendAPIRequest(APIRequest_homestatus, '', false, true);
		}
	}

	// send sync API Request
	async sendSingleActualTemp (NetatmoRequest, norefresh) {
		let syncmode = '';
		syncmode = syncmode +	await this.getValuefromDatapoint('&zones=', this.globalAPIChannel + '.' + Channel_synchomeschedule + '.' + Channel_parameters + '.' + State_zones);
		syncmode = syncmode +	await this.getValuefromDatapoint('&timetable=', this.globalAPIChannel + '.' + Channel_synchomeschedule + '.' + Channel_parameters + '.' + State_timetable);
		syncmode = syncmode +	await this.getValuefromDatapoint('&hg_temp=',   this.globalAPIChannel + '.' + Channel_synchomeschedule + '.' + Channel_parameters + '.' + State_hg_temp);
		syncmode = syncmode +	await this.getValuefromDatapoint('&away_temp=', this.globalAPIChannel + '.' + Channel_synchomeschedule + '.' + Channel_parameters + '.' + State_away_temp);

		if ((syncmode.match(/&/g) || []).length == 4) {
			syncmode = syncmode +	await this.getValuefromDatapoint('&schedule_id=', this.globalAPIChannel + '.' + Channel_synchomeschedule + '.' + Channel_parameters + '.' + State_schedule_id);
			await this.sendAPIRequest(NetatmoRequest, syncmode, norefresh, true);
		} else {
			this.log.error('API-synchomeschedule request is missing parameters');
			await this.sendRequestNotification(null, WarningNotification, NetatmoRequest + '\n', 'Request is missing parameters', 'Actual payload: ' + syncmode);
		}
	}

	//fetch API request
	_myFetch(url, payload) {
		const that = this;
		return new Promise(
			function(resolve,reject) {
				if (!url) {
					reject({error:mytools.tl('Invalid Parameter', that.systemLang),error_description:mytools.tl('Did not get url or payload!', that.systemLang)});
					return;
				}
				try {
					fetch.fetchUrl(url, {
						method: 'POST',
						//signal: that.FetchAbortController.signal,
						headers: {
							'Content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
						},
						payload: payload
					},
					function(error, meta, body) {
						if (meta && meta.status) {
							that.log.debug(mytools.tl('Netatmo API status:', that.systemLang) + meta.status);
							if (meta.status == 200 ) {
								resolve(JSON.parse(body));
							} else {
								reject(JSON.parse(body));
							}
						} else {
							that.log.debug(mytools.tl('Netatmo API status false', that.systemLang));
							reject(JSON.parse(body));
						}
					});
				} catch(err) {
					if (err.name == 'AbortError') {
						that.log.debug(mytools.tl('Netatmo API request aborted', that.systemLang));
					} else {
						throw err;
					}
				}
			});
	}

	//Parse values from Netatmo response
	async getValuesFromNetatmo(API_Request,obj,obj_name,obj_selected,Netatmo_Path,norefresh) {
		const relevantTag = 'home\\.\\b(?:rooms|modules)\\.\\d+\\.id';
		let myobj_selected = obj_name;

		if (mytools.netatmoTags(obj_name) === true) {
			if (API_Request === APIRequest_homesdata) {
				await this.createMyChannel(Netatmo_Path, myobj_selected);
			}
		} else {
			myobj_selected = obj_selected;
		}

		for(const object_name in obj) {
			if (API_Request === APIRequest_homestatus) {
				const fullname = mytools.getPrefixPath(Netatmo_Path + '.') + object_name;
				if (fullname.search(relevantTag) >= 0) {
					await this.searchAllRooms(obj[object_name], obj, norefresh);
					await this.searchAllModules(obj[object_name], obj);
				}
			}
			if(obj[object_name] instanceof Object) {
				if (mytools.netatmoTags(object_name) === true) {
					await this.getValuesFromNetatmo(API_Request,obj[object_name],object_name,myobj_selected,mytools.getPrefixPath(Netatmo_Path + '.') + object_name,norefresh);
				} else {
					await this.getValuesFromNetatmo(API_Request,obj[object_name],object_name,myobj_selected,Netatmo_Path,norefresh);
				}
			} else {
				if (mytools.netatmoTagsDetail(myobj_selected) === true && API_Request === APIRequest_homesdata) {
					await this.createNetatmoStructure(mytools.getPrefixPath(Netatmo_Path + '.') + object_name, object_name, obj[object_name], true, '', false, true, '', false, false);
				}
			}
		}
	}

	// insert Schedule requests
	async searchSchedule() {
		const that = this;
		const searchSchedules = 'homes\\.\\d+\\.schedules\\.\\d+\\.id';
		let schedule_id   = null;
		let schedule_name = null;

		//this.log.debug('Delete Channel: ' + that.globalDevice + ' - ' + Channel_switchhomeschedule);
		await that.deleteChannel(that.globalAPIChannel, Channel_switchhomeschedule);
		this.globalScheduleObjects   = {};
		this.globalScheduleList      = {};
		this.globalScheduleListArray = [];
		//schedules
		this.getStates(that.namespace + '.homes.*.schedules.*',async function(error, states) {
			await that.createMyChannel(that.globalAPIChannel + '.' + Channel_switchhomeschedule, 'API switchhomeschedule');
			for(const id in states) {
				//that.log.debug('Found Schedule: ' + id);
				if (id.search(searchSchedules) >= 0) {
					schedule_id = await that.getStateAsync(id);
					//that.log.debug('Found Schedule_ID: ' + schedule_id.val);
					if (schedule_id) {
						schedule_name = await that.getStateAsync(id.substring(0,id.length - 3) + '.name');
						if (schedule_name) {
							//that.log.debug('Found Schedule_NAME: ' + schedule_name.val);
							that.globalScheduleObjects[that.globalAPIChannel + '.' + Channel_switchhomeschedule + '.' + APIRequest_switchhomeschedule + '_' + schedule_name.val.replace(/[\s[\]*,;'"&`<>\\?.^$()/]/g, '_')] = schedule_id.val;
							await that.createNetatmoStructure(that.globalAPIChannel + '.' + Channel_switchhomeschedule + '.' + APIRequest_switchhomeschedule + '_' + schedule_name.val.replace(/[\s[\]*,;'"&`<>\\?.^$()/]/g, '_'), schedule_name.val, false, true, 'button', true, true, '', false, false);
							await that.subscribeStates(that.globalAPIChannel + '.' + Channel_switchhomeschedule + '.' + APIRequest_switchhomeschedule + '_' + schedule_name.val.replace(/[\s[\]*,;'"&`<>\\?.^$()/]/g, '_'));

							// create sortet object
							const mySchedule = mytools.getSortedArray(schedule_name.val, schedule_id.val, that.globalScheduleList, that.globalScheduleListArray);
							that.globalScheduleList      = mySchedule.list;
							that.globalScheduleListArray = mySchedule.listArray;
							await that.createNetatmoStructure(that.globalAPIChannel + '.' + Channel_synchomeschedule + '.' + Channel_parameters + '.' + State_schedule_id, 'Id of the schedule', '', true, 'text', true, true, that.globalScheduleList, '', true, false);
						}
					}
				}
			}
		});
	}

	//get room name from ID
	async getNameofRoom(statevalue) {
		const that = this;
		const nummer = /^[0-9]*$/i;
		if(!nummer.test(statevalue)) return statevalue;

		let room_name = null;
		const searchRooms     = 'homes\\.\\d+\\.rooms\\.\\d+\\.id';
		let room_id = null;

		return new Promise(
			function(resolve,reject) {
				that.getStates(that.namespace + '.homes.*.rooms.*',async function(error, states) {
					for(const id in states) {
						if (id.search(searchRooms) >= 0) {
							room_id = await that.getStateAsync(id);
							if (room_id && room_id.val == statevalue) {
								const myTargetName = id.substring(0,id.length - 3);
								room_name = await that.getStateAsync(myTargetName + '.name');
								break;
							}
						}
					}
					if (room_name) {
						resolve(room_name.val);
					} else {
						reject(statevalue);
					}
				});
			}
		);
	}

	//get room name from ID
	async getNameofDevice(statevalue) {
		const that = this;
		const macadress = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i;
		if(!macadress.test(statevalue)) return statevalue;

		let device_name = null;
		const searchModules   = 'homes\\.\\d+\\.modules\\.\\d+\\.id';
		let device_id = null;

		return new Promise(
			function(resolve,reject) {
				that.getStates(that.namespace + '.homes.*.modules.*',async function(error, states) {
					for(const id in states) {
						if (id.search(searchModules) >= 0) {
							device_id = await that.getStateAsync(id);
							if (device_id && device_id.val == statevalue) {
								const myTargetName = id.substring(0,id.length - 3);
								device_name = await that.getStateAsync(myTargetName + '.name');
								break;
							}
						}
					}
					if (device_name) {
						resolve(device_name.val);
					} else {
						reject(statevalue);
					}
				});
			}
		);
	}

	//Search rooms
	async searchAllRooms(statevalue, ObjStatus,norefresh) {
		const searchRooms     = 'homes\\.\\d+\\.rooms\\.\\d+\\.id';
		let room_id = null;
		const that = this;

		that.getStates(that.namespace + '.homes.*.rooms.*',async function(error, states) {
			for(const id in states) {
				if (id.search(searchRooms) >= 0) {
					room_id = await that.getStateAsync(id);
					if (room_id && room_id.val == statevalue) {
						//that.log.debug('Found room: ' + room_id.val + ' = ' + statevalue);
						const myTargetName = id.substring(0,id.length - 3);
						await that.createMyChannel(myTargetName + '.' + Channel_status, 'Device status');

						const roomName = await that.getStateAsync(myTargetName  + '.name');
						//that.log.debug('Room-ID: ' + room_id.val + ' / ' + roomName.val);

						// create sortet object
						const myRooms = mytools.getSortedArray(roomName.val, room_id.val, that.globalRoomId, that.globalRoomIdArray);
						that.globalRoomId      = myRooms.list;
						that.globalRoomIdArray = myRooms.listArray;
						await that.createNetatmoStructure(that.globalAPIChannel + '.' + Channel_getroommeasure + '.' + Channel_parameters + '.' + State_room_id, 'Id of room', '', true, 'text', true, true, that.globalRoomId, false, true);

						for(const objstat_name in ObjStatus) {
							if(!(ObjStatus[objstat_name] instanceof Object) && objstat_name != 'id') {
								await that.createNetatmoStructure(myTargetName + '.' + Channel_status + '.' + objstat_name, objstat_name, ObjStatus[objstat_name], true, '', false, true, '', false, false);
								switch(objstat_name) {
									case State_therm_setpoint_temperature:
										await that.createMyChannel(myTargetName + '.' + Channel_settings, 'Change settings');
										await that.createNetatmoStructure(myTargetName + '.' + Channel_settings + '.' + Trigger_SetTemp, 'set temperature manually', ObjStatus[objstat_name], true, 'level.temperature', true, true, '', norefresh, true);
										await that.createNetatmoStructure(myTargetName + '.' + Channel_settings + '.' + State_TempChanged, 'temperature manually changed', false, true, 'indicator', false, true, '', norefresh, false);
										await that.createNetatmoStructure(myTargetName + '.' + Channel_settings + '.' + State_TempChanged_Mode, 'The mode you are applying to this room (def=manual)', '', true, 'text', true, true, List_mode, norefresh, false);
										await that.createNetatmoStructure(myTargetName + '.' + Channel_settings + '.' + State_TempChanged_Endtime, 'end time of the schedule mode set (seconds)', '', true, 'value.time', true, true, '', norefresh, false);
										await that.subscribeStates(myTargetName + '.' + Channel_settings + '.' + Trigger_SetTemp);
										break;
								}
							}
						}
						break;
					}
				}
			}
		});
	}

	//Search modules
	async searchAllModules(statevalue, ObjStatus) {
		const searchModules   = 'homes\\.\\d+\\.modules\\.\\d+\\.id';
		let module_id = null;
		const that = this;

		that.getStates(that.namespace + '.homes.*.modules.*',async function(error, states) {
			for(const id in states) {
				if (id.search(searchModules) >= 0) {
					module_id = await that.getStateAsync(id);
					if (module_id && module_id.val == statevalue) {
						//that.log.debug('Found module: ' + module_id.val + ' = ' + statevalue);
						const myTargetName = id.substring(0,id.length - 3);
						await that.createMyChannel(myTargetName + '.' + Channel_modulestatus, 'Module status');

						const type = await that.getStateAsync(myTargetName  + '.' + Channel_modulestatus + '.' + 'type');
						if (type && type.val == 'NATherm1') {
							const deviceName = await that.getStateAsync(myTargetName  + '.name');
							const type = await that.getStateAsync(myTargetName  + '.' + Channel_modulestatus + '.' + 'bridge');
							//that.log.debug('Device-ID: ' + type.val + ' / ' + deviceName.val + ' / ' + id);

							// create sortet object
							const myDevices = mytools.getSortedArray(deviceName.val, type.val, that.globalDeviceId, that.globalDeviceIdArray);
							that.globalDeviceId      = myDevices.list;
							that.globalDeviceIdArray = myDevices.listArray;
							await that.createNetatmoStructure(that.globalAPIChannel + '.' + Channel_getmeasure + '.' + Channel_parameters + '.' + State_device_id, 'Mac adress of the device', '', true, 'text', true, true, that.globalDeviceId, false, true);
						}
						for(const objstat_name in ObjStatus) {
							if(!(ObjStatus[objstat_name] instanceof Object) && objstat_name != 'id') {
								await that.createNetatmoStructure(myTargetName + '.' + Channel_modulestatus + '.' + objstat_name, objstat_name, ObjStatus[objstat_name], true, '', false, true, '', false, false);
							}
						}
						break;
					}
				}
			}
		});
	}

	//calculate date in seconds -> milliseconds including gap to time_exec
	async getDateFrom1970(seconds) {
		const adapter_time_exec = await this.getStateAsync(this.namespace + '.' + State_Time_Exec);
		return (adapter_time_exec.val + seconds) * 3600;
	}

	// Create Device
	async createMyDevice(path, name) {
		await this.setObjectNotExists(path, {
			type: 'device',
			common: {
				name: name,
			},
			native: {},
		});
	}

	// Create Channel
	async createMyChannel(path, name) {
		await this.setObjectNotExists(path, {
			type: 'channel',
			common: {
				name: name,
			},
			native: {},
		});
	}

	//dynamic creation of datapoints
	async createNetatmoStructure (id,object_name,value, ack, role, write, read, list, norefresh, forced) {
		const macadress = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i;
		const rooms = /homes\.\d+\.rooms\.\d+\.name/i;

		if (!role) {
			if (object_name === 'battery_level') {
				role = 'value.battery';
				if (!value.isNaN) {
					value = value / 1000;
				}
			} else if (object_name === 'm_offset') {
				role = 'level.timer';
			} else if (rooms.test(id)) {
				role = 'value.roomname';
				forced = true;
			} else if (object_name.indexOf('anticipating') >= 0) {
				role = 'indicator.anticipating';
				forced = true;
			} else if (object_name.indexOf('reachable') >= 0) {
				role = 'indicator.reachable';
				forced = true;
			} else if (object_name.indexOf('open_window') >= 0) {
				role = 'indicator.window';
				forced = true;
			} else if (object_name.indexOf('therm_setpoint_temperature') >= 0) {
				role = 'valve.temperature';
				forced = true;
			} else if (object_name.indexOf('temperature') >= 0 || object_name.indexOf('temp') >= 0) {
				role = 'value.temperature';
			} else if (id.indexOf('coordinates.0') >= 0) {
				role = 'value.gps.elevation';
			} else if (id.indexOf('coordinates.1') >= 0) {
				role = 'value.gps.latitude';
			} else if (object_name.indexOf('timezone') >= 0) {
				role = 'state';
			} else if (object_name.indexOf('_date') >= 0 || object_name.indexOf('time') >= 0) {
				role = 'value.time';
				if (!value.isNaN) {
					value = value * 1000;
				}
			} else if (macadress.test(value)) {
				role = 'info.mac';
			} else if (typeof value === 'boolean') {
				role = 'indicator';
			} else if (typeof value === 'string') {
				role = 'text';
			} else {
				role = 'state';
			}
		}
		if (!list) {
			list = '';
		}

		if (forced) {
			await this.setObjectAsync(id, {
				type: 'state',
				common: {
					name: object_name,
					role: role,
					type: typeof value,
					read: read,
					write: write,
					states: list
				},
				native: {},
			});
			if (!norefresh) {
				await this.setState(id, value, ack);
			}
		} else {
			await this.setObjectNotExistsAsync(id, {
				type: 'state',
				common: {
					name: object_name,
					role: role,
					type: typeof value,
					read: read,
					write: write,
					states: list
				},
				native: {},
			});
			if (!norefresh) {
				await this.setState(id, value, ack);
			}
		}
	}

	//set trigger after comparing
	async compareValues(id, state, idtoset) {
		const adapterstates = await this.getStateAsync(id);
		if(adapterstates.val != state.val ) {
			this.setState(idtoset, true, true);
		} else {
			this.setState(idtoset, false, true);
		}
	}

	//analyse datapoint for payload
	async getValuefromDatapoint(payload, id) {
		const datapoint   = await this.getStateAsync(id);
		if (datapoint && datapoint.val != '') {
			return payload + datapoint.val;
		}
		return '';
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			Object.keys(this.adapterIntervals).forEach(interval => clearInterval(this.adapterIntervals[interval]));
			//this.FetchAbortController.abort();
			this.log.debug(mytools.tl('cleaned everything up...', this.systemLang));
			this.sendRequestNotification(null, WarningNotification, mytools.tl('Status', this.systemLang) + '\n' + mytools.tl('Adapter stopped', this.systemLang), mytools.tl('Somebody stopped', this.systemLang) + ' ' + this.namespace);
			callback();
		} catch (e) {
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  * @param {string} id
	//  * @param {ioBroker.Object | null | undefined} obj
	//  */
	// onObjectChange(id, obj) {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	//React on al subsribed fields
	/**
	* Is called if a subscribed state changes
	* @param {string} id
	* @param {ioBroker.State | null | undefined} state
	*/
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
			if (state.ack === false) {
				if (id.lastIndexOf('.') >= 0) {
					const actState = id.substring(id.lastIndexOf('.') + 1);
					const actPath = id.substring(0,id.lastIndexOf('.'));
					const actParent = actPath.substring(0,actPath.lastIndexOf('.'));
					switch(actState) {
						// Get Structure of your home (NAPlug)
						case APIRequest_homesdata:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('API Request homesdata:', this.systemLang) + ' ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.sendHomesdataAPIRequest(APIRequest_homesdata,false);
							break;

						// get actual homestatus
						case APIRequest_homestatus:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('API Request homestatus:', this.systemLang) + ' ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.sendHomestatusAPIRequest(APIRequest_homestatus, false);
							break;

						// Get rooms measure statistic
						case APIRequest_getroommeasure:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('API Request getroommeasure:', this.systemLang) + ' ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.sendRoomsmeasureAPIRequest(APIRequest_getroommeasure,false);
							break;

						// Get measure statistic
						case APIRequest_getmeasure:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('API Request getmeasure:', this.systemLang) + ' ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.sendMeasureAPIRequest(APIRequest_getmeasure,false);
							break;

						// Set Therm Mode for Netatmo Energy
						case Trigger_SetTemp:
							if (!isNaN(state.val)) {
								if (this.config.applyimmediately) {
									this.log.debug('SetTemp: ' + mytools.tl('Call API directly', this.systemLang));
									this.applySingleActualTemp(state,actPath,actParent,APIRequest_setroomthermpoint,APIRequest_setroomthermpoint_manual);
								} else {
									this.log.debug('SetTemp: ' + mytools.tl('Set TempChanged manually', this.systemLang));
									this.compareValues(actParent + '.' + Channel_status + '.' + State_therm_setpoint_temperature, state, actPath + '.' + State_TempChanged);
								}
							} else {
								this.log.debug('SetTemp: ' + mytools.tl('No Number', this.systemLang) + ' ' + state.val);
							}
							break;

						// Apply all changes to Netatmo Cloud
						case Trigger_applychanges:
							if (state.val === false) {
								break;
							}
							this.log.debug('API Request setthermpoint - manual: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.applySingleAPIRequest(APIRequest_setroomthermpoint, APIRequest_setroomthermpoint_manual, mytools.tl('changed manually', this.systemLang) );
							break;

						// Set thermmode for Netatmo Energy
						case APIRequest_setthermmode + '_' + APIRequest_setthermmode_schedule:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('API Request setthermmode', this.systemLang) + ' - schedule: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.applySingleAPIRequest(APIRequest_setthermmode, APIRequest_setthermmode_schedule, mytools.tl('schedule', this.systemLang));
							break;

						// Set thermmode for Netatmo Energy
						case APIRequest_setthermmode + '_' + APIRequest_setthermmode_hg:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('API Request setthermmode', this.systemLang) + ' - hg: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.applySingleAPIRequest(APIRequest_setthermmode, APIRequest_setthermmode_hg, mytools.tl('frost guard', this.systemLang));
							break;

						// Set thermmode for Netatmo Energy
						case APIRequest_setthermmode + '_' + APIRequest_setthermmode_away:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('API Request setthermmode', this.systemLang) + ' - away: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.applySingleAPIRequest(APIRequest_setthermmode, APIRequest_setthermmode_away, mytools.tl('away from home', this.systemLang));
							break;

						// Set synchomeschedule for Netatmo Energy
						case APIRequest_synchomeschedule:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('API Request synchomeschedule:', this.systemLang) + ' ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.sendSingleActualTemp(APIRequest_setthermmode, false);
							break;

						//Refresh whole structure
						case Trigger_refresh_all:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('Refresh whole structure:', this.systemLang) + ' ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.RefreshWholeStructure(false);
							break;
					}

					if (actState.search(APIRequest_switchhomeschedule) == 0) {
						if (state.val === true) {
							this.setState(id, false, true);
							this.log.debug(mytools.tl('API Request swithhomeschedule:', this.systemLang) + ' ' + this.globalScheduleObjects[id]);
							this.applySingleAPIRequest(APIRequest_switchhomeschedule, this.globalScheduleObjects[id], '\'' + (id.substring(id.lastIndexOf('.' + APIRequest_switchhomeschedule) + ('.' + APIRequest_switchhomeschedule).length + 1)).replace('_', ' ') + '\'');
						}
					}
				}
			}
		} else {
			// The state was deleted
			//this.log.info(`state ${id} deleted`);

			if (id.lastIndexOf('.') >= 0) {
				const actStateDel = id.substring(id.lastIndexOf('.') + 1);
				switch(actStateDel) {
					case APIRequest_homesdata:
					case APIRequest_homestatus:
					case APIRequest_getroommeasure:
					case APIRequest_getmeasure:
					case Trigger_SetTemp:
					case Trigger_refresh_all:
					case Trigger_applychanges:
					case APIRequest_setthermmode + '_' + APIRequest_setthermmode_schedule:
					case APIRequest_setthermmode + '_' + APIRequest_setthermmode_hg:
					case APIRequest_setthermmode + '_' + APIRequest_setthermmode_away:
					case APIRequest_synchomeschedule:
						this.createEnergyAPP();
				}
			}
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === 'object' && obj.message) {
	// 		if (obj.command === 'send') {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info('send command');

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
	// 		}
	// 	}
	// }

}

// @ts-ignore parent is a valid property on module
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [adapter={}]
	 */
	module.exports = (adapter) => new NetatmoEnergy(adapter);
} else {
	// otherwise start the instance directly
	new NetatmoEnergy();
}
