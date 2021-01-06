/*
	ioBroker.vis netatmo-energy Widget-Set

	version: "0.0.1"

	Copyright 2021 ioKlausi nii@gmx.at
*/
/* global vis, systemDictionary */
'use strict';

// Netetmo Energy global Functions / Code

// Translations
if (vis.editMode) {
	getTranslation();
}

async function getTranslation(){
	let translation = await(await fetch("widgets/netatmo-energy/js/words.js")).text();
	if (translation) {
		translation = translation.substring(translation.indexOf('{'), translation.lastIndexOf(';'));
		$.extend(true, systemDictionary, JSON.parse(translation));
	}
}

// Build temperture textbox
function buildtemptext(data) {
	const color_atxt = (data.catxt)      ? ('style="color: ' + data.catxt + '";') : ('style="color: white;"');
	const color_stxt = (data.cstxt)      ? ('style="color: ' + data.cstxt + '";') : ('style="color: white;"');
	const color_itxt = (data.citxt)      ? ('style="color: ' + data.citxt + '";') : ('style="color: white;"');
	const valve_act  = ((data.valveact)  ? (data.valveact)  : ('Ventiltemperatur')) + ': ';
	const valve_soll = ((data.valvesoll) ? (data.valvesoll) : ('Soll-Temperatur')) + ': ';
	const valve_ist  = ((data.valveist)  ? (data.valveist)  : ('Ist-Temperatur')) + ': ';
	const temp_act   = ((data.act_oid)   ? ((vis.states.attr(data.act_oid + '.val')).toFixed(1)) : ('Please insert SetTemp-ID in setup ')) + ((data.valveactbehind) ? (data.valveactbehind) : (' °C'));
	const temp_soll  = ((data.oid)       ? ((vis.states.attr(data.oid + '.val')).toFixed(1))      : ('Please insert SetTemp-ID in setup ')) + ((data.valvesollbehind) ? (data.valvesollbehind) : (' °C'));
	const temp_ist   = ((data.temp_oid)  ? ((vis.states.attr(data.temp_oid + '.val')).toFixed(1)) : ('Please insert SetTemp-ID in setup ')) + ((data.valveistbehind) ? (data.valveistbehind) : (' °C'));

	let htmltxt = '<p style="white-space: nowrap"> <span ' + color_stxt + '>';
	htmltxt += valve_soll + temp_soll + '</span><br>';
	htmltxt += '<span ' + color_atxt + '>';
	htmltxt += valve_act  + temp_act + '</span><br>';
	htmltxt += '<span ' + color_itxt + '>';
	htmltxt += valve_ist  + temp_ist + '</span> </p>';
	console.log('Temp-Block:' + htmltxt);
	return htmltxt;
}

// Build title
function buildtitle(data) {
	let roomtitle     = (data.atxt)        ? (data.atxt) : null;
	const roomname    = (data.title_oid)   ? (vis.states.attr(data.title_oid + '.val')) : null;
	const textfont    = (data.txtfont)     ? ('font-family: ' + data.txtfont + ';') : ('font-family: Verdana, Geneva, sans-serif;');
	const txtfontsize = (data.txtfontsize) ? ('font-size: ' + data.txtfontsize + ';') : ('font-size: x-small;');
	const txtcolor    =	(data.ctxt)        ? ('color: ' + data.ctxt + ';') : ('color: white;');

	if (roomname && roomname != '' && roomtitle) {
		roomtitle = roomtitle.replace('&room', roomname);
	}
	if ((!roomtitle || roomtitle == '') && roomname) {
		roomtitle = roomname;
	}
	return ((roomtitle) ? ('<p style="white-space: nowrap;' + textfont + txtfontsize + txtcolor + '">' + roomtitle + '</p>') : ('Please insert SetTemp-ID in setup '));
}

