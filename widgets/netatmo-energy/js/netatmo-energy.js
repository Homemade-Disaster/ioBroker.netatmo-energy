/*
	ioBroker.vis netatmo-energy Widget-Set

	version: "0.0.2"

	Copyright 2021 ioKlausi nii@gmx.at
*/
'use strict';

/* global $, vis, systemDictionary */

// Netetmo Energy global Functions / Code

// Translations
if (vis.editMode) {
    getTranslation();
}

async function getTranslation() {
    let translation = await (await fetch('widgets/netatmo-energy/js/words.js')).text();
    if (translation) {
        translation = translation.substring(translation.indexOf('{'), translation.lastIndexOf(';'));
        $.extend(true, systemDictionary, JSON.parse(translation));
    }
}

// Build temperture textbox
function buildtemptext(data) {
    const color_vtxt = data.temperature_valve_color
        ? `style="color: ${data.temperature_valve_color}";`
        : 'style="color: white;"';
    const color_stxt = data.temperature_target_color
        ? `style="color: ${data.temperature_target_color}";`
        : 'style="color: white;"';
    const color_itxt = data.temperature_ist_color
        ? `style="color: ${data.temperature_ist_color}";`
        : 'style="color: white;"';
    const valve_now = `${data.valve_now ? data.valve_now : 'Ventiltemperatur'}: `;
    const valve_soll = `${data.valve_target ? data.valve_target : 'Soll-Temperatur'}: `;
    const valve_ist = `${data.valve_actual ? data.valve_actual : 'Ist-Temperatur'}: `;
    const temp_now =
        (data.act_oid ? vis.states.attr(`${data.act_oid}.val`).toFixed(1) : 'Please insert SetTemp-ID in setup ') +
        (data.valve_now_behind ? data.valve_now_behind : ' °C');
    const temp_soll =
        (data.oid ? vis.states.attr(`${data.oid}.val`).toFixed(1) : 'Please insert SetTemp-ID in setup ') +
        (data.valve_target_behind ? data.valve_target_behind : ' °C');
    const temp_ist =
        (data.temp_oid ? vis.states.attr(`${data.temp_oid}.val`).toFixed(1) : 'Please insert SetTemp-ID in setup ') +
        (data.valve_actual_behind ? data.valve_actual_behind : ' °C');
    const txtlines = [];
    let txtline = '';

    if (data.position_target) {
        txtlines[1] = [data.position_target, `<span ${color_stxt}>${valve_soll}${temp_soll}</span>`];
    }
    if (data.position_now) {
        txtlines[2] = [data.position_now, `<span ${color_vtxt}>${valve_now}${temp_now}</span>`];
    }
    if (data.position_actual) {
        txtlines[3] = [data.position_actual, `<span ${color_itxt}>${valve_ist}${temp_ist}</span>`];
    }
    txtlines.sort();
    txtlines.forEach(([key, value]) => {
        if (txtline != '') {
            txtline += '<br>';
        }
        txtline += value;
    });
    const htmltxt = `<p style="white-space: nowrap">${txtline}</p>`;
    console.log(`Temp-Block:${htmltxt}`);
    return htmltxt;
}

// Build title
function buildtitle(data) {
    let roomtitle = data.alternativ_title ? data.alternativ_title : null;
    const roomname = data.title_oid ? vis.states.attr(`${data.title_oid}.val`) : null;
    const textfont = data.title_font ? `font-family: ${data.title_font};` : 'font-family: Verdana, Geneva, sans-serif;';
    const title_fontsize = data.title_fontsize ? `font-size: ${data.title_fontsize};` : 'font-size: x-small;';
    const txtcolor = data.color_title ? `color: ${data.color_title};` : 'color: white;';

    if (roomname && roomname != '' && roomtitle) {
        roomtitle = roomtitle.replace('&room', roomname);
    }
    if ((!roomtitle || roomtitle == '') && roomname) {
        roomtitle = roomname;
    }
    return roomtitle
        ? `<p style="white-space: nowrap;${textfont}${title_fontsize}${txtcolor}">${roomtitle}</p>`
        : '<p> Please insert SetTemp-ID in setup </p>';
}

