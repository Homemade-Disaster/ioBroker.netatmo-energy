![Logo](https://github.com/Homemade-Disaster/ioBroker.netatmo-energy/raw/master/admin/netatmo-energy.png)
# ioBroker.netatmo-energy

[![NPM version](http://img.shields.io/npm/v/iobroker.netatmo-energy.svg)](https://www.npmjs.com/package/iobroker.netatmo-energy)
[![Downloads](https://img.shields.io/npm/dm/iobroker.netatmo-energy.svg)](https://www.npmjs.com/package/iobroker.netatmo-energy)
![Number of Installations (latest)](http://iobroker.live/badges/netatmo-energy-installed.svg)
![Number of Installations (stable)](http://iobroker.live/badges/netatmo-energy-stable.svg)
[![Known Vulnerabilities](https://snyk.io/test/github/Homemade-Disaster/ioBroker.netatmo-energy/badge.svg)](https://snyk.io/test/github/Homemade-Disaster/ioBroker.netatmo-energy)
![Test and Release](https://github.com/Homemade-Disaster/ioBroker.netatmo-energy/workflows/Test%20and%20Release/badge.svg)
[![Translation status](https://weblate.iobroker.net/widgets/adapters/-/admin/svg-badge.svg)](https://weblate.iobroker.net/engage/adapters/?utm_source=widget)

[![NPM](https://nodei.co/npm/iobroker.netatmo-energy.png?downloads=true)](https://nodei.co/npm/iobroker.netatmo-energy/)

**This adapter uses Sentry libraries to automatically report exceptions and code errors to the developers.** For more details and for information how to disable the error reporting see [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Sentry reporting is used starting with js-controller 3.0.

## netatmo-energy adapter for ioBroker
Get and set data using Netatmo-Energy API. This adapter uses the fetch command to execute http requests to Netatmo Energy API. The official documentation of this API: https://dev.netatmo.com/apidocumentation/energy.

[Detailed description of Netatmo Energy Adapter in english](docs/en/README.md)

## netatmo-energy Adapter für ioBroker
Mittels der Netatmo-Energy API werden die aktuellen Einstellungen abgeholt bzw. geändert. Der Adapter verwendet den fetch Request für den Datentransfer zur Netatmo Energy API. Offizielle Dokumentation der API: https://dev.netatmo.com/apidocumentation/energy.

[Detailbeschreibung des Netatmo Energy Adapter in deutsch](docs/de/README.md)

**If you like it, please consider a donation:**
  
[![paypal](https://www.paypalobjects.com/en_US/DK/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/donate/?hosted_button_id=V3HZWGDD44GEN)

## Changelog
[Older changes](CHANGELOG_OLD.md)
<!--
    Placeholder for the next version (at the beginning of the line):
    ### **WORK IN PROGRESS**
-->
### 1.2.0 (2022-03-01)
* (ioKlausi) Close message functionality added on admin tab

### 1.1.7 (2022-03-24)
* (ioKlausi) Bridge information added to each card

### 1.1.6 (2022-03-24)
* (ioKlausi) Rework README.md & WIKI

### 1.1.5 (2022-03-23)
* (ioKlausi) Refresh functionality added to admin tab

### 1.1.4 (2022-03-20)
* (ioKlausi) Plug added to admin tab 

### 1.1.3 (2022-03-19)
* (ioKlausi) Admin tab for valves added 

### 1.1.2 (2022-03-06)
* (ioKlausi) Bugfix Easy Admin 

### 1.1.1 (2022-03-06)
* (ioKlausi) Bugfix setroomthermpoint 

### 1.1.0 (2022-03-06)
* (ioKlausi) setroomthermpoint - Trigger for valve-mode implemented

### 1.0.4 (2022-03-05)
* (ioKlausi) Bugfix - send message

### 1.0.3 (2022-03-05)
* (ioKlausi) Transfered Customizing-UI to json

### 1.0.2 (2022-02-27)
* (ioKlausi) Redesign coding

### 1.0.0 (2022-02-25)
* (ioKlausi) Create major version

## License
MIT License

Copyright (c) 2022 ioKlausi <nii@gmx.at>

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
