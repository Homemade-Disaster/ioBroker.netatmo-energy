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

**Dieser Adapter verwendet Sentry Bibliotheken, um einen automatischen Report von Abbrüchen und Programmcode Fehlern an die Entwickler zu senden.** Für weitere Details und für Informationen zur Deaktivierung dieser Funktion beachten sie bitte [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Sentry reporting ist verfügbar ab js-controller 3.0.

## Voraussetzungen & Konfiguration
Netatmo Energy Hardware (Thermostat, Ventile)
Konto bei Netatmo Cloud
- Der Adapter arbeitet mit admin => 3 und nodejs >= 12
- Erstelle dein eigenes Konto https://auth.netatmo.com/de-de/access/signup
- Login in die API durchführen https://dev.netatmo.com/apidocumentation/energy
- Erzeuge deine eigene APP durch Anklicken deines Kontos (oben / links), und drücke den Knopf "Create"
  - Fülle das Formular aus und speichere es
  - Übernimm die erhaltene client-ID und client-secret-ID in die Adapter Konfiguration
  - Gehen sie zur API-Dokumentation https://dev.netatmo.com/apidocumentation/energy
  - Wählen sie "GET homesdata" - "Try it out" - "EXECUTE / HOMESDATA"
    - du wirst ein response erhalten in der du deine home-ID findest
    - Übernimm sie in die Adapter Konfiguration
  - gib deinen User und Passwort der Netatmo Cloud in die Adapter Konfiguration
  - Wähle die gewünschten Optionen in den "API-Einstellungen" und speichern sie die Adapterkonfiguration
    - Temperaturänderungen sofort übertragen ... sofortiges übertragen der Temperaturänderungen in State "SetTemp" an die API
    - API Zustände nach Änderung sofort lesen ... API Daten mittels homestatus sofort nach Aktualisierung der API abholen
    - Aktualisierung der API-states nach x Sekunden ... Permanentes Aktualisieren der API Daten. (0 = Keine Aktualisierung)  
  - Wenn gewünscht kann auch Benachrichtigungsdienst eingerichtet werden um bestimmte Statusänderungen zugesandt zu bekommen. Dabei ist es möglich sich Informationsmeldungen, Warnungen bzw. Fehlermeldungen zu erhalten. Hierfür ist es notwendig die Option "Benachrichtigungen aktivieren/deaktivieren" in den "Anmeldeinformationen" zu aktivieren und danach die Einstellungen im Menü "Benachrichtigungen" einzurichten.

Eine detaillierte Beschreibung ist als wiki verfügbar (https://github.com/Homemade-Disaster/ioBroker.netatmo-energy/wiki).

<img src="https://github.com/Homemade-Disaster/ioBroker.netatmo-energy/raw/master/docs/img/settings_login_de.png" alt="settingsLogin" width="70%"/>

<img src="https://github.com/Homemade-Disaster/ioBroker.netatmo-energy/raw/master/docs/img/settings_api_de.png" alt="settingsAPI" width="70%"/>

## netatmo-energy Adapter für ioBroker
Mittels der Netatmo-Energy API werden die aktuellen Einstellungen abgeholt bzw. geändert. Der Adapter verwendet den fetch Request für den Datentransfer zur Netatmo Energy API. Offizielle Dokumentation der API: https://dev.netatmo.com/apidocumentation/energy.

Der Adapter erzeugt ein eigenes Device "energyAPP" welches die "APIRequests" und "trigger" beinhaltet.

### API Requests
* homesdata             ... holt die gesamte Struktur der Netatmo Energy Installation (dabei wird der Parameter NAPlug verwendet). Sie können alle weiteren Parameter für manuelle Requests selbst auswählen.
* homestatus            ... ermittelt und überträgt den Status und die technischen Informationen ihrer zugeordneten Ventile. Wenn sie Informationen zu einem spezifischen Geräteart möchten können sie diese selbst auswählen.
* getroommeasure        ... Hiermit erhalten sie historische Daten ihrer Räume. Das Ergebnis wird in das "response" Feld eingetragen.
* getmeasure            ... Hiermit erhalten sie die historischen Daten ihres Boilers. Das Ergebnis wird in das "response" Feld eingetragen.
* setthermmode_schedule ... Setzt den Betriebsmodus der Netatmo Energy Installation auf "Schedule" (Standard)
* setthermmode_hq       ... Setzt den Betriebsmodus der Netatmo Energy Installation auf "hq" (Frostwächter)
* setthermmode_away     ... Setzt den Betriebsmodus der Netatmo Energy Installation auf "away" (nicht zu Hause)
* switchhomeschedule    ... Setzt den "schedule mode" der Netatmo Energy API. Alle möglichen Modi sind im Channel "switchhomeschedule" aufgelistet.
* synchomeschedule      ... Setzt die Heizpläne deiner Netatmo Energy APP. Um einen spezifischen Heizplan zu ändern geben sie eine an. Andernfalls wird der aktuell eingestellte abgeändert. Bitte tragen sie die notwendigen Parameter ein und lösen sie den synchomeschedule Request aus.

Wenn ein API Request Parameter benötigt können sie diese im korrespondierenden Request Channel im Channel "parameters" finden.

### Trigger
* applychanges          ... übermittelt alle noch offenen manuellen Änderungen deiner Ventile an die Netatmo Energy APP
* refresh_structure     ... erzeuge die Requests homesdata und homestatus hintereinander

### Änderungs-Requests
* setroomthermpoint     ... abhängig von den manuellen Änderungen im Channel "setting" werden die Änderungen an die Netatmo Energy APP übertragen. (entweder sofort oder selbst getriggert - "Temperaturänderungen sofort übertragen"). 
* set_mode_to_home      ... Der Button "set_mode_to_home" im channel "setting" setzt den Ventil-mode "set_mode_to_home" auf "home".

### Status
* running               ... hier kann man erkenne ob derzeit ein API Request läuft

### Requeststruktur
<img src="https://github.com/Homemade-Disaster/ioBroker.netatmo-energy/raw/master/docs/img/EnergyAPP_measure.png" alt="settingsLogin" width="80%"/><img src="https://github.com/Homemade-Disaster/ioBroker.netatmo-energy/raw/master/docs/img/EnergyAPP.png" alt="settingsLogin" width="80%"/>

## Strukturen aufbauen
Beim Start des Adapters wird der aktuelle Status der gesamten Netatmo Energy APP aufgefrischt und der Status aller Ventile und Thermostate übertragen. Abhängig von den Allgemeinen Einstellungen (API Zustände nach Änderung sofort lesen) werden die Status der Ventile und Thermostate nach Änderung der API sofort wieder abgeholt (es wird sofort ein homestatus Request abgesetzt).
Beim Starten des Adapters wird die Initialisierung durchgeführt.

## Benachrichtigungen
Wenn sie in der Adapterkonfiguration einen Benachrichtigungsdienst aktiviert haben werden diverse Meldungen an sie versandt.
Folgende Dienste sind verfügbar.

<img src="https://github.com/Homemade-Disaster/ioBroker.netatmo-energy/raw/master/docs/img/notification_types_de.png" alt="settingsAPI" width="30%"/>

Bitte geben sie für den von ihnen gewählten Benachrichtigungsdienst die notwendigen Verbindungsdaten an.

<img src="https://github.com/Homemade-Disaster/ioBroker.netatmo-energy/raw/master/docs/img/notification_de.png" alt="settingsAPI" width="70%"/>


## Admin-Tab
Auf der Admin-Tab können sie alle Thermostate, Bridges und Ventile ihrer netatmo energy instance anzeigen lassen. Dort ist ea auch möglich diese Ansicht zu aktualisieren bzw. eine vollständige API Aktualisierung zu starten.

<img src="https://github.com/Homemade-Disaster/ioBroker.netatmo-energy/raw/master/docs/img/admintab_de.png" alt="admintab" width="70%"/>

## Widget
Widget für VIS um ein komplettes Thermostat anzuzeigen. Sie müssen nur den "SetTemp" - Datenpunkt eintragen. Alle anderen Informationen werden dynamisch aus der "rooms"-Struktur ermittelt.

<img src="https://github.com/Homemade-Disaster/ioBroker.netatmo-energy/raw/master/docs/img/valve_widget_de.png" alt="settingsAPI" width="250px"/>