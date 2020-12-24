'use strict';

// Load modules
const utils = require('@iobroker/adapter-core');
const fetch = require('fetch');

//Define global constants

// Netatmo API requests
const Netatmo_TokenRequest_URL            = 'https://api.netatmo.net/oauth2/token';
const Netatmo_APIrequest_URL              = 'https://api.netatmo.com/api/';

const APIRequest_homesdata                = 'homesdata';
const APIRequest_homesdata_NAPlug         = 'NAPlug';

const APIRequest_homestatus               = 'homestatus';

const APIRequest_setroomthermpoint        = 'setroomthermpoint';
const APIRequest_setroomthermpoint_manual = 'manual';

const APIRequest_setthermmode             = 'setthermmode';
const APIRequest_setthermmode_schedule    = 'schedule';
const APIRequest_setthermmode_hg          = 'hg';
const APIRequest_setthermmode_away        = 'away';

const APIRequest_switchhomeschedule       = 'switchhomeschedule';

// Energy APP Trigger
const APIRequestsDevice                   = 'energyAPP';
const Trigger_applychanges								= 'applychanges';
const Trigger_SetTemp                     = 'SetTemp';

// Energy APP Channels / States
const Channel_APIRequests									= 'APIRequests';
const Channel_homesdata										= 'homesdata';
const Channel_homestatus									= 'homestatus';
const Channel_setthermmode					  		= 'setthermmode';
const Channel_status											= 'status';
const Channel_trigger											= 'trigger';
const Channel_settings										= 'settings';
const Channel_modulestatus								= 'modulestatus';
const Channel_switchhomeschedule					= 'switchhomeschedule';
const State_TempChanged										= 'TempChanged';
const State_therm_setpoint_temperature		= 'therm_setpoint_temperature';

// Timer
const adapterIntervals = {};

