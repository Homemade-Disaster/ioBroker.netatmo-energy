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

Get and set data using Netatmo-Energy API. This adapter uses the fetch command to execute http requests to Netatmo Energy API. The official documentation of this API: <https://dev.netatmo.com/apidocumentation/energy>.

[Detailed description of Netatmo Energy Adapter in english](docs/en/README.md)

## netatmo-energy Adapter für ioBroker

Mittels der Netatmo-Energy API werden die aktuellen Einstellungen abgeholt bzw. geändert. Der Adapter verwendet den fetch Request für den Datentransfer zur Netatmo Energy API. Offizielle Dokumentation der API: <https://dev.netatmo.com/apidocumentation/energy>.

[Detailbeschreibung des Netatmo Energy Adapter in deutsch](docs/de/README.md)

**If you like it, please consider a donation:**
  
[![paypal](https://www.paypalobjects.com/en_US/DK/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/donate/?hosted_button_id=V3HZWGDD44GEN)

## Changelog

[Older changes](CHANGELOG_OLD.md)
<!-- ### **WORK IN PROGRESS** -->
### 2.8.1 (2025-04-24)

* (ioKlausi) Update dependencies

### 2.8.0 (2025-01-31)

* (ioKlausi) Update dependencies

### 2.7.3 (2024-01-27)

* (ioKlausi) Option 'Only update datapoints if changes are detected' corrected

### 2.7.2 (2024-01-18)

* (ioKlausi) Adjust attributes of the adapter

### 2.7.1 (2023-12-10)

* (ioKlausi) Remove GULP support
* (ioKlausi) Support dark mode

### 2.7.0 (2023-11-19)

* (ioKlausi) Adjust default value for parameters

### 2.6.5 (2023-11-05)

* (ioKlausi) New options in the adapter configuration for updating datapoints

### 2.6.4 (2023-10-25)

* (ioKlausi) Change value only if changes are detected

### 2.6.3 (2023-10-14)

* (ioKlausi) Adapt GULP

### 2.6.2 (2023-10-13)

* (ioKlausi) Bug fix of 'Sentry errors'

### 2.6.1 (2023-06-01)

* (ioKlausi) Correct some adapter check issues

### 2.6.0 (2023-05-01)

* (ioKlausi) Enable / Disable sensor actions

### 2.5.8 (2023-04-16)

* (ioKlausi) Bug fix of translations

### 2.5.7 (2023-04-16)

* (ioKlausi) Bug fix of sensor actions

### 2.5.6 (2023-04-15)

* (ioKlausi) Bug fix of Sentry errors
* (ioKlausi) Home mode for individual rooms in admin tab established
* (ioKlausi) Bug fix of translations

### 2.5.5 (2023-04-11)

* (ioKlausi) Bug fix of Sentry errors

### 2.5.4 (2023-04-10)

* (ioKlausi) Bug fix of Sentry errors

### 2.5.3 (2023-04-10)

* (ioKlausi) Added data point for messages

### 2.5.2 (2023-04-09)

* (ioKlausi) Made some adjustments in the admin config

### 2.5.1 (2023-04-09)

* (ioKlausi) Test message in config added
* (ioKlausi) Revise ioBroker Netatmo-Energy APP

### 2.5.0 (2023-04-07)

* (ioKlausi) Sensor changed to object ID type boolean

## License

MIT License

Copyright (c) 2021-2025 ioKlausi <nii@gmx.at>

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
