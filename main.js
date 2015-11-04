/*jslint browser: true*/
/*global Tangram, gui */
var picking = false;
var clicking = false;
map = (function () {
    // 'use strict';

    //
    // Leaflet setup
    //

    var locations = {
		'Kharkiv': [50.0732, 36.2486, 13],
		'Ukraine': [47.8722, 31.8064, 7.1]
    };
	
    var map_start_location = locations['Ukraine'];
    var mapillary_client_id = "WTlZaVBSWmxRX3dQODVTN2gxWVdGUTpjOTBkYzljZWQxOTkxOWIy";

    /*** URL parsing ***/

    // leaflet-style URL hash pattern:
    // #[zoom],[lat],[lng]
    var url_hash = window.location.hash.slice(1, window.location.hash.length).split('/');
    keytext = "";
    window.keytext = keytext;
    valuetext = "";
    window.valuetext = valuetext;

    if (url_hash.length >= 3) {
        map_start_location = [url_hash[1],url_hash[2], url_hash[0]];
        // convert from strings
        map_start_location = map_start_location.map(Number);
    }

    if (url_hash.length == 5) {
        keytext = unescape(url_hash[3]);
        valuetext = unescape(url_hash[4]);
    }

    // Put current state on URL
    window.updateURL = function() {
        var map_latlng = map.getCenter();
        var url_options = [map.getZoom().toFixed(1), map_latlng.lat.toFixed(4), map_latlng.lng.toFixed(4), escape(keytext), escape(valuetext)];
        window.location.hash = url_options.join('/');
    }

    /*** Map ***/

    var map = L.map('map',
        {"keyboardZoomOffset" : .5}
    );

    var layer = Tangram.leafletLayer({
        //scene: 'scene.yaml',
        scene: 'scene.yaml',
        numWorkers: 2,
        attribution: '<a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | &copy; OSM contributors | <a href="https://mapzen.com/" target="_blank">Mapzen</a>',
        unloadInvisibleTiles: false,
        updateWhenIdle: false
    });

    window.layer = layer;
    var scene = layer.scene;
    window.scene = scene;

    // setView expects format ([lat, long], zoom)
    map.setView(map_start_location.slice(0, 3), map_start_location[2]);
    map.on('moveend', updateURL);


    //
    // GUI
    //
    function updateKey(value) {
        keytext = value;

        for (layer in scene.config.layers) {
            if (layer == "earth") continue;
            scene.config.layers[layer].properties.key_text = value;
        }
        // not sure why but this seems to prevent an intermediate step of all-red roads
        // setTimeout(function(){scene.rebuildGeometry();}, 5);
        scene.rebuildGeometry();
        // scene.requestRedraw();
        updateURL(); 
    }

    function updateValue(value) {
        valuetext = value;

        for (layer in scene.config.layers) {
            if (layer == "earth") continue;
            scene.config.layers[layer].properties.value_text = value;
        }
        // not sure why but this seems to prevent an intermediate step of all-red roads
        // setTimeout(function(){scene.rebuildGeometry();}, 5);
        scene.rebuildGeometry();
        // scene.requestRedraw();
        updateURL();            
    }
	
    // Create dat GUI
    var gui = new dat.GUI({ autoPlace: true, hideable: false, width: 300 });
    
	function addGUI () {
        gui.domElement.parentNode.style.zIndex = -10; // make sure GUI is on top of map
        window.gui = gui;

        gui.keyinput = keytext;
        var keyinput = gui.add(gui, 'keyinput').name("key").listen();

        gui.valueinput = valuetext;
        var valueinput = gui.add(gui, 'valueinput').name("value").listen();
        
        updateKey(keytext);
        updateValue(valuetext);
        keyinput.onChange(function(value) {
            updateKey(value);
        });
        valueinput.onChange(function(value) {
            updateValue(value);
        });

        //select input text when you click on it
        keyinput.domElement.id = "keyfilter";
        keyinput.domElement.onclick = function() { this.getElementsByTagName('input')[0].select(); };
        valueinput.domElement.id = "valuefilter";
        valueinput.domElement.onclick = function() { this.getElementsByTagName('input')[0].select(); };

        gui.clear = function() {
            clearValues();
        };
        var clear = gui.add(gui, 'clear')
        
        var now = new Date().getTime();
        gui.min = 1442264400000;
        var min = gui.add(gui, 'min', 1370000000000, now).name("min date");
        min.onChange(function(value) {
            scene.config.layers["mapillary-sequences"].properties.min = value;
            scene.rebuildGeometry();
        });

        gui.max = now;
        var max = gui.add(gui, 'max', 1370000000000, now).name("max date");
        max.onChange(function(value) {
            scene.config.layers["mapillary-sequences"].properties.max = value;
            scene.rebuildGeometry();
        });

        gui.newest = '#00ff00';
        var newest = gui.addColor(gui, 'newest');
        newest.onChange(function(value) {
            scene.config.layers["mapillary-sequences"].properties.newest = value;
            scene.rebuildGeometry();
        });

        gui.oldest = '#0000ff';
        var oldest = gui.addColor(gui, 'oldest');
        oldest.onChange(function(value) {
            scene.config.layers["mapillary-sequences"].properties.oldest = value;
            scene.rebuildGeometry();
            // scene.requestRedraw();
        });
        
    }

	
	
	
    var selectionImage = {};
    var spinner = "";
    var trying = [];
    var xmlhttp = {};

    function getJSON(url, callback) {
        selectionImage.src = spinner;
        xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4) {
                selectionImage.src = "";
                console.log('status:', xmlhttp.status)
                if (xmlhttp.status == 200) {
                    var response = JSON.parse(xmlhttp.responseText);
                    if (typeof(response) == "object") {
                        callback(response);
                        return;
                    }
                } else if (xmlhttp.status > 400) {
                    window.selection_info.removeChild(selectionImage);
                }
            }
        }
        xmlhttp.open("GET", url, true);
        xmlhttp.send();
    }

    function fetchMapillaryImage(location) {
        // use v2 api
        var url = "https://a.mapillary.com/v2/search/im/close2?lat=" + location.lat + "&lon=" + location.lng + "&client_id=" + mapillary_client_id

        // only allow one request at a time
        if (trying.length > 0) {
            trying.pop();
            xmlhttp.abort();
        }
        trying.push(1);
        getJSON(url, handle);

        function handle(data) {
            trying.pop();
            key = data.key
            if (typeof(key) != "undefined") {
                // set src of the popup's image to the returned url
                var imageurl = "http://images.mapillary.com/" + key + "/thumb-320.jpg";
                selectionImage.src = imageurl;
            } else {
                selectionImage.src = "";
            }
            selectionImage.style.margin = "0";
        }
    }

    // Feature selection
    function initFeatureSelection () {
        // build selection info popup
        window.selection_info = document.createElement('div');
        selection_info.setAttribute('class', 'label');
        selection_info.style.display = 'block';
        selection_info.style.zindex = 1000;

        
        // Show popup when hovering over an interactive feature
        scene.container.addEventListener('mousemove', function (event) {
            if (picking && !clicking) return;
            var pixel = { x: event.clientX, y: event.clientY };

            var latlng = map.layerPointToLatLng(new L.Point(pixel.x, pixel.y));

            scene.getFeatureAt(pixel).then(function(selection) {    
                clearLabel();
                if (!selection) {
                    return;
                }
                var feature = selection.feature;
                if (feature != null) {
                    if (feature.properties != null) {
                        selection_info.style.left = (pixel.x + 5) + 'px';
                        selection_info.style.top = (pixel.y + 15) + 'px';
                        var obj = JSON.parse(JSON.stringify(feature.properties));
                        // clearLabel();
                        for (x in feature.properties) {
                            if (x == "keys" || x == "cas" ) continue;
                            val = feature.properties[x]
                            var line = document.createElement('span');
                            line.setAttribute("class", "labelLine");
                            line.setAttribute("key", x);
                            line.setAttribute("value", val);
                            line.innerHTML = x + " : " + val;
                            line.onmousedown = function(e){e.stopPropagation()};
                            line.onmouseup = function(e){setValuesFromSpan(e)};
                            selection_info.appendChild(line);
                        }
                    scene.container.appendChild(selection_info);
                    selectionImage = document.createElement("img");
                    selectionImage.src = "spinner.gif";
                    spinner = selectionImage.src;
                    selection_info.appendChild(selectionImage);
                    selectionImage.style.display = "block";
                    // selectionImage.style.clear = "left";
                    selectionImage.style.margin = "10px auto";

                    fetchMapillaryImage(latlng);

                    }
                }
            });

            // Don't show labels while panning
            if (scene.panning == true) clearLabel();

        });

        // empty label
        function clearLabel() {
            if (selection_info.parentNode == null) return;
            while (selection_info.firstChild) {
                selection_info.removeChild(selection_info.firstChild);
            }
            selection_info.parentNode.removeChild(selection_info);
        }

        var clickhash = map.getCenter();

        // catch mousedown
        scene.container.onmousedown = function (event) {
            clicking = true;
            clickhash = map.getCenter().lat + map.getCenter().lng;
        };

        // catch mouseup
        scene.container.onmouseup = function (event) {
            clicking = false;
            // check to see if the mouse moved since the mousedown
            hashcheck = map.getCenter().lat + map.getCenter().lng;
            if ( clickhash == hashcheck ) {
                // no mousemove, it was a click
                picking = !picking;
                var menuVisible = (selection_info.parentNode != null);
                if (!menuVisible && picking || !picking) {
                    // clicked on empty space, clear filter
                    clearValues();
                }
            } else {
                // mousemove, it was a drag
                picking = false;
            }
        };
    }

    window.clearValues = function() {

        if (selection_info.parentNode != null) selection_info.parentNode.removeChild(selection_info);
        picking = false;
        keytext = "";
        valuetext = "";
        gui.keytext= "";
        gui.keyinput= "";
        gui.valuetext= "";
        gui.valueinput= "";
        updateKey(keytext);
        updateValue(valuetext);
        updateURL();
    }
    window.setValuesFromSpan = function(e) {
        span = e.target;
        keytext = span.getAttribute("key");
        valuetext = span.getAttribute("value");
        gui.keytext=span.getAttribute("key");
        gui.keyinput=span.getAttribute("key");
        gui.valuetext=span.getAttribute("value");
        gui.valueinput=span.getAttribute("value");
        updateKey(keytext);
        updateValue(valuetext);
        updateURL();
        e.stopPropagation();
        return false;
    }

    // Add map
    window.addEventListener('load', function () {
        // Scene initialized
        layer.on('init', function() {
            addGUI();
            var keyfilter = document.getElementById('keyfilter').getElementsByTagName('input')[0];
            if (keyfilter.value.length == 0) keyfilter.focus();
            else keyfilter.select();

            initFeatureSelection();
        });
        layer.addTo(map);
    });

	
	
