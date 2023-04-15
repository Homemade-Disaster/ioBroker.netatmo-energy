/* eslint quotes: 0, no-unused-vars: 0 */
/*global glob:true */
'use strict';

//Define global constants
const _glob = {
	// Netatmo API requests
	'Netatmo_TokenRequest_URL': 'https://api.netatmo.com/oauth2/token',
	'Netatmo_APIrequest_URL': 'https://api.netatmo.com/api/',
	'Netatmo_BASE_URL': 'https://api.netatmo.com',

	'APIRequest_homesdata': 'homesdata',
	'APIRequest_homesdata_NAPlug': 'NAPlug',
	'APIRequest_homesdata_NAPTherm1': 'NATherm1',

	'APIRequest_homestatus': 'homestatus',

	'APIRequest_getroommeasure': 'getroommeasure',
	'APIRequest_getmeasure': 'getmeasure',

	'APIRequest_setroomthermpoint': 'setroomthermpoint',
	'APIRequest_setroomthermpoint_manual': 'manual',

	'APIRequest_setthermmode': 'setthermmode',
	'APIRequest_setthermmode_schedule': 'schedule',
	'APIRequest_setthermmode_hg': 'hg',
	'APIRequest_setthermmode_away': 'away',

	'APIRequest_switchhomeschedule': 'switchhomeschedule',

	'APIRequest_synchomeschedule': 'synchomeschedule',

	'APIRequest_createnewhomeschedule': 'createnewhomeschedule',

	// Energy APP
	'Trigger_applychanges': 'applychanges',
	'Trigger_refresh_all': 'refresh_structure',
	'Trigger_SetTemp': 'SetTemp',
	'Trigger_SetHome': 'set_mode_to_home',
	'Messages_Text': 'message_text',

	// Energy APP Channels / States
	'Device_APIRequests': 'energyAPP',

	'Channel_APIRequests': 'APIRequests',
	'Channel_homesdata': 'homesdata',
	'Channel_homestatus': 'homestatus',
	'Channel_getroommeasure': 'getroommeasure',
	'Channel_getmeasure': 'getmeasure',

	'Channel_setthermmode': 'setthermmode',
	'Channel_status': 'status',
	'Channel_trigger': 'trigger',
	'Channel_messages': 'messages',
	'Channel_switchhomeschedule': 'switchhomeschedule',
	'Channel_synchomeschedule': 'synchomeschedule',
	'Channel_createnewhomeschedule': 'createnewhomeschedule',
	'Channel_parameters': 'parameters',

	'Channel_Status_API_running': 'status',
	'Channel_settings': 'settings',
	'Channel_schedules': 'schedules',
	'Channel_modulestatus': 'modulestatus',

	'State_TempChanged': 'TempChanged',
	'State_TempChanged_Mode_home': 'home',
	'State_TempChanged_Mode_schedule': 'schedule',
	'State_TempChanged_Mode': 'mode',
	'State_TempChanged_Endtime': 'endtime',
	'State_therm_setpoint_temperature': 'therm_setpoint_temperature',
	'State_therm_setpoint_mode': 'therm_setpoint_mode',
	'State_schedule_id': 'schedule_id',
	'State_name': 'name',
	'State_zones': 'zones',
	'State_timetable': 'timetable',
	'State_hg_temp': 'hq_temp',
	'State_away_temp': 'away_temp',
	'State_gateway_types': 'gateway_types',
	'State_device_types': 'device_types',
	'State_device_id': 'device_id',
	'State_room_id': 'room_id',
	'State_scale': 'scale',
	'State_type': 'type',
	'State_date_begin': 'date_begin',
	'State_date_end': 'date_end',
	'State_limit': 'limit',
	'State_optimize': 'optimize',
	'State_real_time': 'real_time',
	'State_response': 'response',
	'State_Time_Exec': 'time_exec',
	'State_Status_API_running': 'running',
	'State_selected': 'selected',

	//Value lists
	'List_mode': '{"manual": "manual temperature", "max": "maximum temperature", "hq": "Frost guardian temperature", "home": "home temperature" }',
	'List_gateway_type': '{"NAPlug": "Relay / Smart vales", "NATherm1": "Smart Thermostat (NATherm1)", "NRV": "Smart Thermostat (NRV)" }',
	'List_device_types': '{"thermostat": "Thermostat" }',
	'List_scale': '{"30min": "30 Minits", "1hour": "one hour", "3hours": "Three hours", "1day": "One day", "1week": "One Week"}',
	'List_type_mm': '{"boileron": "Boiler on", "boileroff": "Boiler off", "sum_boiler_on": "Sum of Boiler on", "sum_boiler_off": "Sum of Boiler off"}',
	'List_type_rm': '{"temperature": "Temperature"}',
	'List_thermmode': '{"away": "switchhomeschedule away from home", "hg": "switchhomeschedule frost guard", "schedule": "switchhomeschedule schedule"}',

	//Commands
	'GetSetTempSensors': 'GetSetTempSensors',
	'GetSensorActions': 'GetSensorActions',
	'SendTestNotification': 'SendTestNotification',
	'Action_home': 'home',
	'Action_temp': 'temp',

	//notifications
	'NotificationEmail': 'email',
	'NotificationSignal': 'signal-cmb',
	'NotificationTelegram': 'telegram',
	'NotificationTelegramUser': 'getTelegramUser',
	'GetValves': 'getValves',
	'GetHomesdata': 'getHomesdata',
	'SaveTemperature': 'saveTemperature',
	'ApplyChanges': 'applyChanges',
	'HomeMode': 'homeMode',
	'HomeModeSingleValve': 'homeModeSingle',
	'ModifyDeviceObject': 'ModifyDeviceObject',
	'NotificationPushover': 'pushover',
	'NotificationWhatsapp': 'whatsapp-cmb',
	'NoticeTypeLong': 'longNotice',
	'ErrorNotification': 'Error',
	'InfoNotification': 'Info',
	'WarningNotification': 'Warn',
	'SendNotification': 'Notification',

	//Authority
	'GetOAuthStartLink':'getOAuthStartLink',
	'GetOAuthCallback':'oauth2Callback',
	'OAuthScope':'read_thermostat write_thermostat',

	//subscribed states
	'state_anticipating': 'anticipating',
	'state_open_window': 'open_window',
	'state_reachable': 'reachable',
	'state_battery_state': 'battery_state',
	'state_heating_power_request': 'heating_power_request',

	//Battery status
	'battery_low': 'low',
	'battery_medium': 'medium',

	//payload strings
	'payload_away_temp':     '&away_temp=',
	'payload_client_id':     '&client_id=',
	'payload_client_secret': '&client_secret=',
	'payload_date_begin':    '&date_begin=',
	'payload_date_end':      '&date_end=',
	'payload_device_id':     '&device_id=',
	'payload_device_types':  '&device_types=',
	'payload_endtime':       '&endtime=',
	'payload_gateway_types': '&gateway_types=',
	'payload_hg_temp':       '&hg_temp=',
	'payload_home_id':       '&home_id=',
	'payload_limit':         '&limit=',
	'payload_mode':          '&mode=',
	'payload_optimize':      '&optimize=',
	'payload_real_time':     '&real_time=',
	'payload_refresh_token': '&refresh_token=',
	'payload_room_id':       '&room_id=',
	'payload_scale':         '&scale=',
	'payload_schedule_id':   '&schedule_id=',
	'payload_name': 		 '&name=',
	'payload_scope':         '&scope=',
	'payload_temp':          '&temp=',
	'payload_timetable':     '&timetable=',
	'payload_type':          '&type=',
	'payload_username':      '&username=',
	'payload_zones':         '&zones=',

	//divers
	'blank': ' ',
	'dot': '.'
};


// @ts-ignore
if (typeof module !== 'undefined' && module.parent) {
	module.exports = _glob;
} else {
	glob = _glob;
}