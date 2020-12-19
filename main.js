'use strict';

// Load modules
const utils = require('@iobroker/adapter-core');
const fetch = require('fetch');

//Define global constants
const Netatmo_TokenRequest_URL            = 'https://api.netatmo.net/oauth2/token';
const Netatmo_APIrequest_URL              = 'https://api.netatmo.com/api/';

const APIRequest_homesdata                = 'homesdata';
const APIRequest_homesdata_NAPlug         = 'NAPlug';

const APIRequest_homestatus               = 'homestatus';

const APIRequest_setroomthermpoint        = 'setroomthermpoint';
const APIRequest_setroomthermpoint_manual = 'manual';

const APIRequest_setthermmode_schedule    = 'schedule';
const APIRequest_setthermmode_hg          = 'hg';
const APIRequest_setthermmode_away        = 'away';

const APIRequest_setthermmode             = 'setthermmode';


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
		this.changesmade = false;
	}

	// Is called when databases are connected and adapter received configuration
	async onReady() {
		// Initialize adapter
		await this.createSpecialRequests();
		this.log.info('API Request homesdata started');
		await this.sendAPIRequest(APIRequest_homesdata, '&gateway_types=' + APIRequest_homesdata_NAPlug);
		this.log.info('API Request homestatus started');
		await this.sendAPIRequest(APIRequest_homestatus, '');
	}

	// Create Request Folder
	async createSpecialRequests() {
		await this.createMyChannel(this.name + '.' + this.instance + '.SpecialRequests', 'Requests für Netatmo Energy API');
		await this.CreateNetatmoStructure(this.name + '.' + this.instance + '.SpecialRequests.applychanges', 'Änderungen in die Netatmo Cloud übertragen', false,true,'button',true,false);
		this.subscribeStates(this.name + '.' + this.instance + '.SpecialRequests.applychanges');
		await this.CreateNetatmoStructure(this.name + '.' + this.instance + '.SpecialRequests.'+ APIRequest_homesdata + '_' + APIRequest_homesdata_NAPlug, 'homesdata_NAPlug', false,true,'button',true,false);
		this.subscribeStates(this.name + '.' + this.instance + '.SpecialRequests.'+ APIRequest_homesdata + '_' + APIRequest_homesdata_NAPlug);
		await this.CreateNetatmoStructure(this.name + '.' + this.instance + '.SpecialRequests.'+ APIRequest_homestatus, 'homesstatus', false,true,'button',true,false);
		this.subscribeStates(this.name + '.' + this.instance + '.SpecialRequests.'+ APIRequest_homestatus);
		await this.CreateNetatmoStructure(this.name + '.' + this.instance + '.SpecialRequests.'+ APIRequest_setthermmode + '_' + APIRequest_setthermmode_schedule, 'SetThermMode_schedule', false,true,'button',true,false);
		this.subscribeStates(this.name + '.' + this.instance + '.SpecialRequests.'+ APIRequest_setthermmode + '_' + APIRequest_setthermmode_schedule);
		await this.CreateNetatmoStructure(this.name + '.' + this.instance + '.SpecialRequests.'+ APIRequest_setthermmode + '_' + APIRequest_setthermmode_hg, 'SetThermMode_hg', false,true,'button',true,false);
		this.subscribeStates(this.name + '.' + this.instance + '.SpecialRequests.'+ APIRequest_setthermmode + '_' + APIRequest_setthermmode_hg);
		await this.CreateNetatmoStructure(this.name + '.' + this.instance + '.SpecialRequests.'+ APIRequest_setthermmode + '_' + APIRequest_setthermmode_away, 'SetThermMode_away', false,true,'button',true,false);
		this.subscribeStates(this.name + '.' + this.instance + '.SpecialRequests.'+ APIRequest_setthermmode + '_' + APIRequest_setthermmode_away);
	}

	// Send API inkluding tokenrequest
	async sendAPIRequest(APIRequest, setpayload) {
		let globalresponse = null;
		const Netatmo_Path = this.name + '.' + this.instance;

		this.log.info('API Request: ' + APIRequest + '?' + setpayload);
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
			this.log.debug('Start Request: ' + APIRequest);
			await this.getAPIRequest(APIRequest,setpayload)
				.then(response => {
					globalresponse = response;
				})
				.catch(error => {
					this.log.info('API request not OK: ' + error.error + ': ' + error.error_description);
				});
			if (globalresponse) {
				if (APIRequest == APIRequest_homesdata || APIRequest == APIRequest_homestatus) {
					await this.GetValuesFromNetatmo(APIRequest,globalresponse,'','',Netatmo_Path);
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
		return this.myFetch(Netatmo_APIrequest_URL + NetatmoRequest, payload);
	}
	//Send Changes to API and create API status request
	async ApplySingleAPIRequest (NetatmoRequest,mode) {
		this.changesmade = false;
		await this.ApplySinglePromiseAPIRequest (NetatmoRequest,mode);
		this.log.debug('Changes made 1: ' + this.config.getchangesimmediately + ' - ' + this.changesmade);
		if (this.config.getchangesimmediately && this.changesmade) {
			this.log.debug('Changes made 2: ' + this.config.getchangesimmediately + ' - ' + this.changesmade);
			await this.sendAPIRequest(APIRequest_homestatus, '');
		}
	}
	//Send Changes to API
	async ApplyAPIRequest (NetatmoRequest,mode) {
		const that = this;
		const searchstring = 'rooms\\.\\d+\\.settings\\.TempChanged';
		let extend_payload = '';

		switch (NetatmoRequest) {
			case APIRequest_setroomthermpoint:
				that.getStates(that.name + '.' + that.instance + '.homes.*.rooms.*.settings.TempChanged',async function(error, states) {
					for(const id in states) {
						const adapterstates = await that.getStateAsync(id);

						if (id.search(searchstring) >= 0) {
							if (adapterstates && adapterstates.val === true) {
								await that.setState(id, false, true);

								const actPath = id.substring(0,id.lastIndexOf('.'));
								const actParent = actPath.substring(0,actPath.lastIndexOf('.'));
								const newTemp = await that.getStateAsync(actPath + '.SetTemp');
								if (newTemp) {
									if (await that.applyactualtemp(newTemp,actPath,actParent,NetatmoRequest,mode)) {
										that.changesmade = true;
										that.log.debug('Change something: ' + that.changesmade);
									}
								}
							}
						}
					}
				});
				break;

			case APIRequest_setthermmode:
				that.changesmade = true;
				extend_payload = '&mode=' + mode;
				that.log.debug('Send API-: ' + NetatmoRequest + ' - ' + extend_payload);
				that.sendAPIRequest(NetatmoRequest, extend_payload);
				break;
		}
	}
	//Apply single request to API for temp
	async applysingleactualtemp(newTemp,actPath,actParent,NetatmoRequest,mode) {
		await this.applyactualtemp(newTemp,actPath,actParent,NetatmoRequest,mode);
		if (this.config.getchangesimmediately) {
			await this.sendAPIRequest(APIRequest_homestatus, '');
		}
	}
	//Apply request to API for temp
	async applyactualtemp(newTemp,actPath,actParent,NetatmoRequest,mode) {
		const roomnumber = await this.getStateAsync(actParent + '.id');
		const actTemp = await this.getStateAsync(actParent + '.status.therm_setpoint_temperature');

		//this.log.debug('Check act/new - Temp: ' + actTemp.val + ' - ' + newTemp.val);
		if (roomnumber && actTemp && actTemp.val != newTemp.val) {
			const extend_payload = '&room_id=' + roomnumber.val + '&mode=' + mode + '&temp=' + newTemp.val;
			await this.sendAPIRequest(NetatmoRequest, extend_payload);
			return true;
		} else {
			return false;
		}
	}
	//fetch API request
	myFetch(url, payload) {
		this.log.debug('Fetch-Request: ' + url + '?' + payload);

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
					that.log.debug('Netatmo API Status:' + meta.status);
					if (meta.status == 200 ) {
						resolve(JSON.parse(body));
					} else {
						reject(JSON.parse(body));
					}
				});
			});
		return  promiseobject;
	}
	//Parse values vrom Netatmo response
	async GetValuesFromNetatmo(API_Request,obj,obj_name,obj_selected,Netatmo_Path) {
		const relevantTag = 'home\\.\\b(?:rooms|modules)\\.\\d+\\.id';
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
					//this.log.debug('Found Tag: ' + object_name);
					await this.SearchRoom(obj[object_name], obj);
				}
			}
			if(obj[object_name] instanceof Object) {
				if (this.NetatmoTags(object_name) === true) {
					await this.GetValuesFromNetatmo(API_Request,obj[object_name],object_name,myobj_selected,this.getPrefixPath(Netatmo_Path + '.') + object_name);
				} else {
					await this.GetValuesFromNetatmo(API_Request,obj[object_name],object_name,myobj_selected,Netatmo_Path);
				}
			} else {
				if (this.NetatmoTagsDetail(myobj_selected) === true && API_Request === APIRequest_homesdata) {
					await this.CreateNetatmoStructure(this.getPrefixPath(Netatmo_Path + '.') + object_name, object_name, obj[object_name],true,'',false,true);
				}
			}
		}
	}
	// homestatus in himedata-Datenpunkte einfügen
	async SearchRoom(statevalue,ObjStatus) {
		const searchRooms = 'homes\\.\\d+\\.rooms\\.\\d+\\.id';
		const searchModules = 'homes\\.\\d+\\.modules\\.\\d+\\.id';
		const that = this;
		let adapterstates = null;

		this.getStates(this.name + '.' + this.instance + '.homes.*.rooms.*',async function(error, states) {
			for(const id in states) {
				//that.log.debug('Search Objects: ' + id + ' - ' + searchRooms);

				if (id.search(searchRooms) >= 0) {
					adapterstates = await that.getStateAsync(id);
					if (adapterstates && adapterstates.val == statevalue) {
						that.log.debug('Found room: ' + adapterstates.val + ' = ' + statevalue);
						const myTargetName = id.substring(0,id.length - 3);
						await that.createMyChannel(myTargetName + '.status', 'Gerätestatus');

						for(const objstat_name in ObjStatus) {
							if(!(ObjStatus[objstat_name] instanceof Object) && objstat_name != 'id') {
								that.log.debug('Found homestatus room ids: ' + objstat_name + ' / ' + ObjStatus[objstat_name]);
								await that.CreateNetatmoStructure(myTargetName + '.status.' + objstat_name, objstat_name, ObjStatus[objstat_name],true,'',false,true);
								switch(objstat_name) {
									case 'therm_setpoint_temperature':
										await that.createMyChannel(myTargetName + '.settings', 'Einstellungen verändern');
										await that.CreateNetatmoStructure(myTargetName + '.settings.SetTemp', 'Temparatur manuell setzen', ObjStatus[objstat_name],true,'value.temperature',true,true);
										that.subscribeStates(myTargetName + '.settings.SetTemp');
										await that.CreateNetatmoStructure(myTargetName + '.settings.TempChanged', 'Temparatur manuell geändert', false,true,'indicator',false,true);
										break;
								}
							}
						}
						break;
					}
				}
			}
		});

		this.getStates(this.name + '.' + this.instance + '.homes.*.modules.*',async function(error, states) {
			for(const id in states) {
				//that.log.debug('Search Objects: ' + id + ' - ' + searchModules);

				if (id.search(searchModules) >= 0) {
					adapterstates = await that.getStateAsync(id);
					if (adapterstates && adapterstates.val == statevalue) {
						that.log.debug('Found module: ' + adapterstates.val + ' = ' + statevalue);
						const myTargetName = id.substring(0,id.length - 3);
						await that.createMyChannel(myTargetName + '.modulestatus', 'Gerätestatus');

						for(const objstat_name in ObjStatus) {
							if(!(ObjStatus[objstat_name] instanceof Object) && objstat_name != 'id') {
								that.log.debug('Found homestatus module ids: ' + objstat_name + ' / ' + ObjStatus[objstat_name]);
								await that.CreateNetatmoStructure(myTargetName + '.modulestatus.' + objstat_name, objstat_name, ObjStatus[objstat_name],true,'',false,true);
							}
						}
						break;
					}
				}
			}
		});
	}
	//Nicht Relevante Tags hinterlegen
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
	//Nicht Relevante Tags für Details hinterlegen
	NetatmoTagsDetail(obj_name) {
		switch(obj_name) {
			case 'body':
				return false;
			default:
				return true;
		}
	}
	//Delete leading .
	getPrefixPath(path) {
		return path.replace(/^\.+/, '');
	}
	// Create Channel
	async createMyChannel(path, name) {
		//this.log.debug('Create Channel: ' + name + ' - ' + path);
		await this.setObjectNotExists(path, {
			type: 'channel',
			common: {
				name: name,
			},
			native: {},
		});
	}
	//dynamic creation of datapoints
	async CreateNetatmoStructure (id,object_name,value, ack, role, write, read) {
		//this.log.debug('Create State: ' + id + ' / ' + object_name + ' : ' + value);
		const regex = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/;

		if (!role) {
			if (object_name.indexOf('temperature') >= 0) {
				role = 'level.temperature';
			} else if (object_name.indexOf('timezone') >= 0) {
				role = 'state';
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
		this.log.debug('Take rule: ' + role + ' for ' + object_name);
		await this.setObjectNotExistsAsync(id, {
			type: 'state',
			common: {
				name: object_name,
				role: role,
				type: typeof value,
				read: read,
				write: write
			},
			native: {},
		});
		await this.setState(id, value, ack);
	}
	//set trigger after comparing
	async compareValues(id, state, idtoset) {
		const adapterstates = await this.getStateAsync(id);
		//this.log.debug('Compare: ' + adapterstates.val + ' = ' + state.val);
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
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

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
						case APIRequest_homesdata+ '_' + APIRequest_homesdata_NAPlug:
							if (state.val === false) {
								break;
							}
							this.log.debug('API Request homesdata - NAPlug: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.sendAPIRequest(APIRequest_homesdata, '&gateway_types=' + APIRequest_homesdata_NAPlug);
							break;

						// get actual homestatus
						case APIRequest_homestatus:
							if (state.val === false) {
								break;
							}
							this.log.debug('API Request homestatus: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.sendAPIRequest(APIRequest_homestatus, '');
							break;

						// Set Therm Mode for Netatmo Energy
						case 'SetTemp':
							//this.log.debug('Start to check changes ' + state.val);
							if (!isNaN(state.val)) {
								if (this.config.applyimmediately) {
									this.log.debug('SetTemp: Call API directly');
									this.applysingleactualtemp(state,actPath,actParent,APIRequest_setroomthermpoint,APIRequest_setroomthermpoint_manual);
								} else {
									this.log.debug('SetTemp: Set TempChanged manually');
									this.compareValues(actParent + '.status.therm_setpoint_temperature', state, actPath + '.TempChanged');
								}
							} else {
								this.log.debug('SetTemp: No Number ' + state.val);
							}
							break;

						// Apply all changes to Netatmo Cloud
						case 'applychanges':
							if (state.val === false) {
								break;
							}
							this.log.debug('API Request setthermpoint - manual: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.ApplySingleAPIRequest(APIRequest_setroomthermpoint, APIRequest_setroomthermpoint_manual);
							break;

						// Set Therm Mode for Netatmo Energy
						case APIRequest_setthermmode + '_' + APIRequest_setthermmode_schedule:
							if (state.val === false) {
								break;
							}
							this.log.debug('API Request setthermmode - schedule: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.ApplySingleAPIRequest(APIRequest_setthermmode, APIRequest_setthermmode_schedule);
							break;

						// Set Therm Mode for Netatmo Energy
						case APIRequest_setthermmode + '_' + APIRequest_setthermmode_hg:
							if (state.val === false) {
								break;
							}
							this.log.debug('API Request setthermmode - hg: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.ApplySingleAPIRequest(APIRequest_setthermmode, APIRequest_setthermmode_hg);
							break;

						// Set Therm Mode for Netatmo Energy
						case APIRequest_setthermmode + '_' + APIRequest_setthermmode_away:
							if (state.val === false) {
								break;
							}
							this.log.debug('API Request setthermmode - away: ' + id + ' - ' + state.val);
							this.setState(id, false, true);
							this.ApplySingleAPIRequest(APIRequest_setthermmode, APIRequest_setthermmode_away);
							break;

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