// Build running
function buildrunning(data) {
    const icon_img = data.pic_running ? data.pic_running : 'widgets/netatmo-energy/img/running.png';
    let show_image = '';

    if (data.running_oid) {
        if (vis.states.attr(`${data.running_oid}.val`) === true) {
            show_image = `<img class="netatmo-pic-running" style="width: ${data.size_running}px; height: auto;" src="${
                icon_img
            }" alt="window open"></img>`;
        }
    }
    return show_image;
}

// Build window open
function buildwindowopen(data) {
    const icon_img = data.pic_windowopen ? data.pic_windowopen : 'widgets/netatmo-energy/img/window_open.png';
    let show_image = '';

    if (
        data.windowopen_oid &&
        vis.states.attr(`${data.windowopen_oid}.val`) === true &&
        (data.show_windowopen == true || data.show_windowopen === 'true')
    ) {
        show_image = `<img class="netatmo-pic-window" style="width: ${data.size_window}px; height: auto;" src="${
            icon_img
        }" alt="window open"></img>`;
    }
    return show_image;
}

// Build window open
function buildreachable(data) {
    const icon_img = data.pic_reachable ? data.pic_reachable : 'widgets/netatmo-energy/img/reachable.png';
    let show_image = '';

    if (
        data.reachable_oid &&
        vis.states.attr(`${data.reachable_oid}.val`) === false &&
        (data.show_reachable == true || data.show_reachable === 'true')
    ) {
        show_image = `<img class="netatmo-pic-reachable" style="width: ${data.size_reachhable}px; height: auto;" src="${
            icon_img
        }" alt="reachable"></img>`;
    }
    return show_image;
}

// Build window open
function buildanticipating(data) {
    const icon_img = data.pic_anticipating ? data.pic_anticipating : 'widgets/netatmo-energy/img/anticipating.png';
    let show_image = '';

    if (
        data.anticipating_oid &&
        vis.states.attr(`${data.anticipating_oid}.val`) === true &&
        (data.show_anticipating == true || data.show_anticipating === 'true')
    ) {
        show_image = `<img class="netatmo-pic-anticipating" style="width: ${
            data.size_anticipating
        }px; height: auto;" src="${icon_img}" alt="anticipating"></img>`;
    }
    return show_image;
}

// Build Logo
function buildlogo(data) {
    const icon_img = data.pic_logo ? data.pic_logo : 'widgets/netatmo-energy/img/valve_white.png';
    let show_image = '';
    let border_class = 'class="netatmo-pic-logo"';

    if (data.upd_oid) {
        border_class = 'class="netatmo-pic-action"';
    }
    if (data.show_logo == true || data.show_logo === 'true') {
        show_image = `<img ${border_class} style="width: ${data.size_logo}px; height: auto;" src="${
            icon_img
        }" alt="logo valve"></img>`;
    }
    return show_image;
}

// Build Logo
function buildrefresh(data) {
    const icon_img = data.pic_refresh ? data.pic_refresh : 'widgets/netatmo-energy/img/refresh.png';
    let show_image = '';
    const border_class = 'class="netatmo-pic-action"';

    if (data.refr_oid) {
        if (data.show_refresh == true || data.show_refresh === 'true') {
            show_image = `<img ${border_class} style="width: ${data.size_refresh}px; height: auto;" src="${
                icon_img
            }" alt="refresh"></img>`;
        }
    }
    return show_image;
}

