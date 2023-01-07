'use strict';

// Load modules
const utils   = require('@iobroker/adapter-core');
const abort   = require('abort-controller');
const fs 	  = require('fs');
// @ts-ignore
const fetch   = require('fetch');
const mytools = require('./lib/mytools');
const glob    = require('./lib/globals');

// Main Class
class NetatmoEnergy extends utils.Adapter {

	//Class Constructor
	constructor(options) {
		super(Object.assign(options || {}, {
			name: 'netatmo-energy',
		}));

		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		//this.on('objectChange', this.onObjectChange.bind(this));
		this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));

		//Objects
		this.globalDevice				= null;
		this.globalAPIChannel			= '';
		this.globalAPIChannelTrigger	= null;
		this.globalAPIStatus			= null;
		this.globalNetatmo_AccessToken  = null;
		this.globalRefreshToken			= null;
		this.globalNetatmo_ExpiresIn	= 0;
		this.globalScheduleObjects		= {};
		this.globalScheduleList			= {};
		this.globalScheduleListArray	= [];
		this.globalRoomId				= {};
		this.globalRoomIdArray			= [];
		this.globalDeviceId				= {};
		this.globalDeviceIdArray		= [];

		//Language
		this.systemlang					= 'de';

		//Notifications
		this.telegram					= {};
		this.whatsapp					= {};
		this.pushover					= {};
		this.email						= {};

		//Adapter status
		this.FetchAbortController		= new abort.AbortController();
		this.adapterIntervals			= [];
		this.mySubscribedStates			= [];
		this.AdapterStarted				= false;

		//Authentication
		this.scope 						= '';
		this.storedOAuthData			= {};
		this.storedOAuthStates			= {};
		this.dataDir					= '';
	}

	// Decrypt password
	_decrypt(key, value) {
		let result = '';
		for (let i = 0; i < value.length; ++i) {
			result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
		}
		return result;
	}

	// DatapointString
	/**
	 * @param {any[]} parts
	 */
	_getDP(parts) {
		let address = '';
		parts.forEach(element => {
			(address == '') ? address = element : address = address + glob.dot + element;
		});
		return address;
	}

	//Get stored token from adapter data directory
	_getStoredToken() {
		this.dataDir = utils.getAbsoluteInstanceDataDir(this);
		try {
			if (!fs.existsSync(this.dataDir)) {
				fs.mkdirSync(this.dataDir);
			}
			if (fs.existsSync(`${this.dataDir}/tokens.json`)) {
				const tokens = JSON.parse(fs.readFileSync(`${this.dataDir}/tokens.json`, 'utf8'));
				if (tokens.client_id !== this.config.ClientId) {
					this.log.info(mytools.tl('Stored tokens belong to the different client ID', this.systemLang) + tokens.client_id + mytools.tl('and not to the configured ID ... deleting', this.systemLang));
					fs.unlinkSync(`${this.dataDir}/tokens.json`);
				} else {
					if (!tokens.access_token || !tokens.refresh_token) {
						this.globalNetatmo_AccessToken = null;
						this.globalRefreshToken        = null;
						this.scope                     = '';
						this.log.error(mytools.tl('No tokens stored - Please use authentication in adapter config!', this.systemLang));
					} else {
						this.globalNetatmo_AccessToken = tokens.access_token;
						this.globalRefreshToken        = tokens.refresh_token;
						this.scope                     = tokens.scope;
						this.log.info(mytools.tl('Using stored tokens to initialize ... ', this.systemLang) + JSON.stringify(tokens));
						if (tokens.scope !== this.scope) {
							this.log.info(mytools.tl('Stored tokens have different scope', this.systemLang) + tokens.scope + mytools.tl('and not the configured scope', this.systemLang) + this.scope + mytools.tl('... If you miss data please authenticate again!', this.systemLang));
						}
					}
				}
			} else {
				this.globalNetatmo_AccessToken = null;
				this.globalRefreshToken        = null;
				this.scope                     = '';
				this.log.error(mytools.tl('No tokens stored - Please use authentication in adapter config!', this.systemLang));
			}
		} catch (err) {
			// @ts-ignore
			this.log.error(mytools.tl('Error reading stored tokens: ', this.systemLang) + err.message);
		}
	}

	// Is called when databases are connected and adapter received configuration
	async onReady() {
		//Check adapter configuration
		if (((this.config.NewOAuthMethode != true) && (!this.config.HomeId || !this.config.ClientId || !this.config.ClientSecretID || !this.config.User || !this.config.Password)) || ((this.config.NewOAuthMethode == true) && (!this.config.HomeId || !this.config.ClientId || !this.config.ClientSecretID))) {
			this.log.error('*** Adapter deactivated, missing adaper configuration !!! ***');
			this.setForeignState('system.adapter.' + this.namespace + '.alive', false);
			return;
		}
		//Passwort decryption
		// @ts-ignore
		this.getForeignObject('system.config', (err, obj) => {
			// @ts-ignore
			this.systemLang = obj.common.language;
			// @ts-ignore
			if (!this.supportsFeature() || !this.supportsFeature('ADAPTER_AUTO_DECRYPT_NATIVE')) {
				if (obj && obj.native && obj.native.secret) {
					this.config.Password = this._decrypt(obj.native.secret, this.config.Password);
				}
				else {
					this.config.Password = this._decrypt('Zgfr56gFe87jJOM', this.config.Password);
				}
			}
		});
		this.initAdapter(this.systemLang);
		this.startAdapter();
	}

	// Start initialization adapter
	initAdapter(systemLang) {
		//Get stored token
		this._getStoredToken();

		// define global constants
		this.globalDevice				= this._getDP([this.namespace, glob.Device_APIRequests]);
		this.globalAPIChannel			= this._getDP([this.namespace, glob.Device_APIRequests, glob.Channel_APIRequests]);
		this.globalAPIChannelTrigger	= this._getDP([this.namespace, glob.Device_APIRequests, glob.Channel_trigger]);
		this.globalAPIChannelStatus		= this._getDP([this.namespace, glob.Device_APIRequests, glob.Channel_Status_API_running]);

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
		// Check if it is neccessary
		if (this.AdapterStarted == true) return;

		// Set polling intervall
		const refreshtime = this.config.refreshstates;
		const that = this;

		if ((this.config.NewOAuthMethode == true) && (this.globalNetatmo_AccessToken == null || this.globalRefreshToken == null)) {
			return;
		}

		const updateAPIStatus = async function () {
			that.log.debug(mytools.tl('API Request homestatus sent to API each', that.systemLang) + glob.blank + refreshtime + mytools.tl('sec', that.systemLang));
			await that.RefreshWholeStructure(true);
		};
		if (refreshtime && refreshtime > 0) {
			that.log.info(mytools.tl('Refresh homestatus interval', that.systemLang) + glob.blank + refreshtime * 1000);
			// Timer
			that.adapterIntervals.push(setInterval(updateAPIStatus, refreshtime * 1000));
		}
		//Start initial requests for adapter
		this.AdapterStarted = true;
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
		await this.createMyChannel(this._getDP([this.globalAPIChannel, glob.Channel_homesdata]), 'API homesdata');
		await this.createMyChannel(this._getDP([this.globalAPIChannel, glob.Channel_homesdata, glob.Channel_parameters]), 'parameters');
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_homesdata, glob.APIRequest_homesdata]), 'homesdata', false, true, 'button', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_homesdata, glob.Channel_parameters, glob.State_gateway_types]), 'gateway types', '', true, 'text', true, true, glob.List_gateway_type, false, false);
		await this.subscribeStates(this._getDP([this.globalAPIChannel, glob.Channel_homesdata, glob.APIRequest_homesdata]));

		// Channel setthomestatus
		await this.createMyChannel(this._getDP([this.globalAPIChannel, glob.Channel_homestatus]), 'API homesstatus');
		await this.createMyChannel(this._getDP([this.globalAPIChannel, glob.Channel_homestatus, glob.Channel_parameters]), 'parameters');
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_homestatus, glob.Channel_parameters, glob.State_device_types]), 'device types', '', true, 'text', true, true, glob.List_device_types, false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_homestatus, glob.APIRequest_homestatus]), 'homesstatus', false, true, 'button', true, true, '', false, false);
		await this.subscribeStates(this._getDP([this.globalAPIChannel, glob.Channel_homestatus, glob.APIRequest_homestatus]));

		// Channel setthermmode
		await this.createMyChannel(this._getDP([this.globalAPIChannel, glob.Channel_setthermmode]), 'API setthermmode');
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_setthermmode, glob.APIRequest_setthermmode + '_' + glob.APIRequest_setthermmode_schedule]), 'setthermmode_schedule', false, true, 'button', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_setthermmode, glob.APIRequest_setthermmode + '_' + glob.APIRequest_setthermmode_hg]), 'setthermmode_hg', false, true, 'button', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_setthermmode, glob.APIRequest_setthermmode + '_' + glob.APIRequest_setthermmode_away]), 'setthermmode_away', false, true, 'button', true, true, '', false, false);
		await this.subscribeStates(this._getDP([this.globalAPIChannel, glob.Channel_setthermmode, glob.APIRequest_setthermmode + '_' + glob.APIRequest_setthermmode_schedule]));
		await this.subscribeStates(this._getDP([this.globalAPIChannel, glob.Channel_setthermmode, glob.APIRequest_setthermmode + '_' + glob.APIRequest_setthermmode_hg]));
		await this.subscribeStates(this._getDP([this.globalAPIChannel, glob.Channel_setthermmode, glob.APIRequest_setthermmode + '_' + glob.APIRequest_setthermmode_away]));

		// Channel synchomeschedule
		await this.createMyChannel(this._getDP([this.globalAPIChannel, glob.Channel_synchomeschedule]), 'API synchomeschedule');
		await this.createMyChannel(this._getDP([this.globalAPIChannel, glob.Channel_synchomeschedule, glob.Channel_parameters]), 'parameters');
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_synchomeschedule, glob.APIRequest_synchomeschedule]), 'synchomeschedule', false, true, 'button', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_synchomeschedule, glob.Channel_parameters, glob.State_schedule_id]), 'Id of the schedule', '', true, 'text', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_synchomeschedule, glob.Channel_parameters, glob.State_zones]), 'Array of data used to define time periods to build a schedule. More info on the Thermostat page. id of zone | type of zone | Name of zone | Temperature', '', true, 'list', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_synchomeschedule, glob.Channel_parameters, glob.State_timetable]), 'Array describing the timetable. More info on the Thermostat page. ID of the zone - offset in minutes since Monday 00:00:01', '', true, 'list', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_synchomeschedule, glob.Channel_parameters, glob.State_hg_temp]), 'Frost guard temperature value', 7, true, 'number', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_synchomeschedule, glob.Channel_parameters, glob.State_away_temp]), 'Away temperature value', 12, true, 'number', true, true, '', false, false);
		await this.subscribeStates(this._getDP([this.globalAPIChannel, glob.Channel_synchomeschedule, glob.APIRequest_synchomeschedule]));

		// Channel getroommeasure
		await this.createMyChannel(this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure]), 'API getroommeasure');
		await this.createMyChannel(this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters]), 'parameters');
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.APIRequest_getroommeasure]), 'getroommeasure', false, true, 'button', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.State_response]), 'Request response', '', true, 'text', false, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters, glob.State_room_id]), 'Id of room', '', true, 'text', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters, glob.State_scale]), 'Timelapse between two measurements', '', true, 'text', true, true, glob.List_scale, false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters, glob.State_type]), 'Type of data to be returned. Setpoint temperature is only available for scales from 30 to 3hours and min/max temp and dates for scales from 1day to 1month.', '', true, 'text', true, true, glob.List_type_rm, false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters, glob.State_date_begin]), 'Timestamp of the first measure to retrieve. Default is null', '', true, 'number', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters, glob.State_date_end]), 'Timestamp of the last measure to retrieve (default and max are 1024). Default is null', '', true, 'number', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters, glob.State_limit]), 'Maximum number of measurements (default and max Are 1024)', '', true, 'number', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters, glob.State_optimize]), 'Determines the format of the answer. Default is true. For mobile apps we recommend True and False if bandwidth isn\'t an issue as it is easier to parse', false, true, 'indicator', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters, glob.State_real_time]), 'real_time', false, true, 'indicator', true, true, '', false, false);
		await this.subscribeStates(this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.APIRequest_getroommeasure]));

		// Channel getmeasure
		await this.createMyChannel(this._getDP([this.globalAPIChannel, glob.Channel_getmeasure]), 'API getmeasure');
		await this.createMyChannel(this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters]), 'parameters');
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.APIRequest_getmeasure]), 'getmeasure', false, true, 'button', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.State_response]), 'Request response', '', true, 'text', false, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters, glob.State_device_id]), 'Mac adress of the device', '', true, 'text', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters, glob.State_scale]), 'Timelapse between two measurements', '', true, 'text', true, true, glob.List_scale, false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters, glob.State_type]), 'Type of data to be returned. Setpoint temperature is only available for scales from 30 to 3hours and min/max temp and dates for scales from 1day to 1month.', '', true, 'text', true, true, glob.List_type_mm, false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters, glob.State_date_begin]), 'Timestamp of the first measure to retrieve. Default is null', '', true, 'number', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters, glob.State_date_end]), 'Timestamp of the last measure to retrieve (default and max are 1024). Default is null', '', true, 'number', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters, glob.State_limit]), 'Maximum number of measurements (default and max Are 1024)', '', true, 'number', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters, glob.State_optimize]), 'Determines the format of the answer. Default is true. For mobile apps we recommend True and False if bandwidth isn\'t an issue as it is easier to parse', false, true, 'indicator', true, true, '', false, false);
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters, glob.State_real_time]), 'real_time', false, true, 'indicator', true, true, '', false, false);
		await this.subscribeStates(this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.APIRequest_getmeasure]));

		// Channel trigger
		await this.createMyChannel(this.globalAPIChannelTrigger, 'API setroomthermpoint');
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannelTrigger, glob.Trigger_applychanges]), 'trigger to send changes to Netatmo Cloud', false, true, 'button', true, true, '', false, false);
		await this.subscribeStates(this._getDP([this.globalAPIChannelTrigger, glob.Trigger_applychanges]));
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannelTrigger, glob.Trigger_refresh_all]), 'trigger to refresh homestructure from Netatmo Cloud', false, true, 'button', true, true, '', false, false);
		await this.subscribeStates(this._getDP([this.globalAPIChannelTrigger, glob.Trigger_refresh_all]));
		await this.createMyChannel(this._getDP([this.globalAPIChannelStatus]), 'API Request status');
		await this.createNetatmoStructure(this._getDP([this.globalAPIChannelStatus, glob.State_Status_API_running]), 'API running status ', false, true, 'indicator', false, true, '', false, true);
	}

	//Send notification after request
	async sendRequestNotification(NetatmoRequest, NotificationType, addText, longText) {
		switch(NetatmoRequest) {
			//set requests
			case glob.APIRequest_setroomthermpoint:
				this.sendNotification(this, NotificationType, NetatmoRequest, mytools.tl('Target temperature changed', this.systemLang) + ((this.config.NoticeType == glob.NoticeTypeLong && longText != '') ? '\n' + longText : ''));
				break;
			case glob.APIRequest_setthermmode:
				this.sendNotification(this, NotificationType, NetatmoRequest, mytools.tl('Mode for your heating system was set to', this.systemLang) + glob.blank + addText + ((this.config.NoticeType == glob.NoticeTypeLong && longText != '') ? '\n' + longText : ''));
				break;
			case glob.APIRequest_switchhomeschedule:
				this.sendNotification(this, NotificationType, NetatmoRequest, mytools.tl('Changed schedule for your heating system to', this.systemLang) + glob.blank +  addText + ((this.config.NoticeType == glob.NoticeTypeLong && longText != '') ? '\n' + longText : ''));
				break;
			case glob.APIRequest_synchomeschedule:
				this.sendNotification(this, NotificationType, NetatmoRequest, mytools.tl('Changed weekly schedule', this.systemLang) + glob.blank + addText + glob.blank + mytools.tl('for your heating system', this.systemLang) + ((this.config.NoticeType == glob.NoticeTypeLong && longText != '') ? '\n' + longText : ''));
				break;
			//get requests
			case glob.APIRequest_getroommeasure:
				await this.getNameofRoom(addText.substring(addText.lastIndexOf(glob.payload_room_id) + 9, addText.lastIndexOf(glob.payload_scale)));
				break;
			case glob.APIRequest_getmeasure:
				await this.getNameofDevice(addText.substring(addText.lastIndexOf(glob.payload_device_id) + 11, addText.lastIndexOf(glob.payload_scale)));
				break;
			default:
				this.sendNotification(this, NotificationType, NetatmoRequest, addText + ((this.config.NoticeType == glob.NoticeTypeLong && longText != '') ? '\n' + longText : ''));
				break;
		}
	}

	// send notifications
	sendNotification(adapter, errortype, subject, messageText) {
		if(!this.config.notificationEnabled) return;
		if (errortype != glob.SendNotification) {
			if (!((this.config.notifications.substring(0,1) != '0' && errortype == glob.InfoNotification) || (this.config.notifications.substring(1,2) != '0' && errortype == glob.WarningNotification) || (this.config.notifications.substring(2,3) != '0' && errortype == glob.ErrorNotification))) return;
		}
		switch(this.config.notificationsType) {
			//email
			case glob.NotificationEmail:
				if (this.email.instance !== '' && this.email.instance !== null && this.email.instance !== undefined) {
					adapter.sendTo(adapter.email.instance, 'send', { text: 'Netatmo Energy:\n' + messageText, to: adapter.email.emailReceiver, subject: subject, from: adapter.email.emailSender });
					return;
				}
				break;

			//pushover
			case glob.NotificationPushover:
				if (this.pushover.instance !== '' && this.pushover.instance !== null && this.pushover.instance !== undefined) {
					if (this.pushover.SilentNotice === 'true' || this.pushover.SilentNotice === true) {
						adapter.sendTo(adapter.pushover.instance, 'send', { message: 'Netatmo Energy:\n' + messageText, sound: '', priority: -1, title: subject, device: adapter.pushover.deviceID });
					} else {
						adapter.sendTo(adapter.pushover.instance, 'send', { message: 'Netatmo Energy:\n' + messageText, sound: '', title: subject, device: adapter.pushover.deviceID });
					}
				}
				break;

			//telegram
			case glob.NotificationTelegram:
				if (this.telegram.instance !== '' && this.telegram.instance !== null && this.telegram.instance !== undefined) {
					if (this.telegram.User && (this.telegram.User === 'allTelegramUsers' || this.telegram.User === '')) {
						adapter.sendTo(adapter.telegram.instance, 'send', { text: 'Netatmo Energy:\n' + subject + ' - ' + messageText, disable_notification: adapter.telegram.SilentNotice });
					} else {
						adapter.sendTo(adapter.telegram.instance, 'send', { user: adapter.telegram.User, text: 'Netatmo Energy:\n' + subject + ' - ' + messageText, disable_notification: adapter.telegram.SilentNotice });
					}
				}
				break;

			//whatsapp
			case glob.NotificationWhatsapp:
				if (this.whatsapp.instance !== '' && this.whatsapp.instance !== null && this.whatsapp.instance !== undefined) {
					adapter.sendTo(adapter.whatsapp.instance, 'send', { text: 'Netatmo Energy:\n' + subject + ' - ' + messageText });
				}
				break;
		}
	}

	//Authenticate refresh token
	async _authenticate_refresh_token(redirect_uri, code) {
		this.log.info(mytools.tl('Start Token-Refresh:', this.systemLang));
		await this.getToken(this.config.HomeId, this.config.ClientId, this.config.ClientSecretID, this.config.User, this.config.Password, redirect_uri, code, this.config.NewOAuthMethode)
			.then(tokenvalues => {
				this.globalNetatmo_AccessToken	= tokenvalues.access_token;
				this.globalNetatmo_ExpiresIn	= tokenvalues.expires_in + ((new Date()).getTime() / 1000) - 20;
				this.globalRefreshToken			= tokenvalues.refresh_token;
				this._saveToken();

				//this.adapterIntervals.push(setInterval(this._authenticate_refresh_token, this.storedOAuthData.redirect_uri, this.storedOAuthData.code, (tokenvalues.expires_in - 20) * 1000), this.globalRefreshToken);

				this.log.debug(mytools.tl('Token OK:', this.systemLang) + glob.blank + this.globalNetatmo_AccessToken);
				this.startAdapter();
			})
			.catch(async (error) => {
				this.globalNetatmo_AccessToken	= null;
				this.globalRefreshToken			= null;
				this.globalNetatmo_ExpiresIn	= 0;
				this._saveToken();
				this.log.error(mytools.tl('Did not get a tokencode:', this.systemLang) + ((error !== undefined && error !== null) ? (glob.blank + error.error + ': ' + error.error_description) : ''));
				await this.sendRequestNotification(null, glob.ErrorNotification, mytools.tl('API Token', this.systemLang) + '\n', mytools.tl('Did not get a tokencode:', this.systemLang) + ((error !== undefined && error !== null) ? (glob.blank + error.error + ': ' + error.error_description) : ''));
			});
	}

	// Send API inkluding tokenrequest
	async sendAPIRequest(API_URI, APIRequest, setpayload, norefresh, lastrequest) {
		const Netatmo_Path = this.namespace;

		// Refresh the token after it nearly expires
		const expirationTimeInSeconds = this.globalNetatmo_ExpiresIn;
		const nowInSeconds = (new Date()).getTime() / 1000;
		const shouldRefresh = nowInSeconds >= expirationTimeInSeconds;
		if ((this.config.NewOAuthMethode == true) && (this.globalNetatmo_AccessToken == null || this.globalRefreshToken == null)) {
			return;
		}

		this.log.debug(mytools.tl('Start refresh request', this.systemLang));
		await this.setState(this._getDP([this.globalAPIChannelStatus, glob.State_Status_API_running]), true, true);

		//Send Token request to API
		if (shouldRefresh || !this.globalNetatmo_AccessToken) {
			this.log.info(mytools.tl('Start Token-request:', this.systemLang) + glob.blank + APIRequest + glob.blank + setpayload);
			await this._authenticate_refresh_token(this.storedOAuthData.redirect_uri, this.storedOAuthData.code);
		}

		// only send API request if we get the token
		if (this.globalNetatmo_AccessToken != '' && this.globalNetatmo_AccessToken) {
			if (APIRequest == glob.APIRequest_homestatus) {
				this.globalRoomIdArray   = [];
				this.globalDeviceIdArray = [];
			}
			this.log.info('Token:' + this.globalNetatmo_AccessToken);
			this.log.info(mytools.tl('Start API-request:', this.systemLang) + glob.blank + APIRequest);
			await this.getAPIRequest(API_URI, APIRequest,setpayload, this.config.NewOAuthMethode)
				.then(async (response) => {
					switch(APIRequest) {
						case glob.APIRequest_getroommeasure:
							await this.setState(this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.State_response]), JSON.stringify(response), true);
							await this.sendRequestNotification(APIRequest, glob.InfoNotification, setpayload, JSON.stringify(response));
							break;
						case glob.APIRequest_getmeasure:
							await this.setState(this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.State_response]), JSON.stringify(response), true);
							await this.sendRequestNotification(APIRequest, glob.InfoNotification, setpayload, JSON.stringify(response));
							break;
						case glob.APIRequest_homesdata:
							await this.getValuesFromNetatmo(APIRequest,response,'','',Netatmo_Path, norefresh);
							break;
						case glob.APIRequest_homestatus:
							await this.getValuesFromNetatmo(APIRequest,response,'','',Netatmo_Path, norefresh);
							await this.searchSchedule();
							break;
						default:
							this.log.debug(mytools.tl('API changes applied', this.systemLang) + glob.blank + APIRequest);
					}
					this.log.debug(mytools.tl('API request finished', this.systemLang));
					if (lastrequest) {
						await this.setState(this._getDP([this.globalAPIChannelStatus, glob.State_Status_API_running]), false, true);
					}
				})
				.catch(error => {
					this.log.error(mytools.tl('API request not OK:', this.systemLang) + ((error !== undefined && error !== null) ? (glob.blank + error.error + ': ' + error.error_description) : ''));
					this.sendRequestNotification(null, glob.ErrorNotification, APIRequest + '\n', mytools.tl('API request not OK:', this.systemLang) + ((error !== undefined && error !== null) ? (glob.blank + error.error + ': ' + error.error_description) : ''));
				});
		} else {
			if (lastrequest) {
				await this.setState(this._getDP([this.globalAPIChannelStatus, glob.State_Status_API_running]), false, true);
			}
		}
	}

	//get token from Netatmo
	// @ts-ignore
	getToken(HomeId, ClientId, ClientSecretID, User, Password, redirect_uri, code, NewOAuth) {
		this.globalNetatmo_AccessToken = null;
		let payload = '';

		if (NewOAuth) {
			if (!this.globalRefreshToken) {
				payload = 'code=' + code + '&redirect_uri=' + redirect_uri + '&grant_type=authorization_code' + glob.payload_client_id + ClientId + glob.payload_client_secret + ClientSecretID + glob.payload_scope + this.scope;
			} else {
				payload  = 'grant_type=refresh_token' + glob.payload_refresh_token + this.globalRefreshToken + glob.payload_client_id + ClientId + glob.payload_client_secret + ClientSecretID;
			}
		} else {
			if (!this.globalRefreshToken) {
				payload = 'grant_type=password' + glob.payload_client_id + ClientId + glob.payload_client_secret + ClientSecretID + glob.payload_username + User + glob.payload_password + Password + glob.payload_scope + this.scope;
			} else {
				payload  = 'grant_type=refresh_token' + glob.payload_refresh_token + this.globalRefreshToken + glob.payload_client_id + ClientId + glob.payload_client_secret + ClientSecretID;
			}
		}
		return this._myFetch(glob.Netatmo_TokenRequest_URL, payload, NewOAuth);
	}

	//API request main routine
	getAPIRequest(API_URI, NetatmoRequest, extend_payload, NewOAuth) {
		let payload = extend_payload;
		if (API_URI != glob.Netatmo_TokenRequest_URL) {
			payload = 'access_token=' + this.globalNetatmo_AccessToken + glob.payload_home_id + this.config.HomeId + payload;
		}
		this.log.debug(mytools.tl('Request:', this.systemLang) + glob.blank + API_URI + NetatmoRequest + ((payload) ? '?' + payload : payload));
		return this._myFetch(API_URI + NetatmoRequest, payload, NewOAuth);
	}

	// send homesdata API Request
	async sendHomesdataAPIRequest (APIRequest, norefresh) {
		let gateway_types = await this.getValuefromDatapoint(glob.payload_gateway_types, this._getDP([this.globalAPIChannel, glob.Channel_homestatus, glob.Channel_parameters, glob.State_gateway_types]));
		if ((gateway_types.match(/&/g) || []).length != 1) {
			gateway_types = glob.payload_gateway_types + glob.APIRequest_homesdata_NAPlug;
		}
		await this.sendAPIRequest(glob.Netatmo_APIrequest_URL, APIRequest, gateway_types, norefresh, true);
	}

	// send homesdata API Request
	async sendHomestatusAPIRequest (APIRequest, norefresh) {
		const device_types = await this.getValuefromDatapoint(glob.payload_device_types, this._getDP([this.globalAPIChannel, glob.Channel_homestatus, glob.Channel_parameters, glob.State_device_types]));
		await this.sendAPIRequest(glob.Netatmo_APIrequest_URL, APIRequest, device_types, norefresh, true);
	}

	// send getroomsmeasure API Request
	async sendRoomsmeasureAPIRequest (APIRequest, norefresh) {
		await this.setState(this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.State_response]), '', true);

		let measure_payload = await this.getValuefromDatapoint(glob.payload_room_id,             this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters, glob.State_room_id]));
		measure_payload = measure_payload +	await this.getValuefromDatapoint(glob.payload_scale, this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters, glob.State_scale]));
		measure_payload = measure_payload +	await this.getValuefromDatapoint(glob.payload_type,  this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters, glob.State_type]));

		//let measure_payload = glob.payload_home_id + this.config.HomeId;
		if ((measure_payload.match(/&/g) || []).length == 3) {
			measure_payload = measure_payload +	await this.getValuefromDatapoint(glob.payload_date_begin, this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters, glob.State_date_begin]));
			measure_payload = measure_payload +	await this.getValuefromDatapoint(glob.payload_date_end,   this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters, glob.State_date_end]));
			measure_payload = measure_payload +	await this.getValuefromDatapoint(glob.payload_limit,      this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters, glob.State_limit]));
			measure_payload = measure_payload +	await this.getValuefromDatapoint(glob.payload_optimize,   this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters, glob.State_optimize]));
			measure_payload = measure_payload +	await this.getValuefromDatapoint(glob.payload_real_time,  this._getDP([this.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters, glob.State_real_time]));
			await this.sendAPIRequest(glob.Netatmo_APIrequest_URL, APIRequest, measure_payload, norefresh, true);
		} else {
			this.log.error(mytools.tl('API-getroosmeasure request is missing parameters', this.systemLang));
			await this.sendRequestNotification(null, glob.WarningNotification, APIRequest + '\n', mytools.tl('Request is missing parameters', this.systemLang) + mytools.tl('Actual payload:', this.systemLang) + glob.blank + measure_payload);
		}
	}

	// send getroomsmeasure API Request
	async sendMeasureAPIRequest (APIRequest, norefresh) {
		await this.setState(this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.State_response]), '', true);

		let measure_payload = await this.getValuefromDatapoint(glob.payload_device_id,           this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters, glob.State_device_id]));
		measure_payload = measure_payload +	await this.getValuefromDatapoint(glob.payload_scale, this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters, glob.State_scale]));
		measure_payload = measure_payload +	await this.getValuefromDatapoint(glob.payload_type,  this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters, glob.State_type]));

		if ((measure_payload.match(/&/g) || []).length == 3) {
			measure_payload = measure_payload +	await this.getValuefromDatapoint(glob.payload_date_begin, this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters, glob.State_date_begin]));
			measure_payload = measure_payload +	await this.getValuefromDatapoint(glob.payload_date_end,   this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters, glob.State_date_end]));
			measure_payload = measure_payload +	await this.getValuefromDatapoint(glob.payload_limit,      this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters, glob.State_limit]));
			measure_payload = measure_payload +	await this.getValuefromDatapoint(glob.payload_optimize,   this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters, glob.State_optimize]));
			measure_payload = measure_payload +	await this.getValuefromDatapoint(glob.payload_real_time,  this._getDP([this.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters, glob.State_real_time]));
			await this.sendAPIRequest(glob.Netatmo_APIrequest_URL, APIRequest, measure_payload, norefresh, true);
		} else {
			this.log.error(mytools.tl('API-getmeasure request is missing parameters', this.systemLang));
			await this.sendRequestNotification(null, glob.WarningNotification, APIRequest + '\n', mytools.tl('Request is missing parameters', this.systemLang) + mytools.tl('Actual payload:', this.systemLang) + glob.blank + measure_payload);
		}
	}

	//Send Changes to API
	async applyAPIRequest (NetatmoRequest,mode) {
		const that = this;
		return new Promise(
			function(resolve,reject) {

				const createAPIasync = async function(NetatmoRequest, mode, that) {
					await that.sendAPIRequest(glob.Netatmo_APIrequest_URL, NetatmoRequest, mode, false, true);
					resolve(true);
				};

				const createAPIAsync_syncrequest = async function(NetatmoRequest, that) {
					await that.sendSingleActualTemp(NetatmoRequest, false);
					resolve(true);
				};

				const createAPIapplyAsync_syncrequest = async function(NetatmoRequest, mode, that) {
					const searchstring = 'rooms\\.\\d+\\.' + glob.Channel_settings + '\\.' + glob.State_TempChanged + '';
					let changesmade = false;
					// @ts-ignore
					that.getStates(that.namespace + '.homes.*.rooms.*.' + glob.Channel_settings + '.' + glob.State_TempChanged,async function(error, states) {
						if (states && !error) {
							for(const id in states) {
								const adapterstates = await that.getStateAsync(id);
								if (id.search(searchstring) >= 0) {
									if (adapterstates && adapterstates.val === true) {
										await that.setState(id, false, true);
										const actId = mytools.splitID(id);
										const newTemp   = await that.getStateAsync(that._getDP([actId.path, glob.Trigger_SetTemp]));
										if (newTemp) {
											if (await that.applyActualTemp(newTemp,actId.parent,NetatmoRequest,mode, true)) {
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
						} else {
							reject(false);
						}
					});
				};

				switch (NetatmoRequest) {
					case glob.APIRequest_setroomthermpoint:
						createAPIapplyAsync_syncrequest(NetatmoRequest, mode, that);
						break;

					case glob.APIRequest_setthermmode:
						createAPIasync(NetatmoRequest, glob.payload_mode + mode, that);
						break;

					case glob.APIRequest_switchhomeschedule:
						that.log.info('API-Home:' + glob.payload_schedule_id + mode);
						createAPIasync(NetatmoRequest, glob.payload_schedule_id + mode, that);
						break;

					case glob.APIRequest_synchomeschedule:
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
				await that.sendRequestNotification(NetatmoRequest, glob.InfoNotification, info, '');
				if (that.config.getchangesimmediately) {
					await that.RefreshWholeStructure(false);
				}})
			.catch(() => {
				//that.log.debug('No refresh necessary because there where no changes! Changes=');
			});
	}

	//Refresh whole structure
	async RefreshWholeStructure (norefresh) {
		await this.sendAPIRequest(glob.Netatmo_APIrequest_URL, glob.APIRequest_homesdata, '', norefresh, false);
		await this.sendAPIRequest(glob.Netatmo_APIrequest_URL, glob.APIRequest_homestatus, '', norefresh, true);
	}

	//Apply request to API for temp
	// @ts-ignore
	async applyActualTemp(newData, actParent, NetatmoRequest, mode, temp) {
		const roomnumber        = await this.getStateAsync(actParent + '.id');
		const actTemp           = await this.getStateAsync(this._getDP([actParent, glob.Channel_status, glob.State_therm_setpoint_temperature]));
		const actTemp_mode      = await this.getStateAsync(this._getDP([actParent, glob.Channel_settings, glob.State_TempChanged_Mode]));
		const actTemp_endtime   = await this.getStateAsync(this._getDP([actParent, glob.Channel_settings, glob.State_TempChanged_Endtime]));
		let newTemp				= actTemp;

		if (temp === true) {
			newTemp = newData;
		}
		if (roomnumber && ((actTemp && newTemp && actTemp.val != newTemp.val) || (actTemp_mode && actTemp_mode.val != ''))) {
			let extend_payload = glob.payload_room_id + roomnumber.val;
			//Temperatur
			if (newTemp) {
				try {
					const temperature = Number(newTemp.val);
					if (!isNaN(temperature)) {
						extend_payload = extend_payload + glob.payload_temp + temperature;
					}
				} catch(error) {
					//No Number
				}
			}
			//mode
			if (actTemp_mode && actTemp_mode.val != '') {
				extend_payload = extend_payload + glob.payload_mode + actTemp_mode.val;
				await this.setState(this._getDP([actParent, glob.Channel_settings, glob.State_TempChanged_Mode]), '', true);
			} else {
				extend_payload = extend_payload + glob.payload_mode + mode;
			}
			//endtime
			if (actTemp_endtime && actTemp_endtime.val != '') {
				if (await this.getDateFrom1970(actTemp_endtime.val) > Date.now()) {
					extend_payload = extend_payload + glob.payload_endtime + actTemp_endtime.val;
				}
				await this.setState(this._getDP([actParent, glob.Channel_settings, glob.State_TempChanged_Endtime]), '', true);
			}
			//send request
			await this.sendAPIRequest(glob.Netatmo_APIrequest_URL, NetatmoRequest, extend_payload, false, true);
			return true;
		} else {
			return false;
		}
	}

	//Apply single request to API for temp
	async applySingleActualTemp(newTemp,actParent,NetatmoRequest,mode, temp) {
		await this.applyActualTemp(newTemp,actParent,NetatmoRequest,mode, temp);
		if (this.config.getchangesimmediately) {
			await this.sendAPIRequest(glob.Netatmo_APIrequest_URL, glob.APIRequest_homestatus, '', false, true);
		}
	}

	// send sync API Request
	async sendSingleActualTemp (NetatmoRequest, norefresh) {
		let syncmode = '';
		syncmode = syncmode + await this.getValuefromDatapoint(glob.payload_zones, this._getDP([this.globalAPIChannel, glob.Channel_synchomeschedule, glob.Channel_parameters, glob.State_zones]));
		syncmode = syncmode + await this.getValuefromDatapoint(glob.payload_timetable, this._getDP([this.globalAPIChannel, glob.Channel_synchomeschedule, glob.Channel_parameters, glob.State_timetable]));
		syncmode = syncmode + await this.getValuefromDatapoint(glob.payload_hg_temp,   this._getDP([this.globalAPIChannel, glob.Channel_synchomeschedule, glob.Channel_parameters, glob.State_hg_temp]));
		syncmode = syncmode + await this.getValuefromDatapoint(glob.payload_away_temp, this._getDP([this.globalAPIChannel, glob.Channel_synchomeschedule, glob.Channel_parameters, glob.State_away_temp]));

		if ((syncmode.match(/&/g) || []).length == 4) {
			syncmode = syncmode + await this.getValuefromDatapoint(glob.payload_schedule_id, this._getDP([this.globalAPIChannel, glob.Channel_synchomeschedule, glob.Channel_parameters, glob.State_schedule_id]));
			await this.sendAPIRequest(glob.Netatmo_APIrequest_URL, NetatmoRequest, syncmode, norefresh, true);
		} else {
			this.log.error(mytools.tl('API-synchomeschedule request is missing parameters', this.systemLang));
			await this.sendRequestNotification(null, glob.WarningNotification, NetatmoRequest + '\n', 'Request is missing parameters' + 'Actual payload: ' + syncmode);
		}
	}

	//fetch API request
	// eslint-disable-next-line no-unused-vars
	_myFetch(url, payload, NewOAuth) {
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
						signal: that.FetchAbortController.signal,
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
								reject(error);
							}
						} else {
							that.log.debug(mytools.tl('Netatmo API status false', that.systemLang));
							reject(error);
						}
					});
				} catch(err) {
					// @ts-ignore
					if (err.name == 'AbortError') {
						that.log.debug(mytools.tl('Netatmo API request aborted', that.systemLang));
					} else {
						throw err;
					}
				}
			});
	}

	//Subscribe specific state
	async _subscribeStates(id){
		const actId = mytools.splitID(id);

		let oldValue = null;
		let index = -1;
		if ((actId.state == glob.state_anticipating && actId.folder == glob.Channel_status) ||			//check anticipating
			(actId.state == glob.state_open_window && actId.folder == glob.Channel_status) ||			//check window open
			(actId.state == glob.state_reachable && actId.folder == glob.Channel_modulestatus) ||		//check module reachable
			(actId.state == glob.state_battery_state && actId.folder == glob.Channel_modulestatus) ||	//check battery status
			(actId.state == glob.state_heating_power_request && actId.folder == glob.Channel_status)) {	//check heating request

			index = this.mySubscribedStates.findIndex(element => {
				return element.id === id;
			});
			if (index >= 0) this.mySubscribedStates.splice(index,1);

			oldValue = await this.getStateAsync(id);
			this.mySubscribedStates.push({id: id, state: (oldValue) ? oldValue.val : null});

			await this.unsubscribeStatesAsync(id);
			await this.subscribeStatesAsync(id);
		}
	}

	//Parse values from Netatmo response
	async getValuesFromNetatmo(API_Request,obj,obj_name,obj_selected,Netatmo_Path,norefresh) {
		const relevantTag = 'home\\.\\b(?:rooms|modules)\\.\\d+\\.id';
		const searchSchedule = 'homes\\.\\d+\\.' + glob.Channel_schedules + '\\.\\d+$';
		let myobj_selected = obj_name;

		if (mytools.netatmoTags(obj_name) === true) {
			if (API_Request === glob.APIRequest_homesdata) {
				await this.createMyChannel(Netatmo_Path, myobj_selected);
				if (Netatmo_Path.search(searchSchedule) >= 0) {
					await this.createNetatmoStructure(this._getDP([Netatmo_Path, glob.State_selected]), glob.State_selected, false, true, 'indicator', false, true, '', false, false);
				}
			}
		} else {
			myobj_selected = obj_selected;
		}

		for(const object_name in obj) {
			if (API_Request === glob.APIRequest_homestatus) {
				const fullname = mytools.getPrefixPath(Netatmo_Path + glob.dot) + object_name;
				if (fullname.search(relevantTag) >= 0) {
					await this.searchAllRooms(obj[object_name], obj, norefresh);
					await this.searchAllModules(obj[object_name], obj);
				}
			}
			if(obj[object_name] instanceof Object) {
				if (mytools.netatmoTags(object_name) === true) {
					await this.getValuesFromNetatmo(API_Request,obj[object_name],object_name,myobj_selected,mytools.getPrefixPath(Netatmo_Path + glob.dot) + object_name,norefresh);
				} else {
					await this.getValuesFromNetatmo(API_Request,obj[object_name],object_name,myobj_selected,Netatmo_Path,norefresh);
				}
			} else {
				if (mytools.netatmoTagsDetail(myobj_selected) === true && API_Request === glob.APIRequest_homesdata) {
					await this.createNetatmoStructure(mytools.getPrefixPath(Netatmo_Path + glob.dot) + object_name, object_name, obj[object_name], true, '', false, true, '', false, false);
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

		await that.deleteChannel(that.globalAPIChannel, glob.Channel_switchhomeschedule);
		this.globalScheduleObjects   = {};
		this.globalScheduleList      = {};
		this.globalScheduleListArray = [];

		//schedules
		// @ts-ignore
		this.getStates(that.namespace + '.homes.*.schedules.*',async function(error, states) {
			await that.createMyChannel(that._getDP([that.globalAPIChannel, glob.Channel_switchhomeschedule]), 'API switchhomeschedule');
			for(const id in states) {
				if (id.search(searchSchedules) >= 0) {
					schedule_id = await that.getStateAsync(id);
					if (schedule_id) {
						schedule_name = await that.getStateAsync(id.substring(0,id.length - 3) + '.name');
						if (schedule_name) {
							// @ts-ignore
							that.globalScheduleObjects[that._getDP([that.globalAPIChannel, glob.Channel_switchhomeschedule, glob.APIRequest_switchhomeschedule + '_' + schedule_name.val.replace(/[\s[\]*,;'"&`<>\\?.^$()/]/g, '_')])] = schedule_id.val;
							// @ts-ignore
							await that.createNetatmoStructure(that._getDP([that.globalAPIChannel, glob.Channel_switchhomeschedule, glob.APIRequest_switchhomeschedule + '_' + schedule_name.val.replace(/[\s[\]*,;'"&`<>\\?.^$()/]/g, '_')]), schedule_name.val, false, true, 'button', true, true, '', false, false);
							// @ts-ignore
							await that.subscribeStates(that._getDP([that.globalAPIChannel, glob.Channel_switchhomeschedule, glob.APIRequest_switchhomeschedule + '_' + schedule_name.val.replace(/[\s[\]*,;'"&`<>\\?.^$()/]/g, '_')]));

							// create sortet object
							const mySchedule = mytools.getSortedArray(schedule_name.val, schedule_id.val, that.globalScheduleList, that.globalScheduleListArray);
							that.globalScheduleList      = mySchedule.list;
							that.globalScheduleListArray = mySchedule.listArray;
							await that.createNetatmoStructure(that._getDP([that.globalAPIChannel, glob.Channel_synchomeschedule, glob.Channel_parameters, glob.State_schedule_id]), 'Id of the schedule', '', true, 'text', true, true, that.globalScheduleList, true, false);
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
				// @ts-ignore
				that.getStates(that.namespace + '.homes.*.rooms.*',async function(error, states) {
					if (states && !error) {
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
				// @ts-ignore
				that.getStates(that.namespace + '.homes.*.modules.*',async function(error, states) {
					if (states && !error) {
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

		// @ts-ignore
		that.getStates(that.namespace + '.homes.*.rooms.*',async function(error, states) {
			for(const id in states) {
				if (id.search(searchRooms) >= 0) {
					room_id = await that.getStateAsync(id);
					if (room_id && room_id.val == statevalue) {
						const myTargetName = id.substring(0,id.length - 3);
						await that.createMyChannel(that._getDP([myTargetName, glob.Channel_status]), 'Device status');
						const roomName = await that.getStateAsync(myTargetName  + '.name');

						// create sortet object
						const myRooms = mytools.getSortedArray(((roomName !== null && roomName !== undefined) ? roomName.val : room_id.val), room_id.val, that.globalRoomId, that.globalRoomIdArray);
						that.globalRoomId      = myRooms.list;
						that.globalRoomIdArray = myRooms.listArray;
						await that.createNetatmoStructure(that._getDP([that.globalAPIChannel, glob.Channel_getroommeasure, glob.Channel_parameters, glob.State_room_id]), 'Id of room', '', true, 'text', true, true, that.globalRoomId, false, true);

						for(const objstat_name in ObjStatus) {
							if(!(ObjStatus[objstat_name] instanceof Object) && objstat_name != 'id') {
								await that.createNetatmoStructure(that._getDP([myTargetName, glob.Channel_status, objstat_name]), objstat_name, ObjStatus[objstat_name], true, '', false, true, '', false, false);
								switch(objstat_name) {
									case glob.State_therm_setpoint_temperature:
										await that.createMyChannel(that._getDP([myTargetName, glob.Channel_settings]), 'Change settings');
										await that.createNetatmoStructure(that._getDP([myTargetName, glob.Channel_settings, glob.Trigger_SetTemp]), 'set temperature manually', ObjStatus[objstat_name], true, 'level.temperature', true, true, '', norefresh, true);
										await that.createNetatmoStructure(that._getDP([myTargetName, glob.Channel_settings, glob.State_TempChanged]), 'temperature manually changed', false, true, 'indicator', false, true, '', norefresh, false);
										await that.createNetatmoStructure(that._getDP([myTargetName, glob.Channel_settings, glob.State_TempChanged_Mode]), 'The mode you are applying to this room (def=manual)', '', true, 'text', true, true, glob.List_mode, norefresh, false);
										await that.createNetatmoStructure(that._getDP([myTargetName, glob.Channel_settings, glob.State_TempChanged_Endtime]), 'end time of the schedule mode set (seconds)', '', true, 'value.time', true, true, '', norefresh, false);
										await that.createNetatmoStructure(that._getDP([myTargetName, glob.Channel_settings, glob.Trigger_SetHome]), 'Set the mode for this room to home', false, true, 'button', true, true, '', norefresh, false);
										await that.subscribeStates(that._getDP([myTargetName, glob.Channel_settings, glob.Trigger_SetTemp]));
										await that.subscribeStates(that._getDP([myTargetName, glob.Channel_settings, glob.State_TempChanged_Mode]));
										await that.subscribeStates(that._getDP([myTargetName, glob.Channel_settings, glob.Trigger_SetHome]));
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

		// @ts-ignore
		that.getStates(that.namespace + '.homes.*.modules.*',async function(error, states) {
			for(const id in states) {
				if (id.search(searchModules) >= 0) {
					module_id = await that.getStateAsync(id);
					if (module_id && module_id.val == statevalue) {
						const myTargetName = id.substring(0,id.length - 3);
						await that.createMyChannel(that._getDP([myTargetName, glob.Channel_modulestatus]), 'Module status');

						const type = await that.getStateAsync(that._getDP([myTargetName , glob.Channel_modulestatus, 'type']));
						if (type && type.val == 'NATherm1') {
							const deviceName = await that.getStateAsync(myTargetName  + '.name');
							const bridge = await that.getStateAsync(that._getDP([myTargetName , glob.Channel_modulestatus, 'bridge']));

							// create sortet object
							const myDevices = mytools.getSortedArray(((deviceName !== null && deviceName !== undefined) ? deviceName.val : type.val), ((bridge !== null && bridge !== undefined) ? bridge.val : type.val), that.globalDeviceId, that.globalDeviceIdArray);
							that.globalDeviceId      = myDevices.list;
							that.globalDeviceIdArray = myDevices.listArray;
							await that.createNetatmoStructure(that._getDP([that.globalAPIChannel, glob.Channel_getmeasure, glob.Channel_parameters, glob.State_device_id]), 'Mac adress of the device', '', true, 'text', true, true, that.globalDeviceId, false, true);
						}
						for(const objstat_name in ObjStatus) {
							if(!(ObjStatus[objstat_name] instanceof Object) && objstat_name != 'id') {
								await that.createNetatmoStructure(that._getDP([myTargetName, glob.Channel_modulestatus, objstat_name]), objstat_name, ObjStatus[objstat_name], true, '', false, true, '', false, false);
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
		const adapter_time_exec = await this.getStateAsync(this._getDP([this.namespace, glob.State_Time_Exec]));
		return (((adapter_time_exec !== null && adapter_time_exec !== undefined) ? adapter_time_exec.val : 0) + seconds) * 3600;
	}

	// Create Device
	async createMyDevice(path, name) {
		try {
			await this.setObjectNotExists(path, {
				type: 'device',
				common: {
					name: name,
				},
				native: {},
			});
		} catch(error) {
			this.log.error(mytools.tl('Can not create device: ', this.systemLang) +  error);
		}
	}

	// Create Channel
	async createMyChannel(path, name) {
		try {
			await this.setObjectNotExists(path, {
				type: 'channel',
				common: {
					name: name,
				},
				native: {},
			});
		} catch(error) {
			this.log.error(mytools.tl('Can not create channel: ', this.systemLang) +  error);
		}
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
			} else if (object_name.indexOf(glob.state_anticipating) >= 0) {
				role = 'indicator.anticipating';
				forced = true;
			} else if (object_name.indexOf(glob.state_reachable) >= 0) {
				role = 'indicator.reachable';
				forced = true;
			} else if (object_name.indexOf(glob.state_open_window) >= 0) {
				role = 'indicator.window';
				forced = true;
			} else if (object_name.indexOf(glob.State_therm_setpoint_temperature) >= 0) {
				role = 'valve.temperature';
				forced = true;
			} else if (object_name.indexOf('temperature') >= 0 || object_name.indexOf('temp') >= 0) {
				role = 'value.temperature';
			} else if (id.indexOf('altitude') >= 0) {
				role = 'value.gps.elevation';
				forced = true;
			} else if (id.indexOf('coordinates.0') >= 0) {
				role = 'value.gps.longitude';
				forced = true;
			} else if (id.indexOf('coordinates.1') >= 0) {
				role = 'value.gps.latitude';
				forced = true;
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
		const myObject = {
			type: 'state',
			common: {
				name: object_name,
				role: role,
				type: typeof value,
				read: read,
				write: write
			},
			native: {},
		};
		if (list != '' && (typeof list === 'string' || list instanceof String)) {
			// @ts-ignore
			myObject.common.states = JSON.parse(list);
		} else if (typeof list === 'object') {
			myObject.common.states = list;
		}
		try {
			if (forced) {
				// @ts-ignore
				await this.setObjectAsync(id, myObject);
				if (!norefresh) {
					await this._subscribeStates(id);
					await this.setState(id, value, ack);
				}
			} else {
				// @ts-ignore
				await this.setObjectNotExistsAsync(id, myObject);
				if (!norefresh) {
					await this._subscribeStates(id);
					await this.setState(id, value, ack);
				}
			}
		} catch(error) {
			this.log.error(mytools.tl('Can not save data to objects: ', this.systemLang) +  error);
		}
	}

	//set trigger after comparing
	async compareValues(id, id_mode, state, idtoset) {
		const adapterstates         = await this.getStateAsync(id);
		const adapterstates_mode    = await this.getStateAsync(id_mode);
		//const adapterstates_endtime = await this.getStateAsync(id_endtime);
		if((adapterstates && adapterstates.val != state.val) || (adapterstates_mode && adapterstates_mode.val != '')) {
			this.setState(idtoset, true, true);
		} else {
			this.setState(idtoset, false, true);
		}
	}

	//set mode to home
	async setModeToHome(id, id_mode, id_mode_act) {
		const act_mode   = await this.getStateAsync(id_mode_act);
		if (act_mode && act_mode.val !== glob.State_TempChanged_Mode_schedule) {
			await this.setState(id_mode, glob.State_TempChanged_Mode_home, false);
		} else {
			await this.setState(id, false, true);
		}
	}

	//Set schedule mude
	async _setTempChangedMode(id, state) {
		const actId = mytools.splitID(id);
		this.log.debug(mytools.tl('Set room attributes', this.systemLang));
		const trigger_id = this._getDP([actId.parent, glob.Channel_settings, glob.Trigger_SetHome]);
		const trigger = await this.getStateAsync(trigger_id);
		if (this.config.applyimmediately || (trigger && trigger.val == true)) {
			if (trigger && trigger.val == true) await this.setState(trigger_id, false, true);
			await this.applySingleActualTemp(state,actId.parent,glob.APIRequest_setroomthermpoint,glob.APIRequest_setroomthermpoint_manual,false);
		} else {
			await this.compareValues(this._getDP([actId.parent, glob.Channel_status, glob.State_therm_setpoint_temperature]), this._getDP([actId.parent, glob.Channel_status, glob.State_TempChanged_Mode]), state, this._getDP([actId.path, glob.State_TempChanged]));
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

	//Message because of state changes
	async sendMessage(id, message) {
		const name = await this.getStateAsync(id);
		this.log.info(mytools.tl('SendMessage: ', this.systemLang) + ((name) ? ' (' + name.val + ')' : ''));
		this.sendRequestNotification(null, glob.SendNotification, mytools.tl('Warning', this.systemLang), message + ((name) ? '(' + name.val + ')' : '') );
	}

	//Get old states
	_getOldValue(id) {
		const result = this.mySubscribedStates.find((element) => element.id == id);
		if (result && result != undefined) {
			return result.state;
		} else {
			return null;
		}
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			this.AdapterStarted = false;
			this.FetchAbortController.abort();
			Object.keys(this.adapterIntervals).forEach(interval => clearInterval(this.adapterIntervals[interval]));
			this.log.debug(mytools.tl('cleaned everything up...', this.systemLang));
			this.sendRequestNotification(null, glob.WarningNotification, mytools.tl('Status', this.systemLang) + '\n' + mytools.tl('Adapter stopped', this.systemLang), mytools.tl('Somebody stopped', this.systemLang) + glob.blank + this.namespace);
			callback();
		} catch (e) {
			callback();
		}
	}

	//State changed - ack not checked
	_onStateChanged(id,state) {
		if (id.lastIndexOf(glob.dot) >= 0) {
			const actId = mytools.splitID(id);

			switch(actId.state) {
				//Reaction of states
				//anticipating
				case glob.state_anticipating:
					if (this.config.notify_anticipating_txt && this.config.notify_anticipating == true && this.config.notify_anticipating_txt != '' && state.val != this._getOldValue(id)) this.sendMessage(actId.parent + '.name', this.config.notify_heating_power_request_txt);
					break;
				//Window open
				case glob.state_open_window:
					if (this.config.notify_window_open_txt && this.config.notify_window_open == true && this.config.notify_window_open_txt != '' && state.val != this._getOldValue(id)) this.sendMessage(actId.parent + '.name', this.config.notify_window_open_txt);
					break;
				//No Connection
				case glob.state_reachable:
					if (this.config.notify_connection_no_txt && this.config.notify_connection_no == true && this.config.notify_connection_no_txt != '' && state.val != this._getOldValue(id)) this.sendMessage(actId.parent + '.name', this.config.notify_connection_no_txt);
					break;
				//Battery state
				case glob.state_battery_state:
					if (state.val == glob.battery_low) {
						if (this.config.notify_bat_low_txt && this.config.notify_bat_low == true && this.config.notify_bat_low_txt != '' && state.val != this._getOldValue(id)) this.sendMessage(actId.parent + '.name', this.config.notify_bat_low_txt);
						break;
					}
					if (state.val == glob.battery_medium) {
						if (this.config.notify_bat_medium_txt && this.config.notify_bat_medium == true && this.config.notify_bat_medium_txt != '' && state.val != this._getOldValue(id)) this.sendMessage(actId.parent + '.name', this.config.notify_bat_medium_txt);
						break;
					}
					break;
				//Heating request
				case glob.state_heating_power_request:
					if (this.config.notify_heating_power_request_txt && this.config.notify_heating_power_request == true && this.config.notify_heating_power_request_txt != '' && state.val != this._getOldValue(id)) this.sendMessage(actId.parent + '.name', this.config.notify_heating_power_request_txt);
					break;
			}
		}
	}

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
				if (id.lastIndexOf(glob.dot) >= 0) {
					const actId = mytools.splitID(id);
					switch(actId.state) {
						// Get Structure of your home (NAPlug)
						case glob.APIRequest_homesdata:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('API Request homesdata:', this.systemLang) + glob.blank + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.sendHomesdataAPIRequest(glob.APIRequest_homesdata,false);
							break;

						// get actual homestatus
						case glob.APIRequest_homestatus:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('API Request homestatus:', this.systemLang) + glob.blank + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.sendHomestatusAPIRequest(glob.APIRequest_homestatus, false);
							break;

						// Get rooms measure statistic
						case glob.APIRequest_getroommeasure:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('API Request getroommeasure:', this.systemLang) + glob.blank + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.sendRoomsmeasureAPIRequest(glob.APIRequest_getroommeasure,false);
							break;

						// Get measure statistic
						case glob.APIRequest_getmeasure:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('API Request getmeasure:', this.systemLang) + glob.blank + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.sendMeasureAPIRequest(glob.APIRequest_getmeasure,false);
							break;

						// Set Therm Mode for Netatmo Energy
						case glob.State_TempChanged_Mode:
							this._setTempChangedMode(id, state);
							break;

						// Set Therm Mode for Netatmo Energy to home
						case glob.Trigger_SetHome:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('Mode set to home mode!', this.systemLang));
							this.setModeToHome(this._getDP([actId.parent, glob.Channel_settings, glob.Trigger_SetHome]), this._getDP([actId.parent, glob.Channel_settings, glob.State_TempChanged_Mode]), this._getDP([actId.parent, glob.Channel_status, glob.State_therm_setpoint_mode]));
							break;

						case glob.Trigger_SetTemp:
							this.log.debug(mytools.tl('Set room attributes', this.systemLang));
							// @ts-ignore
							if (!isNaN(state.val)) {
								if (this.config.applyimmediately) {
									this.applySingleActualTemp(state,actId.parent,glob.APIRequest_setroomthermpoint,glob.APIRequest_setroomthermpoint_manual,true);
								} else {
									this.compareValues(this._getDP([actId.parent, glob.Channel_status, glob.State_therm_setpoint_temperature]), this._getDP([actId.parent, glob.Channel_status, glob.State_TempChanged_Mode]), state, this._getDP([actId.path, glob.State_TempChanged]));
								}
							} else {
								this.log.debug(mytools.tl('SetTemp: ', this.systemLang) + mytools.tl('No Number', this.systemLang) + glob.blank + state.val);
							}
							break;

						// Apply all changes to Netatmo Cloud
						case glob.Trigger_applychanges:
							if (state.val === false) {
								break;
							}
							this.setState(id, false, true);
							this.applySingleAPIRequest(glob.APIRequest_setroomthermpoint, glob.APIRequest_setroomthermpoint_manual, mytools.tl('changed manually', this.systemLang) );
							break;

						// Set thermmode for Netatmo Energy
						case glob.APIRequest_setthermmode + '_' + glob.APIRequest_setthermmode_schedule:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('API Request setthermmode', this.systemLang) + ' - schedule: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.applySingleAPIRequest(glob.APIRequest_setthermmode, glob.APIRequest_setthermmode_schedule, mytools.tl('schedule', this.systemLang));
							break;

						// Set thermmode for Netatmo Energy
						case glob.APIRequest_setthermmode + '_' + glob.APIRequest_setthermmode_hg:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('API Request setthermmode', this.systemLang) + ' - hg: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.applySingleAPIRequest(glob.APIRequest_setthermmode, glob.APIRequest_setthermmode_hg, mytools.tl('frost guard', this.systemLang));
							break;

						// Set thermmode for Netatmo Energy
						case glob.APIRequest_setthermmode + '_' + glob.APIRequest_setthermmode_away:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('API Request setthermmode', this.systemLang) + ' - away: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.applySingleAPIRequest(glob.APIRequest_setthermmode, glob.APIRequest_setthermmode_away, mytools.tl('away from home', this.systemLang));
							break;

						// Set synchomeschedule for Netatmo Energy
						case glob.APIRequest_synchomeschedule:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('API Request synchomeschedule:', this.systemLang) + glob.blank + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.sendSingleActualTemp(glob.APIRequest_setthermmode, false);
							break;

						//Refresh whole structure
						case glob.Trigger_refresh_all:
							if (state.val === false) {
								break;
							}
							this.log.debug(mytools.tl('Refresh whole structure:', this.systemLang) + glob.blank + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.RefreshWholeStructure(false);
							break;

						default:
							this._onStateChanged(id,state);
					}
					if (actId.state.search(glob.APIRequest_switchhomeschedule) == 0) {
						if (state.val === true) {
							this.setState(id, false, true);
							this.log.debug(mytools.tl('API Request swithhomeschedule:', this.systemLang) + glob.blank + this.globalScheduleObjects[id]);
							this.applySingleAPIRequest(glob.APIRequest_switchhomeschedule, this.globalScheduleObjects[id], '\'' + (id.substring(id.lastIndexOf(glob.dot + glob.APIRequest_switchhomeschedule) + (glob.dot + glob.APIRequest_switchhomeschedule).length + 1)).replace('_', glob.blank) + '\'');
						}
					}
				}
			} else {
				this._onStateChanged(id, state);
			}
		} else {
			// The state was deleted
			//this.log.info(`state ${id} deleted`);

			if (id.lastIndexOf(glob.dot) >= 0) {
				const actStateDel = id.substring(id.lastIndexOf(glob.dot) + 1);
				switch(actStateDel) {
					case glob.APIRequest_homesdata:
					case glob.APIRequest_homestatus:
					case glob.APIRequest_getroommeasure:
					case glob.APIRequest_getmeasure:
					case glob.Trigger_SetTemp:
					case glob.Trigger_refresh_all:
					case glob.Trigger_applychanges:
					case glob.State_TempChanged_Mode:
					case glob.Trigger_SetHome:
					case glob.APIRequest_setthermmode + '_' + glob.APIRequest_setthermmode_schedule:
					case glob.APIRequest_setthermmode + '_' + glob.APIRequest_setthermmode_hg:
					case glob.APIRequest_setthermmode + '_' + glob.APIRequest_setthermmode_away:
					case glob.APIRequest_synchomeschedule:
						this.createEnergyAPP();
						break;
				}
			}
		}
	}

	//get and check value
	_getValue(value) {
		if (value) return value.val;
		else return null;
	}

	// Get activ schedule
	_getActiveSchedule() {
		const searchSchedule   = 'homes\\.\\d+\\.schedules\\.\\d+\\.id';
		const that = this;

		return new Promise(
			// eslint-disable-next-line no-unused-vars
			function(resolve,reject) {
				// @ts-ignore
				let myActiveSchedule = mytools.tl('Can not get active heating plan!', that.systemLang);
				that.getStates(that.namespace + '.homes.*.schedules.*.id', async function(error, states) {
					if (states && !error) {
						for(const id in states) {
							if (id.search(searchSchedule) >= 0) {
								const myTargetName = id.substring(0,id.length - 3);
								const plan_active  = await that.getStateAsync(that._getDP([myTargetName, 'selected']));
								if (plan_active && plan_active.val == true) {
									const Schedule_Name = await that.getStateAsync(that._getDP([myTargetName, 'name']));
									if (Schedule_Name && Schedule_Name.val != null) {
										myActiveSchedule = Schedule_Name.val.toString();
									}
								}

							}
						}
						resolve(myActiveSchedule);
					} else {
						resolve(myActiveSchedule);
					}
				});
			}
		);
	}

	// Get activ thermmode
	_getActiveThermMode(conv_name_list) {
		const searchHomeID   = 'homes\\.\\d+\\.id';
		const that = this;

		return new Promise(
			// eslint-disable-next-line no-unused-vars
			function(resolve,reject) {
				// @ts-ignore
				let myActiveThermMode = mytools.tl('Can not get active therm mode!', that.systemLang);
				that.getStates(that.namespace + '.homes.*.id', async function(error, states) {
					if (states && !error) {
						for(const id in states) {
							if (id.search(searchHomeID) >= 0) {
								const myTargetName = id.substring(0,id.length - 3);
								const thermmode_active  = await that.getStateAsync(that._getDP([myTargetName, 'therm_mode']));
								if (thermmode_active && thermmode_active != null) {
									myActiveThermMode = thermmode_active.val;
									try {
										myActiveThermMode = mytools.tl(JSON.parse(conv_name_list)[myActiveThermMode], that.systemLang);
									} catch(e) {
										//no JSON
									}
								}

							}
						}
						resolve(myActiveThermMode);
					} else {
						resolve(myActiveThermMode);
					}
				});
			}
		);
	}

	// Get API Requests
	_getAllAPIRequests(channel, API_Request, conv_name_list) {
		const searchModes = this._getDP([this.globalAPIChannel, channel, API_Request]) + '*';
		const myAPIRequests = [];

		const that = this;
		return new Promise(
			// eslint-disable-next-line no-unused-vars
			function(resolve,reject) {
				that.getStates(searchModes,async function(error, states) {
					if (states && !error) {
						for(const id in states) {
							const name = id.substring(searchModes.length);
							let converted_name = null;
							try {
								converted_name = mytools.tl(JSON.parse(conv_name_list)[name], that.systemLang);
							} catch(e) {
								//no JSON
							}
							if (converted_name && converted_name != '') {
								myAPIRequests.push(Object.assign({},{name: converted_name, id: id, request: API_Request + '_' + name}));
							} else {
								myAPIRequests.push(Object.assign({},{name: name.replace(/_/g, ' '), id: id, request: API_Request + '_' + name}));
							}
						}
						resolve(myAPIRequests);
					} else {
						resolve(myAPIRequests);
					}
				});
			}
		);
	}

	//get all modules
	_getAllModules() {
		const myModules = [];
		const searchModules   = 'homes\\.\\d+\\.modules\\.\\d+\\.id';

		let module_id = null;
		const that = this;
		return new Promise(
			function(resolve,reject) {
				// @ts-ignore
				that.getStates(that.namespace + '.homes.*.modules.*',async function(error, states) {
					if (states && !error) {
						for(const id in states) {
							if (id.search(searchModules) >= 0) {
								module_id = await that.getStateAsync(id);
								if (module_id) {
									const myTargetName               = id.substring(0,id.length - 3);
									const ModuleName_ID				 = that._getDP([myTargetName, 'name']);
									const deviceName                 = await that.getStateAsync(ModuleName_ID);
									const type                       = await that.getStateAsync(that._getDP([myTargetName, 'type']));
									const bridge                     = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_modulestatus, 'bridge']));
									const battery_state              = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_modulestatus, 'battery_state']));
									const battery_level              = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_modulestatus, 'battery_level']));
									const firmware_revision          = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_modulestatus, 'firmware_revision']));
									const rf_strength                = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_modulestatus, 'rf_strength']));
									const boiler_status              = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_modulestatus, 'boiler_status']));
									const boiler_valve_comfort_boost = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_modulestatus, 'boiler_valve_comfort_boost']));
									const wifi_strength              = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_modulestatus, 'wifi_strength']));
									const plug_connected_boiler      = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_modulestatus, 'plug_connected_boiler']));
									const hardware_version      	 = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_modulestatus, 'hardware_version']));
									const boiler_cable      	 	 = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_modulestatus, 'boiler_cable']));

									myModules.push(Object.assign({}, module_id,
										{type: that._getValue(type)},
										{deviceName: that._getValue(deviceName)},
										{ModuleName_ID: ModuleName_ID},
										{bridge: that._getValue(bridge)},
										{boiler_status: that._getValue(boiler_status)},
										{boiler_valve_comfort_boost: that._getValue(boiler_valve_comfort_boost)},
										{battery_state: that._getValue(battery_state)},
										{battery_level: that._getValue(battery_level)},
										{firmware_revision: that._getValue(firmware_revision)},
										{rf_strength: that._getValue(rf_strength)},
										{wifi_strength: that._getValue(wifi_strength)},
										{plug_connected_boiler: that._getValue(plug_connected_boiler)},
										{hardware_version: that._getValue(hardware_version)},
										{boiler_cable: that._getValue(boiler_cable)}));
								}
							}
						}
						if (myModules) {
							resolve(myModules);
						} else {
							reject(null);
						}
					} else {
						reject(null);
					}
				});
			}
		);
	}

	//Search rooms
	_getAllRooms(myModules, mySchedules, myActiveSchedule, myActiveModes, myActiveThermMode) {
		//const searchRooms     = 'homes\\.\\d+\\.rooms\\.\\d+\\.id';
		let room_id = null;
		const myRooms = [];

		const that = this;
		return new Promise(
			function(resolve,reject) {
				that.getStates(that.namespace + '.homes.*.rooms.*.module_ids.*',async function(error, states) {
					if (states && !error) {
						let myHome = null;
						for(const id in states) {
							const module_id = await that.getStateAsync(id);

							let myModule = undefined;
							if (module_id) myModule = myModules.find(element => element.val == module_id.val);

							if (myModule) {
								const myTargetName = id.substring(0,id.substring(0,id.lastIndexOf(glob.dot)).length - 11);
								room_id = await await that.getStateAsync(myTargetName  + '.id');
								if (room_id) {
									const roomName                   = await that.getStateAsync(that._getDP([myTargetName, 'name']));
									const anticipating               = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_status, 'anticipating']));
									const open_window                = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_status, 'open_window']));
									const reachable                  = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_status, 'reachable']));
									const therm_measured_temperature = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_status, 'therm_measured_temperature']));
									const therm_setpoint_mode        = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_status, 'therm_setpoint_mode']));
									const therm_setpoint_temperature = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_status, 'therm_setpoint_temperature']));
									const heating_power_request      = await that.getStateAsync(that._getDP([myTargetName, glob.Channel_status, 'heating_power_request']));
									const Set_Temp      			 = that._getDP([myTargetName, glob.Channel_settings, glob.Trigger_SetTemp]);
									const Set_Mode      			 = myTargetName;

									const myHomeFolder = id.substring(0,id.substring(0,id.lastIndexOf('rooms')).length - 1);
									myHome      = await that.getStateAsync(myHomeFolder  + '.name');

									let schedule_programs_local = mySchedules;
									let myActiveSchedule_local	= myActiveSchedule;
									let myActiveModes_local		= myActiveModes;
									let myActiveThermMode_local	= myActiveThermMode;

									if (myModule.type != glob.APIRequest_homesdata_NAPTherm1) {
										schedule_programs_local = null;
										myActiveSchedule_local	= null;
										myActiveModes_local		= null;
										myActiveThermMode_local = null;
									}

									myRooms.push(Object.assign({},
										{myHome: that._getValue(myHome)},
										room_id,
										{Set_Temp: Set_Temp},
										{Set_Mode: Set_Mode},
										{ModuleName_ID: myModule.ModuleName_ID},
										{schedule_programs: schedule_programs_local},
										{active_schedule: myActiveSchedule_local},
										{thermmode_programs: myActiveModes_local},
										{active_thermmode: myActiveThermMode_local},
										{module_id: that._getValue(myModule)},
										{roomName: that._getValue(roomName)},
										{anticipating: that._getValue(anticipating)},
										{open_window: that._getValue(open_window)},
										{reachable: that._getValue(reachable)},
										{heating_power_request: that._getValue(heating_power_request)},
										{therm_measured_temperature: that._getValue(therm_measured_temperature)},
										{therm_setpoint_mode: that._getValue(therm_setpoint_mode)},
										{therm_setpoint_temperature: that._getValue(therm_setpoint_temperature)},
										{bridge: myModule.bridge},
										{deviceName: myModule.deviceName},
										{type: myModule.type},
										{battery_state: myModule.battery_state},
										{battery_level: myModule.battery_level},
										{firmware_revision: myModule.firmware_revision},
										{rf_strength: myModule.rf_strength},
										{boiler_valve_comfort_boost: myModule.boiler_valve_comfort_boost},
										{boiler_status: myModule.boiler_status},
										{wifi_strength: myModule.wifi_strength},
										{plug_connected_boiler: myModule.plug_connected_boiler},
										{hardware_version: myModule.hardware_version},
										{boiler_cable: myModule.boiler_cable} ));
								}
							}
						}
						room_id = null;
						for(const myModule in myModules) {
							if (myModules[myModule].type == glob.APIRequest_homesdata_NAPlug) {
								myRooms.push(Object.assign({},
									{myHome: that._getValue(myHome)},
									room_id,
									{Set_Temp: null},
									{Set_Mode: null},
									{ModuleName_ID: myModules[myModule].ModuleName_ID},
									{schedule_programs: null},
									{active_schedule: null},
									{thermmode_programs: null},
									{active_thermmode: null},
									{module_id: myModules[myModule].val},
									{roomName: null},
									{anticipating: null},
									{open_window: null},
									{reachable: null},
									{heating_power_request: null},
									{therm_measured_temperature: null},
									{therm_setpoint_mode: null},
									{therm_setpoint_temperature: null},
									{bridge: myModules[myModule].bridge},
									{deviceName: myModules[myModule].deviceName},
									{type: myModules[myModule].type},
									{battery_state: myModules[myModule].battery_state},
									{firmware_revision: myModules[myModule].firmware_revision},
									{rf_strength: myModules[myModule].rf_strength},
									{boiler_valve_comfort_boost: myModules[myModule].boiler_valve_comfort_boost},
									{boiler_status: myModules[myModule].boiler_status},
									{wifi_strength: myModules[myModule].wifi_strength},
									{plug_connected_boiler: myModules[myModule].plug_connected_boiler},
									{hardware_version: myModules[myModule].hardware_version},
									{boiler_cable: myModules[myModule].boiler_cable} ));
							}
						}
						if (myRooms) {
							resolve(myRooms);
						} else {
							reject(null);
						}
					} else {
						reject(null);
					}
				});
			}
		);
	}

	//Get all valves
	_getAllValves(obj, mySchedules, myActiveSchedule, myActiveModes, myActiveThermMode) {
		this._getAllModules()
			// eslint-disable-next-line no-unused-vars
			.then(myModules => {
				this._getAllRooms(myModules, mySchedules, myActiveSchedule, myActiveModes, myActiveThermMode)
					.then(myRooms => {
						this.sendTo(obj.from, obj.command, myRooms, obj.callback);
					})
					.catch(() => {
					//error during searching for rooms);
					});
			})
			.catch(() => {
				//error during searching for rooms);
			});
	}

	//rename Valve
	async _renameValve(from, command, message) {
		const {id, object: common} = message;
		const _object = await this.getForeignObjectAsync(id);

		if (_object != undefined && common != undefined) {
			await this.setForeignObjectAsync(id, Object.assign(
				_object,
				{
					from: `system.adapter.${this.namespace}`,
					ts: Date.now()
				},
				{common: Object.assign(_object.common, common)}
			));
		}
	}

	_getOAuth2AuthenticateStartLink(args) {
		if (!args) {
			this.log.error(mytools.tl('Authenticate "args" not set!', this.systemLang));
			return null;
		}

		const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let randomState = '';
		for (let i = 0; i < 40; i++) {
			randomState += validChars.charAt(Math.floor(Math.random() * validChars.length));
		}

		const url = `${glob.Netatmo_BASE_URL}/oauth2/authorize?client_id=${encodeURIComponent(args.client_id)}&redirect_uri=${encodeURIComponent(args.redirect_uri)}&scope=${encodeURIComponent(args.scope)}&state=${randomState}`;
		this.storedOAuthStates[randomState] = args;

		return {
			url,
			state: randomState
		};
	}


	/** authenticate Netatmo API
	 * http://dev.netatmo.com/doc/authentication
	 * @param args
	 */
	async _authenticate(args, obj) {

		if (!args) {
			this.log.error(mytools.tl('Authenticate "args" not set!', this.systemLang));
			return null;
		}
		if (args.state && this.storedOAuthStates[args.state]) {
			args = Object.assign(args, this.storedOAuthStates[args.state]);
			delete this.storedOAuthStates[args.state];
		}

		this.scope = args.scope || glob.OAuthScope;

		if (!args.redirect_uri || !args.code) return;

		if (args.access_token) {
			// Get token from API - args.redirect_uri, args.code
			this._authenticate_refresh_token(args.redirect_uri, args.code);
		} else {
			const setpayload = 'code=' + args.code + '&redirect_uri=' + args.redirect_uri + '&grant_type=authorization_code' + glob.payload_client_id + this.config.ClientId + glob.payload_client_secret + this.config.ClientSecretID + glob.payload_scope + glob.OAuthScope;
			await this.getAPIRequest(glob.Netatmo_TokenRequest_URL, '', setpayload, this.config.NewOAuthMethode)
				// eslint-disable-next-line no-unused-vars
				.then(async (tokenvalues) => {
					this.globalNetatmo_AccessToken	= tokenvalues.access_token;
					this.globalNetatmo_ExpiresIn	= tokenvalues.expires_in + ((new Date()).getTime() / 1000) - 20;
					this.globalRefreshToken			= tokenvalues.refresh_token;
					this._saveToken();
					//send OK-acknowlage to OAuth2
					obj.callback && this.sendTo(obj.from, obj.command, {result: `${mytools.tl('Tokens updated successfully.', this.systemLang)}`}, obj.callback);

					this.log.info(mytools.tl('Update data in adapter configuration ... restarting ...', this.systemLang));
					this.extendForeignObject(`system.adapter.${this.namespace}`, {});
				})
				.catch(error => {
					this.globalNetatmo_AccessToken	= null;
					this.globalRefreshToken			= null;
					this.globalNetatmo_ExpiresIn	= 0;
					this._saveToken();
					this.log.error(mytools.tl('API request not OK:', this.systemLang) + ((error !== undefined && error !== null) ? (glob.blank + error.error + ': ' + error.error_description) : ''));
					this.sendRequestNotification(null, glob.ErrorNotification, 'Get Token' + '\n', mytools.tl('API request not OK:', this.systemLang) + ((error !== undefined && error !== null) ? (glob.blank + error.error + ': ' + error.error_description) : ''));
					this.log.error(`OAuthRedirectReceived: ${error}`);
					//send NOK-acknowlage to OAuth2
					obj.callback && this.sendTo(obj.from, obj.command, {error: `${mytools.tl('Error getting new tokens from Netatmo: ', this.systemLang)} ${error} ${mytools.tl('. Please try again.', this.systemLang)}`}, obj.callback);
				});
		}
	}

	//Save token to file system
	_saveToken() {
		if (!this.config.NewOAuthMethode) return;
		const tokenData = {
			access_token: this.globalNetatmo_AccessToken,
			refresh_token: this.globalRefreshToken,
			scope: this.scope,
			client_id: this.config.ClientId
		};
		try {
			fs.writeFileSync(`${this.dataDir}/tokens.json`, JSON.stringify(tokenData), 'utf8');
			this.log.debug(`Token saved: ${this.dataDir}/tokens.json`);
		} catch (err) {
			this.log.error(mytools.tl('Cannot write token file: ', this.systemLang)  +  err);
		}
	}

	//React on al subsribed fields
	/**
	  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	  * @param {ioBroker.Message} obj
	*/
	onMessage(obj) {
		if (typeof obj === 'object' && obj.command) {
			let local_command = obj.command;

			if (local_command.search(glob.APIRequest_switchhomeschedule) == 0) {
				local_command = glob.APIRequest_switchhomeschedule;
			}
			if (local_command.search(glob.APIRequest_setthermmode) == 0) {
				local_command = glob.APIRequest_setthermmode;
			}

			switch (local_command) {
				//Initiate API Request (Admin Tab)
				case glob.APIRequest_setthermmode:
				case glob.APIRequest_switchhomeschedule:
					try {
						this.setState(this._getDP([this.globalAPIChannel, local_command, obj.command]), true, false);
					} catch(e) {
						//Error
					}
					break;

				//Rename valve (Admin Tab)
				case glob.ModifyDeviceObject:
					this._renameValve(obj.from, obj.command, obj.message);
					break;

				//Set Home Mode (Admin Tab)
				case glob.HomeMode:
					if (obj.callback) {
						let setData = {};
						setData = obj.message;
						this.setState(this._getDP([setData.folder, glob.Channel_settings, glob.Trigger_SetHome]), true, false);

						const myMessages = [];
						const msgtxt = mytools.tl('Mode set to home mode!', this.systemLang);
						myMessages.push(Object.assign({}, {msgtxt: msgtxt} ));

						this.sendTo(obj.from, obj.command, myMessages, obj.callback);
					}
					break;

				//Save changes (Admin Tab)
				case glob.ApplyChanges:
					if (obj.callback) {
						this.applySingleAPIRequest(glob.APIRequest_setroomthermpoint, glob.APIRequest_setroomthermpoint_manual, mytools.tl('changed manually', this.systemLang) );
						const myMessages = [];
						const msgtxt = mytools.tl('Changes are saved now!', this.systemLang);
						myMessages.push(Object.assign({}, {msgtxt: msgtxt} ));

						this.sendTo(obj.from, obj.command, myMessages, obj.callback);
					}
					break;

				//Save changed temperatures (Admin Tab)
				case glob.SaveTemperature:
					if (obj.callback) {
						let setData = {};
						setData = obj.message;
						const myMessages = [];
						let msgtxt = '';
						try {
							this.setState(setData.datapoint, setData.temp, false);

							msgtxt = mytools.tl('Room temperature changed to ', this.systemLang) + Number(setData.temp);
							myMessages.push(Object.assign({}, {msgtxt: msgtxt} ));
						} catch(e) {
							msgtxt = mytools.tl('Could not change room temperature!', this.systemLang);
							myMessages.push(Object.assign({}, {msgtxt: msgtxt} ));
						}
						this.sendTo(obj.from, obj.command, myMessages, obj.callback);
					}
					break;

				//Start homesdata API Request (Admin Tab)
				case glob.GetHomesdata:
					if (obj.callback) {
						this.RefreshWholeStructure(false);

						const myMessages = [];
						const msgtxt = mytools.tl('Start refresh request', this.systemLang);
						myMessages.push(Object.assign({}, {msgtxt: msgtxt} ));
						this.sendTo(obj.from, obj.command, myMessages, obj.callback);
					}
					break;

				//Get valves (Admin Tab)
				case glob.GetValves:
					if (obj.callback) {
						this._getAllAPIRequests(glob.Channel_switchhomeschedule, glob.APIRequest_switchhomeschedule, {})
							// eslint-disable-next-line no-unused-vars
							.then(MySchedules => {
								this._getAllAPIRequests(glob.Channel_setthermmode, glob.APIRequest_setthermmode, glob.List_thermmode)
									.then(myActiveModes => {
										this._getActiveSchedule()
											.then(myActiveSchedule => {
												this._getActiveThermMode(glob.List_thermmode)
													.then(myActiveThermMode => {
														this._getAllValves(obj, MySchedules, myActiveSchedule, myActiveModes, myActiveThermMode);
													})
													.catch(() => {
													});
											})
											.catch(() => {
											});
									})
									.catch(() => {
									});
							})
							.catch(() => {
								//error during searching for rooms);
							});
					}
					break;

				//Get Telegram user
				case glob.NotificationTelegramUser:
					if (obj.callback) {
						try {
							// @ts-ignore
							const inst = (obj.message && obj.message.config.instance) ? obj.message.config.instance : this.config.telegramInstance;
							if (inst === '') {
								this.sendTo(obj.from, obj.command, [{label: 'All Receiver', value: 'allTelegramUsers'}], obj.callback);
							} else {
								this.getForeignState(inst + '.communicate.users', (err, state) => {
									err && this.log.error(err.message);
									if (state && state.val) {
										// @ts-ignore
										const userList = JSON.parse(state.val);
										try {
											const UserArray = [{label: 'All Receiver', value: 'allTelegramUsers'}];
											for (const i in userList) {
												UserArray.push({label: userList[i].firstName, value: userList[i].userName});
											}
											this.sendTo(obj.from, obj.command, UserArray, obj.callback);
										} catch (err) {
											// @ts-ignore
											err && this.log.error(err);
											this.log.error(mytools.tl('Cannot parse stored user IDs from Telegram!', this.systemLang));
										}
									}
								});
							}
						} catch (e) {
							this.sendTo(obj.from, obj.command, [{label: 'All Receiver', value: 'allTelegramUsers'}], obj.callback);
						}
					}
					break;

				//Get all instances for diferent notification services
				case glob.NotificationTelegram:
				case glob.NotificationPushover:
				case glob.NotificationWhatsapp:
				case glob.NotificationEmail:
					if (obj.callback) {
						try {
							// @ts-ignore
							this.getObjectView('system', 'instance', {startkey: 'system.adapter.' + obj.command + glob.dot, endkey: 'system.adapter.' + obj.command + '.\u9999'}, (err, instances) =>
							{
								if (instances && instances.rows) {
									this.sendTo(obj.from, obj.command, instances.rows.map(row =>({label: row.id.replace('system.adapter.',''), value: row.id.replace('system.adapter.','')})), obj.callback);
								}
								else
									this.sendTo(obj.from, obj.command, [{label: 'Not available', value: ''}], obj.callback);
							});
						} catch (e) {
							this.sendTo(obj.from, obj.command, [{label: 'Not available', value: ''}], obj.callback);
						}
					}
					break;

				//Get starter link for OAuth2
				case glob.GetOAuthStartLink: {

					let auth_args = {};
					// @ts-ignore
					auth_args = obj.message;

					this.log.debug(mytools.tl('Received OAuth start message: ', this.systemLang) + JSON.stringify(auth_args));
					auth_args.scope = glob.OAuthScope;
					if (!this.config.ClientId || !this.config.ClientSecretID) {
						this.log.error('*** Adapter deactivated, missing adaper configuration !!! ***');
						return;
					}
					if (!this.config.ClientId || !this.config.ClientSecretID) {
						if (this.config.ClientId || this.config.ClientSecretID) {
							this.log.error('*** Adapter deactivated, missing adaper configuration !!! ***');
							return;
						}
					}
					auth_args.ClientId = this.config.ClientId;
					auth_args.client_secret = this.config.ClientSecretID;

					if (!auth_args.redirect_uri_base.endsWith('/')) auth_args.redirect_uri_base += '/';
					auth_args.redirect_uri = `${auth_args.redirect_uri_base}oauth2_callbacks/${this.namespace}/`;
					delete auth_args.redirect_uri_base;

					this.log.debug(mytools.tl('Get OAuth start link data: ', this.systemLang) + JSON.stringify(auth_args));
					const redirectData = this._getOAuth2AuthenticateStartLink(auth_args);
					if (redirectData != null) {
						this.storedOAuthData[redirectData.state] = auth_args;
						this.log.debug(mytools.tl('Get OAuth start link: ', this.systemLang) + redirectData.url);
						obj.callback && this.sendTo(obj.from, obj.command, {openUrl: redirectData.url}, obj.callback);
					}
					break;
				}

				//Callback from OAuth2
				case glob.GetOAuthCallback: {
					let auth_args = {};
					auth_args = obj.message;
					this.log.debug(`OAuthRedirectReceived: ${JSON.stringify(auth_args)}`);

					if (!auth_args.state || !auth_args.code) {
						this.log.warn(mytools.tl('Error on OAuth callback: ', this.systemLang) + JSON.stringify(auth_args));
						if (auth_args.error) {
							obj.callback && this.sendTo(obj.from, obj.command, {error: `Netatmo error: ${auth_args.error}. Please try again.`}, obj.callback);
						} else {
							obj.callback && this.sendTo(obj.from, obj.command, {error: `Netatmo invalid response: ${JSON.stringify(auth_args)}. Please try again.`}, obj.callback);
						}
						return;
					}

					//Start authentication request
					this._authenticate(auth_args, obj);
					break;
				}
			}
		}
	}
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
