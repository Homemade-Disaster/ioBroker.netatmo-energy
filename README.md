![Logo](https://raw.githubusercontent.com/Homemade-Disaster/ioBroker.netatmo-energy/masteradmin/netatmo-energy.png)
# ioBroker.netatmo-energy

[![NPM version](http://img.shields.io/npm/v/iobroker.netatmo-energy.svg)](https://www.npmjs.com/package/iobroker.netatmo-energy)
[![Downloads](https://img.shields.io/npm/dm/iobroker.netatmo-energy.svg)](https://www.npmjs.com/package/iobroker.netatmo-energy)
![Number of Installations (latest)](http://iobroker.live/badges/netatmo-energy-installed.svg)
![Number of Installations (stable)](http://iobroker.live/badges/netatmo-energy-stable.svg)
[![Dependency Status](https://img.shields.io/david/Homemade-Disaster/iobroker.netatmo-energy.svg)](https://david-dm.org/Homemade-Disaster/iobroker.netatmo-energy)
[![Known Vulnerabilities](https://snyk.io/test/github/Homemade-Disaster/ioBroker.netatmo-energy/badge.svg)](https://snyk.io/test/github/Homemade-Disaster/ioBroker.netatmo-energy)

[![NPM](https://nodei.co/npm/iobroker.netatmo-energy.png?downloads=true)](https://nodei.co/npm/iobroker.netatmo-energy/)

**Tests:** ![Test and Release](https://github.com/Homemade-Disaster/ioBroker.netatmo-energy/workflows/Test%20and%20Release/badge.svg)

## Reqirements & configuration
Netatmo Energy hardware (thermostat, valves)
Account at Netatmo Cloud
	- Adapter is working with admin => 3 and nodejs >= 10
	- Create your own account at https://auth.netatmo.com/de-de/access/signup
	- Login in site https://dev.netatmo.com/apidocumentation/energy
	- Create your own APP by clicking your account (top left), and press button "Create"
		- Fill out the form with your data
		- Copy your own client ID and client secret to the adapter config
		- Go back to the Documentation of Netatmo Energy API https://dev.netatmo.com/apidocumentation/energy
		- Select "GET homesdata" - "Try it out" - "EXECUTE / HOMESDATA"
			- you will get a response including your home id
			- copy it to your adapter config
		- insert your user and password from Netatmo Cloud to your adapter config
		- choose "generell settings options" and "Save and close" the adapter config
			- apply temperature immediately ... send API request after changing "SetTemp" object
			- read API states immediately ... send API homestatus request after changing fields in API

![settingsLogin](https://raw.githubusercontent.com/Homemade-Disaster/ioBroker.netatmo-energy/master/docs/img/settings_login_en.png)

![settingsAPI](https://raw.githubusercontent.com/Homemade-Disaster/ioBroker.netatmo-energy/master/docs/img/settings_api_en.png)

## netatmo-energy adapter for ioBroker
Get and set data using Netatmo-Energy API. This adapter uses the fetch command to execute http requests to Netatmo Energy API. The official documentation of this API: https://dev.netatmo.com/apidocumentation/energy.

It also creates a device called "energyAPP" including channels "API Requests" and "Trigger".

### API Requests
* homesdata_NAPlug      ... get the whole structure of your Netatmo energy environment (using NAPlug-Parameter)
* homestatus            ... get the status and the technical informations of your valves assigned in your rooms
* setthermmode_schedule ... set the mode of your Netatmo Energy to schedule (default)
* setthermmode_hq       ... set the mode of your Netatmo Energy to hq (freeze mode)
* setthermmode_away     ... set the mode of your Netatmo Energy to away (from home)

### Trigger
* applychanges          ... transfer all manually changes of your valves to Netatmo Energy

### Update requests
* setroomthermpoint     ... depending of the "setting" channel it sets the temperature of each room (immediately or by using the trigger "applychanges")

## Build structure
If you start the adapter it will be generating the actual "homes"-environment of your Netatmo Energy APP.
It will automatically built up the whole homes-structure, and also the actual status of your valves.
Depending an the adapter settings it will refresh theses data after sending an API setthermmode request or an API setroomthermpoint request.


## Changelog

### 0.1.7
* (ioKlausi) Change role logic

### 0.1.6
* (ioKlausi) Add schedule for refresh homestates and redesign config screen

### 0.1.5
* (ioKlausi) Password encryption/decryption added

### 0.1.4
* (ioKlausi) Publish new NPM version

### 0.1.3
* (ioKlausi) Redesign coding

### 0.1.2
* (ioKlausi) Changed "SpecialRequests" to Device "energyAPP"

### 0.1.1
* (ioKlausi) Send API homestatus request immediately  

### 0.1.0
* (ioKlausi) Bugfixing and publishing adapter  

### 0.0.6
* (ioKlausi) Fixed adapter for latest repository

### 0.0.5
* (ioKlausi) ACK Logic changed

### 0.0.4
* (ioKlausi) Changed creation of API request folder

### 0.0.3
* (ioKlausi) Translation and bugfixing

### 0.0.2
* (ioKlausi) Add API requests and automatically generation of home structure and documentation

### 0.0.1
* (ioKlausi) initial release


## License
MIT License

Copyright (c) 2020 ioKlausi <nii@gmx.at>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