// Netetmo Energy Functions
vis.binds.netatmobasic = {
    //create slider
    slider: function (el, wid, view, data, options) {
        var $this = $(el);
        var oid = $this.attr('data-oid');
        var oid2 = $this.attr('data-oid2');
        var oid_val = 0;
        var oid2_val = 0;
        var woid = $this.attr('data-oid-working');
        var woid2 = $this.attr('data-oid2-working');

        var settings = $.extend(
            {
                range: !!oid2,
                min: 0,
                max: 100,
                step: 1,
                value: parseFloat(vis.states.attr(`${oid}.val`)),
                slide: function (e, ui) {
                    if (options.submitmethod !== 'stop') {
                        // Slider -> Observable
                        if (oid2) {
                            if (options.inverted) {
                                ui.values[0] = settings.max - ui.values[0] + settings.min;
                                ui.values[1] = settings.max - ui.values[1] + settings.min;
                            }

                            oid && vis.setValue(oid, ui.values[0]); //.toFixed(6));
                            vis.setValue(oid2, ui.values[1]); //.toFixed(6));
                        } else if (oid) {
                            if (options.inverted) {
                                ui.value = settings.max - ui.value + settings.min;
                            }
                            vis.setValue(oid, ui.value); //.toFixed(6));
                        }
                    }
                },
                stop: function (e, ui) {
                    if (options.submitmethod === 'stop') {
                        if (oid2) {
                            if (options.inverted) {
                                ui.values[0] = settings.max - ui.values[0] + settings.min;
                                ui.values[1] = settings.max - ui.values[1] + settings.min;
                            }

                            oid && vis.setValue(oid, ui.values[0]); //.toFixed(6));
                            vis.setValue(oid2, ui.values[1]); //.toFixed(6));
                        } else if (oid) {
                            if (options.inverted) {
                                ui.value = settings.max - ui.value + settings.min;
                            }
                            vis.setValue(oid, ui.value); //.toFixed(6));
                        }
                    }
                },
            },
            options,
        );

        settings.inverted = settings.inverted === 'true' || settings.inverted === true;

        if (isNaN(settings.value)) {
            settings.value = 0;
        }
        if (isNaN(settings.min)) {
            settings.min = 0;
        }
        if (isNaN(settings.max)) {
            settings.max = 100;
        }
        if (isNaN(settings.step)) {
            settings.step = (settings.max - settings.min) / 100;
        }

        settings.min = parseFloat(settings.min);
        settings.max = parseFloat(settings.max);
        settings.value = parseFloat(settings.value);

        if (settings.inverted) {
            settings.value = settings.max - settings.value + settings.min;
        }
        // Slider erzeugen
        $this.slider(settings);

        // onChange Ereignis
        function onChange(e, newVal) {
            if (e.type === `${oid}.val`) {
                if (!vis.states.attr(`${woid}.val`)) {
                    if (settings.inverted) {
                        oid_val = settings.max - parseFloat(newVal) + settings.min;
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
            } else if (e.type === `${oid2}.val`) {
                // console.log('slider newVal=' + JSON.stringify(newVal));
                // If device not in working state
                if (!vis.states.attr(`${woid2}.val`)) {
                    oid2_val = parseFloat(newVal);
                    if (settings.inverted) {
                        oid2_val = settings.max - parseFloat(newVal) + settings.min;
                    } else {
                        oid2_val = parseFloat(newVal);
                    }
                    if ($this.slider('instance')) {
                        $this.slider('values', [oid_val, oid2_val]);
                    }
                }
            }
            //document.getElementById("NetatmoShowTemp").innerHTML = buildtemptext(data);
        }

        $this.children().css('box-shadow', '0 0 5px 1px black');

        var bound = [];
        if (oid) {
            vis.states.bind(`${oid}.val`, onChange);
            bound.push(`${oid}.val`);
        }

        if (oid2) {
            vis.states.bind(`${oid2}.val`, onChange);
            bound.push(`${oid2}.val`);

            oid_val = vis.states.attr(`${oid}.val`);
            oid2_val = vis.states.attr(`${oid2}.val`);

            if (settings.inverted) {
                oid_val = settings.max - oid_val + settings.min;
                oid2_val = settings.max - oid2_val + settings.min;
            }
            $this.slider('values', [oid_val, oid2_val]);
        }

        if (bound.length) {
            // remember all ids, that bound
            $this
                .parent()
                .parent()
                .data('bound', bound)
                // remember bind handler
                .data('bindHandler', onChange);
        }
    },

    //Refresh API using trigger
    getLogoandAPItrigger: function (el, oid, data) {
        const element = $(el);
        element.html(buildlogo(data));

        if (!vis.editMode && oid) {
            $(el)
                .parent()
                .on('click touchstart', function () {
                    vis.setValue(oid, true);
                });
        }
    },

    //Refresh Widget from API
    getAPIrefresh: function (el, oid, data) {
        const element = $(el);
        element.html(buildrefresh(data));

        if (!vis.editMode && oid) {
            $(el)
                .parent()
                .on('click touchstart', function () {
                    vis.setValue(oid, true);
                });
        }
    },

    //create title
    gettitle: function (el, wid, data) {
        const bound = [];
        const $wid = $(`#${wid}`);
        const element = $(el);
        element.html(buildtitle(data));

        function onChange() {
            element.html(buildtitle(data));
        }

        if (data.oid) {
            vis.states.bind(`${data.oid}.val`, onChange);
            bound.push(`${data.oid}.val`);
        }

        if (bound.length) {
            // remember all ids, that bound
            $wid.data('bound', bound);
            // remember bind handler
            $wid.data('bindHandler', onChange);
        }
    },

    //create window open
    getrunning: function (el, wid, data) {
        const bound = [];
        const $wid = $(`#${wid}`);
        const element = $(el);
        element.html(buildrunning(data));

        function onChange() {
            element.html(buildrunning(data));
        }

        if (data.running_oid) {
            vis.states.bind(`${data.running_oid}.val`, onChange);
            bound.push(`${data.running_oid}.val`);
        }

        if (bound.length) {
            // remember all ids, that bound
            $wid.data('bound', bound);
            // remember bind handler
            $wid.data('bindHandler', onChange);
        }
    },

    //create window open
    getwindowopen: function (el, wid, data) {
        const bound = [];
        const $wid = $(`#${wid}`);
        const element = $(el);
        element.html(buildwindowopen(data));

        function onChange() {
            element.html(buildwindowopen(data));
        }

        if (data.windowopen_oid) {
            vis.states.bind(`${data.windowopen_oid}.val`, onChange);
            bound.push(`${data.windowopen_oid}.val`);
        }

        if (bound.length) {
            // remember all ids, that bound
            $wid.data('bound', bound);
            // remember bind handler
            $wid.data('bindHandler', onChange);
        }
    },

    //create reachable
    getreachable: function (el, wid, data) {
        const bound = [];
        const $wid = $(`#${wid}`);
        const element = $(el);
        element.html(buildreachable(data));

        function onChange() {
            element.html(buildreachable(data));
        }

        if (data.reachable_oid) {
            vis.states.bind(`${data.reachable_oid}.val`, onChange);
            bound.push(`${data.reachable_oid}.val`);
        }

        if (bound.length) {
            // remember all ids, that bound
            $wid.data('bound', bound);
            // remember bind handler
            $wid.data('bindHandler', onChange);
        }
    },

    //create anticipating
    getanticipating: function (el, wid, data) {
        const bound = [];
        const $wid = $(`#${wid}`);
        const element = $(el);
        element.html(buildanticipating(data));

        function onChange() {
            element.html(buildanticipating(data));
        }

        if (data.anticipating_oid) {
            vis.states.bind(`${data.anticipating_oid}.val`, onChange);
            bound.push(`${data.anticipating_oid}.val`);
        }

        if (bound.length) {
            // remember all ids, that bound
            $wid.data('bound', bound);
            // remember bind handler
            $wid.data('bindHandler', onChange);
        }
    },

    //create temperatur information
    gettemperatures: function (el, wid, data) {
        const bound = [];
        const $wid = $(`#${wid}`);
        const element = $(el);
        element.html(buildtemptext(data));

        function onChange() {
            element.html(buildtemptext(data));
        }

        if (data.oid) {
            vis.states.bind(`${data.oid}.val`, onChange);
            bound.push(`${data.oid}.val`);
        }
        if (data.temp_oid) {
            vis.states.bind(`${data.temp_oid}.val`, onChange);
            bound.push(`${data.temp_oid}.val`);
        }
        if (data.act_oid) {
            vis.states.bind(`${data.act_oid}.val`, onChange);
            bound.push(`${data.act_oid}.val`);
        }
        if (bound.length) {
            // remember all ids, that bound
            $wid.data('bound', bound);
            // remember bind handler
            $wid.data('bindHandler', onChange);
        }
    },
};

// Netetamo Energy main
vis.binds['netatmo-energy'] = {
    version: '0.1.0',
    showVersion: function () {
        if (vis.binds['netatmo-energy'].version) {
            console.log(`Version netatmo-energy: ${vis.binds['netatmo-energy'].version}`);
            vis.binds['netatmo-energy'].version = null;
        }
    },

    //create dynamic attributes by changing oid
    getDynamicAttributes: function (wid, view, value, attr, isCss) {
        const obj = vis.objects[value];
        var changed = [];

        if (obj && obj.common && obj.common.role == 'level.temperature') {
            // immer updaten
            var roles = [];
            roles.push('value.temperature');
            roles.push('valve.temperature');
            roles.push('value.roomname');
            roles.push('indicator.window');
            roles.push('indicator.anticipating');
            roles.push('indicator.reachable');

            /*if (!vis.views[view].widgets[wid].data.reachable_oid) {
				roles.push('indicator.reachable');
			}*/

            if (roles.length) {
                const result = vis.findByRoles(value, roles);
                if (result) {
                    for (const r in result) {
                        const position = result[r].indexOf('.homes.');
                        switch (r) {
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
                                if (position >= 0) {
                                    if (!vis.views[view].widgets[wid].data.refr_oid) {
                                        changed.push('refr_oid');
                                        vis.views[view].widgets[wid].data.refr_oid = `${result[r].substring(
                                            0,
                                            position + 1,
                                        )}energyAPP.trigger.refresh_structure`;
                                        vis.widgets[wid].data.refr_oid = `${result[r].substring(
                                            0,
                                            position + 1,
                                        )}energyAPP.trigger.refresh_structure`;
                                    }
                                    if (!vis.views[view].widgets[wid].data.upd_oid) {
                                        changed.push('upd_oid');
                                        vis.views[view].widgets[wid].data.upd_oid =
                                            `${result[r].substring(0, position + 1)}energyAPP.trigger.applychanges`;
                                        vis.widgets[wid].data.upd_oid =
                                            `${result[r].substring(0, position + 1)}energyAPP.trigger.applychanges`;
                                    }
                                    if (!vis.views[view].widgets[wid].data.running_oid) {
                                        changed.push('running_oid');
                                        vis.views[view].widgets[wid].data.running_oid =
                                            `${result[r].substring(0, position + 1)}energyAPP.status.running`;
                                        vis.widgets[wid].data.running_oid =
                                            `${result[r].substring(0, position + 1)}energyAPP.status.running`;
                                    }
                                }
                                break;
                            case 'indicator.window':
                                changed.push('windowopen_oid'); // remember attr to update it
                                vis.views[view].widgets[wid].data.windowopen_oid = result[r];
                                vis.widgets[wid].data.windowopen_oid = result[r];
                                break;
                            case 'indicator.anticipating':
                                changed.push('anticipating_oid'); // remember attr to update it
                                vis.views[view].widgets[wid].data.anticipating_oid = result[r];
                                vis.widgets[wid].data.anticipating_oid = result[r];
                                break;
                            case 'indicator.reachable':
                                changed.push('reachable_oid'); // remember attr to update it
                                vis.views[view].widgets[wid].data.reachable_oid = result[r];
                                vis.widgets[wid].data.reachable_oid = result[r];
                                break;
                        }
                    }
                }
            }
        }
        return changed.length ? changed : null;
    },
};

vis.binds['netatmo-energy'].showVersion();
