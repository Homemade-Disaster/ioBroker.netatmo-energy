![Logo](https://raw.githubusercontent.com/Homemade-Disaster/ioBroker.netatmo-energy/master/admin/netatmo-energy.png)
# ioBroker.netatmo-energy

[![NPM version](http://img.shields.io/npm/v/iobroker.netatmo-energy.svg)](https://www.npmjs.com/package/iobroker.netatmo-energy)
[![Downloads](https://img.shields.io/npm/dm/iobroker.netatmo-energy.svg)](https://www.npmjs.com/package/iobroker.netatmo-energy)
![Number of Installations (latest)](http://iobroker.live/badges/netatmo-energy-installed.svg)
![Number of Installations (stable)](http://iobroker.live/badges/netatmo-energy-stable.svg)
[![Dependency Status](https://img.shields.io/david/Homemade-Disaster/iobroker.netatmo-energy.svg)](https://david-dm.org/Homemade-Disaster/iobroker.netatmo-energy)
[![Known Vulnerabilities](https://snyk.io/test/github/Homemade-Disaster/ioBroker.netatmo-energy/badge.svg)](https://snyk.io/test/github/Homemade-Disaster/ioBroker.netatmo-energy)

[![NPM](https://nodei.co/npm/iobroker.netatmo-energy.png?downloads=true)](https://nodei.co/npm/iobroker.netatmo-energy/)

**Tests:** ![Test and Release](https://github.com/Homemade-Disaster/ioBroker.netatmo-energy/workflows/Test%20and%20Release/badge.svg)

## Voraussetzungen & Konfiguation
Netatmo Energy hardware (Thermostat, Ventile)
Konto bei Netatmo Cloud
* Der Adapter arbeitet mit admin => 3 und nodejs >= 10
* Erstelle dein eigenes Konto https://auth.netatmo.com/de-de/access/signup
* Login in die API durchführen https://dev.netatmo.com/apidocumentation/energy
* Erzeuge deine eigene APP durch anklicken deines Kontos (oben / links), und drücke den Knopf "Create"
* Fülle das Formular aus und speichere es
* Übernimm die erhaltene client ID und client secret in die Adapter Konfiguration
* Gehen sie zur API Dokumentation https://dev.netatmo.com/apidocumentation/energy
* Wählen sie "GET homesdata" - "Try it out" - "EXECUTE / HOMESDATA"
* du wirst ein response erhalten in der du deine home id findest
* Übernimm sie in die Adapter Konfiguration
* gib deinen User und Passwort der Netatmo Cloud in die Adapter Konfiguration
* Wähle die gewünschten Optionen in den "Allgemeinen Einstellungen" und speichern sie die Adapter Konfiguration
* Temperaturänderungen sofort übertragen ... sofortiges übertragen der Temperaturänderungen in State "SetTemp" an die API
* API Zustände nach Änderung sofort lesen ... API Daten mittels homestatus sofort nach Aktualisierung der API abholen
* Aktualisierung der API-states nach x Sekunden ... Permanentes Aktualisieren der API Daten. (0 = Keine Aktualisierung)  

![settingsLogin](https://raw.githubusercontent.com/Homemade-Disaster/ioBroker.netatmo-energy/master/docs/img/settings_login_de.png)

![settingsAPI](https://raw.githubusercontent.com/Homemade-Disaster/ioBroker.netatmo-energy/master/docs/img/settings_api_de.png)

## netatmo-energy Adapter für ioBroker
Mittels der Netatmo-Energy API werden die aktuellen Einstellungen abgeholt bzw. geändert. Der Adapter verwendet den fetch request für den Datentransfer zur Netatmo Energy API. Offizielle Dokumentation der API: https://dev.netatmo.com/apidocumentation/energy.

Der Adapter erzeugt ein eigenes Device "energyAPP" welches die "API Requests" und "Trigger" beinhaltet.

### API Requests
* homesdata_NAPlug      ... holt die gesamte Struktur der Netatmo Energy Installation (dabei wir der Parameter NAPlug verwendet)
* homestatus            ... ermittelt und überträgt den Status und die technischen Informationen ihrer zugeordneten Ventile
* setthermmode_schedule ... Setzt den Betriebsmodus der Netatmo Energy Installation auf "Schedule" (standard)
* setthermmode_hq       ... Setzt den Betriebsmodus der Netatmo Energy Installation auf "hq" (Frostwächter)
* setthermmode_away     ... Setzt den Betriebsmodus der Netatmo Energy Installation auf "away" (nicht zu Hause)

### Trigger
* applychanges          ... übermittelt alle noch offenen manuellen Änderungen deiner Ventile an die Netatmo Energy APP

### Änderungs-Requests
* setroomthermpoint     ... abhängig von den manuellen Änderungen im Channel "setting" werden die Änderungen an die Netatmo Energy APP übertragen. (entweder sofort oder selbst getriggert - "Temperaturänderungen sofort übertragen")

## Strukturen aufbauen
Beim Start des Adapters wird der aktuelle Status der gesamten Netatmo Energy APP aufgefrischt und der Status aller Ventile und Thermostate übertragen. Abhängig von den Allgemeinen Einstellungen (API Zustände nach Änderung sofort lesen) werden die Status der Ventile und Thermostate nach Änderung der API sofort wieder abgeholt (es wird sofort ein homestatus Request abgesetzt).


## Änderungsprotokoll

### 0.1.7
* (ioKlausi) Rollen der States überarbeiten

### 0.1.6
* (ioKlausi) homestates Request mittels Timer auslösen und Konfigurationsbildschirm überarbeitet

### 0.1.5
* (ioKlausi) Passwort Ver-/Entschlüsselung hinzugefügt

### 0.1.4
* (ioKlausi) Neue NPM Version erstellt

### 0.1.3
* (ioKlausi) Programm überarbeitet

### 0.1.2
* (ioKlausi) "SpecialRequests" auf Gerät "energyAPP" geändert

### 0.1.1
* (ioKlausi) API homestatus sofort nach Änderung auslösen

### 0.1.0
* (ioKlausi) Fehlerbehebung und Veröffentlichung des Adapters

### 0.0.6
* (ioKlausi) Vorgaben für Latest eingebaut

### 0.0.5
* (ioKlausi) ACK Logik verändert

### 0.0.4
* (ioKlausi) Änderung der API Ordner Erstellung

### 0.0.3
* (ioKlausi) Übersetzung und Fehlerbehebung

### 0.0.2
* (ioKlausi) API Requests und Strukturaufbau etabliert

### 0.0.1
* (ioKlausi) Initiales Releas


## License
MIT-Lizenz

Copyright (c) 2020 ioKlausi <nii@gmx.at>

Hiermit wird jeder Person, die eine Kopie erhält, kostenlos die Erlaubnis erteilt
diese Software und der dazugehörigen Dokumentationsdateien (die "Software") zu bearbeiten,
in der Software ohne Einschränkung, einschließlich ohne Einschränkung der Rechte
zu verwenden, zu kopieren, zu ändern, zusammenzuführen, zu veröffentlichen, zu verteilen, Unterlizenzen zu vergeben und / oder zu verkaufen, Kopien der Software und um Personen zuzulassen, für die die Software bestimmt ist
dafür eingerichtet, unter folgenden Bedingungen:

Der oben genannte Copyright-Hinweis und dieser Erlaubnishinweis sind in allen enthalten
Kopien oder wesentliche Teile der Software anzuführen.

DIE SOFTWARE WIRD "WIE BESEHEN" OHNE JEGLICHE AUSDRÜCKLICHE ODER AUSDRÜCKLICHE GARANTIE ZUR VERFÜGUNG GESTELLT
STILLSCHWEIGEND, EINSCHLIESSLICH, ABER NICHT BESCHRÄNKT AUF DIE GARANTIEN DER MARKTGÄNGIGKEIT,
EIGNUNG FÜR EINEN BESTIMMTEN ZWECK UND NICHTVERLETZUNG. In keinem Fall wird das
AUTOREN ODER COPYRIGHT-INHABER HAFTEN FÜR ANSPRÜCHE, SCHÄDEN ODER ANDERE
HAFTUNG, OB BEI VERTRAGS-, TORT- ODER ANDERWEITIGEN MASSNAHMEN AUS,
AUS ODER IM ZUSAMMENHANG MIT DER SOFTWARE ODER DER NUTZUNG ODER ANDEREN HANDELN IN DER
SOFTWARE.