// Main Class
class NetatmoEnergy extends utils.Adapter {
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'netatmo-energy',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		//this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
		this.globalRefreshToken = '';
		this.globalNetatmo_ExpiresIn = 0;
		this.globalNetatmo_AccessToken = '';
		this.globalScheduleObjects = {};
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
		//Passwort decryption
		this.getForeignObject('system.config', (err, obj) => {
			if (!this.supportsFeature() || !this.supportsFeature('ADAPTER_AUTO_DECRYPT_NATIVE')) {
				if (obj && obj.native && obj.native.secret) {
					//noinspection JSUnresolvedVariable
					this.config.Password = this.decrypt(obj.native.secret, this.config.Password);
				}
				else {
					//noinspection JSUnresolvedVariable
					this.config.Password = this.decrypt('Zgfr56gFe87jJOM', this.config.Password);
				}
			}
			this.startAdapter();
		});

	}
	// Start initialization
	async startAdapter() {
		// Set Intervall
		const speed = this.config.refreshstates;
		const thattimer = this;
		const updateAPIStatus = function () {
			thattimer.log.debug('API Request homestatus sent to API each ' + thattimer.config.refreshstates + 'sec');
			thattimer.sendAPIRequest(APIRequest_homestatus, '',true);
		};
		if (speed && speed > 0) {
			this.log.debug('Refresh homestatus interval ' + this.config.refreshstates * 1000);
			adapterIntervals.updateAPI = setInterval(updateAPIStatus, speed * 1000);
		}

		// Initialize adapter
		await this.createenergyAPP();
		await this.sendAPIRequest(APIRequest_homesdata, '&gateway_types=' + APIRequest_homesdata_NAPlug,false);
		await this.sendAPIRequest(APIRequest_homestatus, '',false);
	}

	// Create APP Requests device
	async createenergyAPP() {
		// Device energyAPP
		await this.createMyDevice(this.name + '.' + this.instance + '.' + APIRequestsDevice, 'Netatmo Energy APP');
		// Channel APIRequests
		await this.createMyChannel(this.name + '.' + this.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests, 'Requests for Netatmo Energy API');

		// Channel setthomesdata
		await this.createMyChannel(this.name + '.' + this.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests + '.' + Channel_homesdata, 'API homesdata');
		await this.CreateNetatmoStructure(this.name + '.' + this.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests + '.' + Channel_homesdata + '.'+ APIRequest_homesdata + '_' + APIRequest_homesdata_NAPlug, 'homesdata_NAPlug', false,true,'button',true,true,false);
		await this.subscribeStates(this.name + '.' + this.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests + '.' + Channel_homesdata + '.' + APIRequest_homesdata + '_' + APIRequest_homesdata_NAPlug);

		// Channel setthomestatus
		await this.createMyChannel(this.name + '.' + this.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests + '.' + Channel_homestatus, 'API homesstatus');
		await this.CreateNetatmoStructure(this.name + '.' + this.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests + '.' + Channel_homestatus + '.' + APIRequest_homestatus, 'homesstatus', false,true,'button',true,true,false);
		await this.subscribeStates(this.name + '.' + this.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests + '.' + Channel_homestatus + '.' + APIRequest_homestatus);

		// Channel setthermmode
		await this.createMyChannel(this.name + '.' + this.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests + '.' + Channel_setthermmode, 'API setthermmode');
		await this.CreateNetatmoStructure(this.name + '.' + this.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests + '.' + Channel_setthermmode + '.'+ APIRequest_setthermmode + '_' + APIRequest_setthermmode_schedule, 'SetThermMode_schedule', false,true,'button',true,true,false);
		await this.subscribeStates(this.name + '.' + this.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests + '.' + Channel_setthermmode + '.' + APIRequest_setthermmode + '_' + APIRequest_setthermmode_schedule);
		await this.CreateNetatmoStructure(this.name + '.' + this.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests + '.' + Channel_setthermmode + '.' + APIRequest_setthermmode + '_' + APIRequest_setthermmode_hg, 'SetThermMode_hg', false,true,'button',true,true,false);
		await this.subscribeStates(this.name + '.' + this.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests + '.' + Channel_setthermmode + '.' + APIRequest_setthermmode + '_' + APIRequest_setthermmode_hg);
		await this.CreateNetatmoStructure(this.name + '.' + this.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests + '.' + Channel_setthermmode + '.' + APIRequest_setthermmode + '_' + APIRequest_setthermmode_away, 'SetThermMode_away', false,true,'button',true,true,false);
		await this.subscribeStates(this.name + '.' + this.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests + '.' + Channel_setthermmode + '.' + APIRequest_setthermmode + '_' + APIRequest_setthermmode_away);

		// Channel trigger
		await this.createMyChannel(this.name + '.' + this.instance + '.' + APIRequestsDevice + '.' + Channel_trigger, 'API setroomthermpoint');
		await this.CreateNetatmoStructure(this.name + '.' + this.instance + '.' + APIRequestsDevice + '.' + Channel_trigger + '.' + Trigger_applychanges, 'trigger to send changes to Netatmo Cloud', false,true,'button',true,true,false);
		await this.subscribeStates(this.name + '.' + this.instance + '.' + APIRequestsDevice + '.' + Channel_trigger + '.' + Trigger_applychanges);
	}

	// Send API inkluding tokenrequest
	async sendAPIRequest(APIRequest, setpayload, norefresh) {
		let globalresponse = null;
		const Netatmo_Path = this.name + '.' + this.instance;

		//Send Token request to API
		this.log.info('Start Token-request: ' + APIRequest + ' ' + setpayload);
		await this.getToken(this.config.HomeId,this.config.ClientId,this.config.ClientSecretID,this.config.User,this.config.Password)
			.then(tokenvalues => {
				this.globalNetatmo_AccessToken = tokenvalues.access_token;
				this.globalNetatmo_ExpiresIn = tokenvalues.expires_in;
				this.globalRefreshToken = tokenvalues.refresh_token;
				this.log.debug('Token OK: ' + this.globalNetatmo_AccessToken);
			})
			.catch(error => {
				this.globalNetatmo_AccessToken = '';
				this.globalRefreshToken = '';
				this.globalNetatmo_ExpiresIn = 0;
				this.log.debug('Did not get a tokencode: ' + error.error + ': ' + error.error_description);
			});

		// only send API request if we get the token
		if (this.globalNetatmo_AccessToken != '' || this.globalNetatmo_AccessToken) {
			this.log.info('Start API-request: ' + APIRequest);
			await this.getAPIRequest(APIRequest,setpayload)
				.then(response => {
					globalresponse = response;
				})
				.catch(error => {
					this.log.info('API request not OK: ' + error.error + ': ' + error.error_description);
				});
			if (globalresponse) {
				if (APIRequest == APIRequest_homesdata || APIRequest == APIRequest_homestatus) {
					await this.GetValuesFromNetatmo(APIRequest,globalresponse,'','',Netatmo_Path, norefresh);
					if (APIRequest == APIRequest_homestatus) {
						await this.searchSchedule();
					}
				} else {
					this.log.debug('API changes applied' +  APIRequest);
				}
			}
			this.log.debug('API request finished' );
		}
	}

	//get token from Netatmo
	getToken(HomeId,ClientId,ClientSecretID,User,Password) {
		this.globalNetatmo_AccessToken = '';
		let payload = '';

		if (!this.globalRefreshToken) {
			payload = 'grant_type=password&client_id=' + ClientId + '&client_secret=' + ClientSecretID + '&username=' + User + '&password=' + Password + '&scope=read_thermostat write_thermostat';
		} else {
			payload  = 'grant_type=refresh_token&refresh_token=' + this.globalRefreshToken + '&client_id=' + ClientId + '&client_secret=' + ClientSecretID;
		}
		return this.myFetch(Netatmo_TokenRequest_URL,payload);
	}

	//API request main routine
	getAPIRequest(NetatmoRequest, extend_payload) {
		const payload = 'access_token=' + this.globalNetatmo_AccessToken + '&home_id=' + this.config.HomeId + extend_payload;
		this.log.debug('Request: ' + Netatmo_APIrequest_URL + NetatmoRequest + '?' + payload);
		return this.myFetch(Netatmo_APIrequest_URL + NetatmoRequest, payload);
	}

	//Send Changes to API and create API status request
	async ApplySingleAPIRequest (NetatmoRequest,mode) {
		const that = this;
		await this.ApplyAPIRequest(NetatmoRequest,mode)
			.then(success => {
				if (that.config.getchangesimmediately && success) {
					that.sendAPIRequest(APIRequest_homestatus, '',false);
				}
			});
	}

	//Send Changes to API
	async ApplyAPIRequest (NetatmoRequest,mode) {
		const that = this;
		let changesmade = false;

		const ApplyPrommise = new Promise(
			function(resolve,reject) {
				const searchstring = 'rooms\\.\\d+\\.' + Channel_settings + '\\.' + State_TempChanged + '';
				const createAPIasync = async function(NetatmoRequest, mode) {
					await that.sendAPIRequest(NetatmoRequest, mode, false);
					resolve(true);
				};

				switch (NetatmoRequest) {
					case APIRequest_setroomthermpoint:
						that.getStates(that.name + '.' + that.instance + '.homes.*.rooms.*.' + Channel_settings + '.' + State_TempChanged,async function(error, states) {
							for(const id in states) {
								const adapterstates = await that.getStateAsync(id);

								if (id.search(searchstring) >= 0) {
									if (adapterstates && adapterstates.val === true) {
										await that.setState(id, false, true);

										const actPath = id.substring(0,id.lastIndexOf('.'));
										const actParent = actPath.substring(0,actPath.lastIndexOf('.'));
										const newTemp = await that.getStateAsync(actPath + '.' + Trigger_SetTemp);
										if (newTemp) {
											if (await that.applyactualtemp(newTemp,actPath,actParent,NetatmoRequest,mode)) {
												changesmade = true;
											}
										}
									}
								}
								if (changesmade) {
									resolve(true);
								} else {
									reject(false);
								}
							}
						});
						break;

					case APIRequest_setthermmode:
						createAPIasync(NetatmoRequest, '&mode=' + mode);
						break;

					case APIRequest_switchhomeschedule:
						createAPIasync(NetatmoRequest, '&schedule_id=' + mode);
						break;
				}
			});
		return  ApplyPrommise;
	}

	//Apply single request to API for temp
	async applysingleactualtemp(newTemp,actPath,actParent,NetatmoRequest,mode) {
		await this.applyactualtemp(newTemp,actPath,actParent,NetatmoRequest,mode);
		if (this.config.getchangesimmediately) {
			await this.sendAPIRequestasync(APIRequest_homestatus, '',false);
		}
	}

	//Apply request to API for temp
	async applyactualtemp(newTemp,actPath,actParent,NetatmoRequest,mode) {
		const roomnumber = await this.getStateAsync(actParent + '.id');
		const actTemp = await this.getStateAsync(actParent + '.' + Channel_status + '.' + State_therm_setpoint_temperature);

		if (roomnumber && actTemp && actTemp.val != newTemp.val) {
			const extend_payload = '&room_id=' + roomnumber.val + '&mode=' + mode + '&temp=' + newTemp.val;
			await this.sendAPIRequest(NetatmoRequest, extend_payload,false);
			return true;
		} else {
			return false;
		}
	}

	//fetch API request
	myFetch(url, payload) {
		const that = this;
		const promiseobject = new Promise(

			function(resolve,reject) {
				if (!url) {
					reject({error:'Invalid Parameter',error_description:'Did not get url or payload!'});
					return;
				}
				fetch.fetchUrl(url, {
					method: 'POST',
					headers: {
						'Content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
					},
					payload: payload
				},
				function(error, meta, body) {
					that.log.debug('Netatmo API status:' + meta.status);
					if (meta.status == 200 ) {
						resolve(JSON.parse(body));
					} else {
						reject(JSON.parse(body));
					}
				});
			});
		return  promiseobject;
	}

	//Parse values from Netatmo response
	async GetValuesFromNetatmo(API_Request,obj,obj_name,obj_selected,Netatmo_Path,norefresh) {
		const relevantTag = 'home\\.\\b(?:rooms|modules|schedules)\\.\\d+\\.id';
		let myobj_selected = obj_name;

		if (this.NetatmoTags(obj_name) === true) {
			if (API_Request === APIRequest_homesdata) {
				await this.createMyChannel(Netatmo_Path, myobj_selected);
			}
		} else {
			myobj_selected = obj_selected;
		}

		for(const object_name in obj) {
			if (API_Request === APIRequest_homestatus) {
				const fullname = this.getPrefixPath(Netatmo_Path + '.') + object_name;
				if (fullname.search(relevantTag) >= 0) {
					await this.SearchRoom(obj[object_name], obj,norefresh);
				}
			}
			if(obj[object_name] instanceof Object) {
				if (this.NetatmoTags(object_name) === true) {
					await this.GetValuesFromNetatmo(API_Request,obj[object_name],object_name,myobj_selected,this.getPrefixPath(Netatmo_Path + '.') + object_name,norefresh);
				} else {
					await this.GetValuesFromNetatmo(API_Request,obj[object_name],object_name,myobj_selected,Netatmo_Path,norefresh);
				}
			} else {
				if (this.NetatmoTagsDetail(myobj_selected) === true && API_Request === APIRequest_homesdata) {
					await this.CreateNetatmoStructure(this.getPrefixPath(Netatmo_Path + '.') + object_name, object_name, obj[object_name],true,'',false,true,false);
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

		//this.log.debug('Delete Channel: ' + that.name + '.' + that.instance + '.' + APIRequestsDevice + ' - ' + Channel_switchhomeschedule);
		await that.deleteChannel(that.name + '.' + that.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests, Channel_switchhomeschedule);
		this.globalScheduleObjects = {};
		//schedules
		this.getStates(that.name + '.' + that.instance + '.homes.*.schedules.*',async function(error, states) {
			await that.createMyChannel(that.name + '.' + that.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests + '.' + Channel_switchhomeschedule, 'API switchhomeschedule');
			for(const id in states) {
				//that.log.debug('Found Schedule: ' + id);
				if (id.search(searchSchedules) >= 0) {
					schedule_id = await that.getStateAsync(id);
					//that.log.debug('Found Schedule_ID: ' + schedule_id.val);
					if (schedule_id) {
						schedule_name = await that.getStateAsync(id.substring(0,id.length - 3) + '.name');
						if (schedule_name) {
							//that.log.debug('Found Schedule_NAME: ' + schedule_name.val);
							that.globalScheduleObjects[that.name + '.' + that.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests + '.' + Channel_switchhomeschedule + '.' + APIRequest_switchhomeschedule + '_' + schedule_name.val.replace(/[\s.]/g, '_')] = schedule_id.val;
							await that.CreateNetatmoStructure(that.name + '.' + that.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests + '.' + Channel_switchhomeschedule + '.' + APIRequest_switchhomeschedule + '_' + schedule_name.val.replace(/[\s.]/g, '_'), schedule_name.val, false,true,'button',true,true,false);
							await that.subscribeStates(that.name + '.' + that.instance + '.' + APIRequestsDevice + '.' + Channel_APIRequests + '.' + + '.' + Channel_APIRequests + '.' + APIRequest_switchhomeschedule + '_' + schedule_name.val.replace(/[\s.]/g, '_'));
						}
					}
				}
			}
		});
	}

	// insert homestatus in homedata-rooms
	async SearchRoom(statevalue,ObjStatus,norefresh) {
		const searchRooms     = 'homes\\.\\d+\\.rooms\\.\\d+\\.id';
		const searchModules   = 'homes\\.\\d+\\.modules\\.\\d+\\.id';
		const that = this;
		let adapterstates = null;
		//status
		this.getStates(this.name + '.' + this.instance + '.homes.*.rooms.*',async function(error, states) {
			for(const id in states) {
				if (id.search(searchRooms) >= 0) {
					adapterstates = await that.getStateAsync(id);
					if (adapterstates && adapterstates.val == statevalue) {
						//that.log.debug('Found room: ' + adapterstates.val + ' = ' + statevalue);
						const myTargetName = id.substring(0,id.length - 3);
						await that.createMyChannel(myTargetName + '.' + Channel_status, 'Device status');

						for(const objstat_name in ObjStatus) {
							if(!(ObjStatus[objstat_name] instanceof Object) && objstat_name != 'id') {
								await that.CreateNetatmoStructure(myTargetName + '.' + Channel_status + '.' + objstat_name, objstat_name, ObjStatus[objstat_name],true,'',false,true,false);
								switch(objstat_name) {
									case State_therm_setpoint_temperature:
										await that.createMyChannel(myTargetName + '.' + Channel_settings, 'Change settings');
										await that.CreateNetatmoStructure(myTargetName + '.' + Channel_settings + '.' + Trigger_SetTemp, 'set temperature manually', ObjStatus[objstat_name],true,'value.temperature',true,true,norefresh);
										await that.subscribeStates(myTargetName + '.' + Channel_settings + '.' + Trigger_SetTemp);
										await that.CreateNetatmoStructure(myTargetName + '.' + Channel_settings + '.' + State_TempChanged, 'temperature manually changed', false,true,'indicator',false,true,norefresh);
										break;
								}
							}
						}
						break;
					}
				}
			}
		});

		//modules
		this.getStates(this.name + '.' + this.instance + '.homes.*.modules.*',async function(error, states) {
			for(const id in states) {
				if (id.search(searchModules) >= 0) {
					adapterstates = await that.getStateAsync(id);
					if (adapterstates && adapterstates.val == statevalue) {
						//that.log.debug('Found module: ' + adapterstates.val + ' = ' + statevalue);
						const myTargetName = id.substring(0,id.length - 3);
						await that.createMyChannel(myTargetName + '.' + Channel_modulestatus, 'Module status');

						for(const objstat_name in ObjStatus) {
							if(!(ObjStatus[objstat_name] instanceof Object) && objstat_name != 'id') {
								await that.CreateNetatmoStructure(myTargetName + '.' + Channel_modulestatus + '.' + objstat_name, objstat_name, ObjStatus[objstat_name],true,'',false,true,false);
							}
						}
						break;
					}
				}
			}
		});
	}

	//insert not relevant tags
	NetatmoTags(obj_name) {
		switch(obj_name) {
			case 'body':
				return false;
			case '':
				return false;
			default:
				return true;
		}
	}

	//inser not relevant tags for details
	NetatmoTagsDetail(obj_name) {
		switch(obj_name) {
			case 'body':
				return false;
			default:
				return true;
		}
	}

	//Delete leading dots
	getPrefixPath(path) {
		return path.replace(/^\.+/, '');
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
		this.log.info('MyChannel created: ' + path);
	}

	//dynamic creation of datapoints
	async CreateNetatmoStructure (id,object_name,value, ack, role, write, read, norefresh) {
		const regex = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i;

		if (!role) {
			if (object_name.indexOf('temperature') >= 0 || object_name.indexOf('temp') >= 0) {
				role = 'level.temperature';
			} else if (object_name.indexOf('timezone') >= 0) {
				role = 'state';
			} else if (object_name.indexOf('_date') >= 0) {
				role = 'value.time';
			} else if (object_name.indexOf('time') >= 0) {
				role = 'value.time';
			} else if (regex.test(value)) {
				role = 'info.mac';
			} else if (typeof value === 'boolean') {
				role = 'indicator';
			} else if (typeof value === 'string') {
				role = 'text';
			} else {
				role = 'state';
			}
		}

		await this.setObjectNotExistsAsync(id, {
			type: 'state',
			common: {
				name: object_name,
				role: role,
				type: typeof value,
				read: read,
				write: write
			},
			MyID: '123',
			native: {},
		});
		if (!norefresh) {
			await this.setState(id, value, ack);
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

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			Object.keys(adapterIntervals).forEach(interval => clearInterval(adapterIntervals[interval]));
			this.log.debug('cleaned everything up...');
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
						// Get Structure of your home
						case APIRequest_homesdata + '_' + APIRequest_homesdata_NAPlug:
							if (state.val === false) {
								break;
							}
							this.log.debug('API Request homesdata - NAPlug: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.sendAPIRequest(APIRequest_homesdata, '&gateway_types=' + APIRequest_homesdata_NAPlug,false);
							break;

						// get actual homestatus
						case APIRequest_homestatus:
							if (state.val === false) {
								break;
							}
							this.log.debug('API Request homestatus: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.sendAPIRequest(APIRequest_homestatus, '',false);
							break;

						// Set Therm Mode for Netatmo Energy
						case Trigger_SetTemp:
							if (!isNaN(state.val)) {
								if (this.config.applyimmediately) {
									//this.log.debug('SetTemp: Call API directly');
									this.applysingleactualtemp(state,actPath,actParent,APIRequest_setroomthermpoint,APIRequest_setroomthermpoint_manual);
								} else {
									//this.log.debug('SetTemp: Set TempChanged manually');
									this.compareValues(actParent + '.' + Channel_status + '.' + State_therm_setpoint_temperature, state, actPath + '.' + State_TempChanged);
								}
							} else {
								this.log.debug('SetTemp: No Number ' + state.val);
							}
							break;

						// Apply all changes to Netatmo Cloud
						case Trigger_applychanges:
							if (state.val === false) {
								break;
							}
							this.log.debug('API Request setthermpoint - manual: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.ApplySingleAPIRequest(APIRequest_setroomthermpoint, APIRequest_setroomthermpoint_manual);
							break;

						// Set thermmode for Netatmo Energy
						case APIRequest_setthermmode + '_' + APIRequest_setthermmode_schedule:
							if (state.val === false) {
								break;
							}
							this.log.debug('API Request setthermmode - schedule: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.ApplySingleAPIRequest(APIRequest_setthermmode, APIRequest_setthermmode_schedule);
							break;

						// Set thermmode for Netatmo Energy
						case APIRequest_setthermmode + '_' + APIRequest_setthermmode_hg:
							if (state.val === false) {
								break;
							}
							this.log.debug('API Request setthermmode - hg: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.ApplySingleAPIRequest(APIRequest_setthermmode, APIRequest_setthermmode_hg);
							break;

						// Set thermmode for Netatmo Energy
						case APIRequest_setthermmode + '_' + APIRequest_setthermmode_away:
							if (state.val === false) {
								break;
							}
							this.log.debug('API Request setthermmode - away: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.ApplySingleAPIRequest(APIRequest_setthermmode, APIRequest_setthermmode_away);
							break;
					}

					if (actState.search(APIRequest_switchhomeschedule) == 0) {
						if (state.val === true) {
							this.setState(id, false, true);
							this.log.debug('API Request swithhomeschedule - ' + this.globalScheduleObjects[id]);
							this.ApplySingleAPIRequest(APIRequest_switchhomeschedule, this.globalScheduleObjects[id]);
						}
					}
				}
			}
		} else {
			// The state was deleted
			//this.log.info(`state ${id} deleted`);
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
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new NetatmoEnergy(options);
} else {
	// otherwise start the instance directly
	new NetatmoEnergy();
}