// Netetmo Energy Functions
vis.binds.netatmobasic = {
	refreshAPI: function (el, oid) {
		if (!vis.editMode) {
			$(el).parent().on('click touchstart', function () {
				vis.setValue(oid, true);
			});
		}
	},

	slider: function (el, wid, view, data, options) {
		var $this       = $(el);
		var oid         = $this.attr('data-oid');
		var oid2        = $this.attr('data-oid2');
		var oid_val     = 0;
		var oid2_val    = 0;
		var woid         = $this.attr('data-oid-working');
		var woid2        = $this.attr('data-oid2-working');

		var settings    = $.extend({
			range:  !!oid2,
			min:    0,
			max:    100,
			step:   1,
			value:  parseFloat(vis.states.attr(oid + '.val')),
			slide:  function (e, ui) {
				if (options.submitmethod !== 'stop') {
					// Slider -> Observable
					if (oid2) {
						if (options.inverted) {
							ui.values[0] = (settings.max - ui.values[0]) + settings.min;
							ui.values[1] = (settings.max - ui.values[1]) + settings.min;
						}

						oid && vis.setValue(oid, ui.values[0]); //.toFixed(6));
						vis.setValue(oid2, ui.values[1]); //.toFixed(6));
					} else if (oid) {
						if (options.inverted) ui.value = (settings.max - ui.value) + settings.min;
						vis.setValue(oid, ui.value); //.toFixed(6));
					}
				}

			},
			stop: function (e, ui) {
				if (options.submitmethod === 'stop') {
					if (oid2) {
						if (options.inverted) {
							ui.values[0] = (settings.max - ui.values[0]) + settings.min;
							ui.values[1] = (settings.max - ui.values[1]) + settings.min;
						}

						oid && vis.setValue(oid, ui.values[0]); //.toFixed(6));
						vis.setValue(oid2, ui.values[1]); //.toFixed(6));
					} else if (oid) {
						if (options.inverted) ui.value = (settings.max - ui.value) + settings.min;
						vis.setValue(oid, ui.value); //.toFixed(6));
					}
				}
			}
		}, options);

		settings.inverted = (settings.inverted === 'true' || settings.inverted === true);

		if (isNaN(settings.value)) settings.value = 0;
		if (isNaN(settings.min))   settings.min = 0;
		if (isNaN(settings.max))   settings.max = 100;
		if (isNaN(settings.step))  settings.step = (settings.max - settings.min) / 100;

		settings.min = parseFloat(settings.min);
		settings.max = parseFloat(settings.max);
		settings.value = parseFloat(settings.value);

		if (settings.inverted) settings.value = (settings.max - settings.value) + settings.min;
		// Slider erzeugen
		$this.slider(settings);

		// onChange Ereignis
		function onChange(e, newVal) {
			if (e.type === oid + '.val') {
				if (!vis.states.attr(woid + '.val')) {
					if (settings.inverted) {
						oid_val = (settings.max - parseFloat(newVal)) + settings.min;
					} else {
						oid_val = parseFloat(newVal);
					}
					if ($this.slider('instance')) {
						if (oid2) {
							$this.slider('values', [oid_val, oid2_val]);
						} else {
							$this.slider('value', oid_val);
						}
					}
				}
			} else if (e.type === oid2 + '.val'){
				// console.log('slider newVal=' + JSON.stringify(newVal));
				// If device not in working state
				if (!vis.states.attr(woid2 + '.val')) {
					oid2_val = parseFloat(newVal);
					if (settings.inverted) {
						oid2_val = (settings.max - parseFloat(newVal)) + settings.min;
					} else {
						oid2_val = parseFloat(newVal);
					}
					if ($this.slider('instance')) {
						$this.slider('values', [oid_val, oid2_val]);
					}
				}
			}
			document.getElementById("NetatmoShowTemp").innerHTML = buildtemptext(data);
		}

		$this.children().css('box-shadow', '0 0 5px 1px black');

		var bound = [];
		if (oid) {
			vis.states.bind(oid + '.val', onChange);
			bound.push(oid + '.val');
		}

		if (oid2) {
			vis.states.bind(oid2 + '.val', onChange);
			bound.push(oid2 + '.val');

			oid_val  = vis.states.attr(oid + '.val');
			oid2_val = vis.states.attr(oid2 + '.val');

			if (settings.inverted) {
				oid_val  = (settings.max - oid_val)  + settings.min;
				oid2_val = (settings.max - oid2_val) + settings.min;
			}
			$this.slider('values', [oid_val, oid2_val]);
		}

		if (bound.length) {
			// remember all ids, that bound
			$this.parent().parent()
				.data('bound', bound)
				// remember bind handler
				.data('bindHandler', onChange);
		}
	},

	gettitle: function(el, data) {
		const element = $(el);
		element.html(buildtitle(data));
	},

	gettemperatures: function(el, wid, data) {
		var bound = [];
		var $wid = $('#' + wid);
		const element = $(el);
		element.html(buildtemptext(data));

		function onChange() {
			element.html(buildtemptext(data));
		}

		vis.states.bind(data.oid + '.val', onChange);
		bound.push(data.oid + '.val');
		vis.states.bind(data.temp_oid + '.val', onChange);
		bound.push(data.temp_oid + '.val');
		vis.states.bind(data.act_oid + '.val', onChange);
		bound.push(data.act_oid + '.val');

		if (bound.length) {
			// remember all ids, that bound
			$wid.data('bound', bound);
			// remember bind handler
			$wid.data('bindHandler', onChange);
		}
	}
};


// Netetamo Energy main
vis.binds['netatmo-energy'] = {
	version: '0.0.1',
	showVersion: function () {
		if (vis.binds['netatmo-energy'].version) {
			console.log('Version netatmo-energy: ' + vis.binds['netatmo-energy'].version);
			vis.binds['netatmo-energy'].version = null;
		}
	},

	getDynamicAttributes: function(wid, view, value, attr, isCss) {
		const obj = vis.objects[value];
		var changed = [];

		if (obj && obj.common && obj.common.role == 'level.temperature') {

			// immer updaten
			var roles = [];
			roles.push('value.temperature');
			roles.push('valve.temperature');
			roles.push('value.roomname');

			if (roles.length) {
				const result = vis.findByRoles(value, roles);
				if (result) {
					for (const r in result) {
						switch(r) {
							case 'value.temperature':
								changed.push('act_oid'); // remember attr to update it
								vis.views[view].widgets[wid].data.act_oid = result[r];
								vis.widgets[wid].data.act_oid = result[r];
								break;
							case 'valve.temperature':
								changed.push('temp_oid'); // remember attr to update it
								vis.views[view].widgets[wid].data.temp_oid = result[r];
								vis.widgets[wid].data.temp_oid = result[r];
								break;
							case 'value.roomname':
								changed.push('title_oid'); // remember attr to update it
								vis.views[view].widgets[wid].data.title_oid = result[r];
								vis.widgets[wid].data.title_oid = result[r];
								break;
						}
					}
				}
			}
		}
		return changed.length ? changed : null;
	}
};

vis.binds['netatmo-energy'].showVersion();
