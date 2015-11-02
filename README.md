# np.mapillary

@Forked from https://github.com/tangrams/mapillary-explorer


Live demo:

http://spatialhast.github.io/np.mapillary



Changelog:

index.html
	<!-- Sed Default Closed Controls --> <!-- Need Fix -->
	<script src="http://code.jquery.com/jquery-1.11.3.min.js"></script>	
	<script>
		$('.close-button').text('Open Controls');
		$('div.dg.main.a ul').addClass('closed');
    </script>

	
main.js
    var locations = {
        'Oakland': [37.8044, -122.2708, 15],
        'New York': [40.70531887544228, -74.00976419448853, 15],
        'Seattle': [47.5937, -122.3215, 15],
        'Malmö': [55.6060, 13.0010, 15],
		'Kharkiv': [50.0732, 36.2486, 13]
    };
	
    var map_start_location = locations['Kharkiv'];
    var mapillary_client_id = "MkJKbDA0bnZuZlcxeTJHTmFqN3g1dzo0NWY2NDVlYWJhM2Q0ZGZj";	
	
	
    {"keyboardZoomOffset" : .05} -> {"keyboardZoomOffset" : .5}

		

scene.yaml

	type: GeoJSON
	url:  //vector.mapzen.com/osm/all/{z}/{x}/{y}.json?api_key=vector-tiles-PN6Vg8k

	mapillary.max_zoom
		14 -> 18

	mapillary-sequences.properties
		min: 1370000000000
		max: 1469183337901
		
http://hashrocket.com/blog/posts/faster-json-generation-with-postgresql