var nature_conservation_polygon = L.geoJson(null, {
    style: function(feature) {
        if (feature.properties.name === null) {
            return {
                color: "#ff4c4c",
                fill: true,
                opacity: 0.7,
                weight: 2
            };
        } else
            return {
                color: "#9ace00",
                fill: true,
                opacity: 0.7,
                weight: 2
            };
    },
    onEachFeature: function(feature, layer_nature_conservation_polygon) {
        /*if (feature.properties) {
                    layer_nature_conservation_polygon.bindPopup(feature.properties.name, {
                        closeButton: true,
                        minWidth: 120,
                        minHeight: 25
                    });
            }*/
        layer_nature_conservation_polygon.on({
            mouseover: function(e) {
                var layer_nature_conservation_polygon = e.target;
                layer_nature_conservation_polygon.setStyle({
                    weight: 3,
                    color: "#00FFFF",
                    opacity: 1
                });
                if (!L.Browser.ie && !L.Browser.opera) {
                    layer_nature_conservation_polygon.bringToFront();
                }

				var name = feature.properties.name == null ? '' : '<b>name: </b>' + feature.properties.name + '<br>';
				var name_uk = feature.properties.name_uk == null ? '' : '<b>name_uk: </b>' + feature.properties.name_uk + '<br>';
				var name_ru = feature.properties.name_ru == null ? '' : '<b>name_ru: </b>' + feature.properties.name_ru + '<br>';
				var name_en = feature.properties.name_en == null ? '' : '<b>name_en: </b>' + feature.properties.name_en + '<br>';
				var boundary = feature.properties.boundary == null ? '' : '<b>boundary: </b>' + feature.properties.boundary + '<br>';
				var prot_class = feature.properties.prot_class == null ? '' : '<b>prot_class: </b>' + feature.properties.prot_class + '<br>';
				var prot_stat = feature.properties.prot_stat == null ? '' : '<b>prot_stat: </b>' + feature.properties.prot_stat + '<br>';
				var prot_title = feature.properties.prot_title == null ? '' : '<b>prot_title: </b>' + feature.properties.prot_title + '<br>';
				var naturalt = feature.properties.naturalt == null ? '' : '<b>natural: </b>' + feature.properties.naturalt + '<br>';
				var amenity = feature.properties.amenity == null ? '' : '<b>amenity: </b>' + feature.properties.amenity + '<br>';
				var leisure = feature.properties.leisure == null ? '' : '<b>leisure: </b>' + feature.properties.leisure + '<br>';
				var landuse = feature.properties.landuse == null ? '' : '<b>landuse: </b>' + feature.properties.landuse + '<br>';
				var historic = feature.properties.historic == null ? '' : '<b>historic: </b>' + feature.properties.historic + '<br>';
				var tourism = feature.properties.tourism == null ? '' : '<b>tourism: </b>' + feature.properties.tourism + '<br>';
				var operator = feature.properties.operator == null ? '' : '<b>operator: </b>' + feature.properties.operator + '<br>';
				var place = feature.properties.place == null ? '' : '<b>place: </b>' + feature.properties.place + '<br>';
				var website = feature.properties.website == null ? '' : '<b>website: </b>' + feature.properties.website + '<br>';
				var wikipedia = feature.properties.wikipedia == null ? '' : '<b>wikipedia: </b>' + feature.properties.wikipedia + '<br>';
				var note = feature.properties.note == null ? '' : '<b>note: </b>' + feature.properties.note + '<br>';
				var area = feature.properties.area == null ? '' : '<b>area: </b>' + feature.properties.area + ' sq. km';

			    var content = name + name_uk + name_ru + name_en + boundary + prot_class + prot_stat + prot_title + naturalt + amenity + leisure + landuse + historic + tourism + operator + place + website + wikipedia + note + area;

                nature_conservation_polygon.bindLabel(content + '<br>' + '<b style = "color: green">Use double-click to move on http://www.openstreetmap.org page</b>', {
                    direction: 'auto'
                }).addTo(map);
		
/*				
                if (feature.properties.name === null) {
                    nature_conservation_polygon.bindLabel('No name', {
                        direction: 'auto'
                    }).addTo(map);
                } else
                    nature_conservation_polygon.bindLabel(feature.properties.name, {
                        direction: 'auto'
                    }).addTo(map);
*/					
	
            },
            mouseout: function(e) {
                nature_conservation_polygon.resetStyle(e.target);
            },
            dblclick: function(e) {
				var url = 'http://www.openstreetmap.org/' + (feature.properties.osm_id < 0 ? 'relation/' + feature.properties.osm_id * (-1) : 'way/' + feature.properties.osm_id);
				window.open(url);
            }
        });
    }
});
$.getJSON("data/nature_conservation_polygon.geojson", function(data) {
    nature_conservation_polygon.addData(data);
});	
	
nature_conservation_polygon.addTo(map);	
	
	
	
	
	
    return map;

}());

