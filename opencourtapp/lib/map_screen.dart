import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:opencourtapp/home_screen.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({Key? key}) : super(key: key);

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final Completer<GoogleMapController> _controller = Completer();

  static const CameraPosition _initialPosition = CameraPosition(
    target: LatLng(40.03603365942587, -75.34103877887395),
    zoom: 17,
  );

  final List<Marker> myMarker = [];
  final List<Marker> markerList = [
    const Marker(markerId: MarkerId('Alumni Hall'),
      position: LatLng(40.03631213200846, -75.34249255476594),
      infoWindow: InfoWindow(
        title: 'Alumni Hall',
      ),
    ),
    Marker(markerId: MarkerId("St. Mary's Hall"),
      position: LatLng(40.03991467798064, -75.34231166663635),
      infoWindow: InfoWindow(
        title: "St. Mary's Hall",
      ),
    ),
    Marker(markerId: MarkerId('West Campus 1'),
      position: LatLng(40.040239947070596, -75.34438163399271),
      infoWindow: InfoWindow(
        title: 'West Campus 1',
      ),
    ),
    Marker(markerId: MarkerId('West Campus 2'),
      position: LatLng(40.04041856133986, -75.34474029471876),
      infoWindow: InfoWindow(
        title: 'West Campus 2',
      ),
    ),
    Marker(markerId: MarkerId('West Campus 3'),
      position: LatLng(40.04073358404706, -75.34541209481377),
      infoWindow: InfoWindow(
        title: 'West Campus 3',
      ),
    ),
    Marker(markerId: MarkerId('Driscoll 1'),
      position: LatLng(40.035849229210726, -75.33878645889274),
      infoWindow: InfoWindow(
        title: 'Driscoll 1',
      ),
    ),
    Marker(markerId: MarkerId('Driscoll 2'),
      position: LatLng(40.03601318076463, -75.33876546514011),
      infoWindow: InfoWindow(
        title: 'Driscoll 2',
      ),
    ),
    Marker(markerId: MarkerId('Driscoll 3'),
      position: LatLng(40.03624785583238, -75.33885783765166),
      infoWindow: InfoWindow(
        title: 'Driscoll 3',
      ),
    ),
    Marker(markerId: MarkerId('Driscoll 4'),
      position: LatLng(40.03624142638923, -75.3386101113707),
      infoWindow: InfoWindow(
        title: 'Driscoll 4',
      ),
    ),
    Marker(markerId: MarkerId('Nevin 1'),
      position: LatLng(40.03374138317017, -75.33827376365824),
      infoWindow: InfoWindow(
        title: 'Nevin 1',
      ),
    ),
    Marker(markerId: MarkerId('Nevin 2'),
      position: LatLng(40.033654562713224, -75.33814417275917),
      infoWindow: InfoWindow(
        title: 'Nevin 2',
      ),
    ),
    Marker(markerId: MarkerId('South Campus'),
      position: LatLng(40.031856165928225, -75.34074504422149),
      infoWindow: InfoWindow(
        title: 'South Campus',
      ),
    ),
  ];

  @override
  void initState() {
    super.initState();
    myMarker.addAll(markerList);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        body: SafeArea(
            child: Column(children: [
      Padding(
        padding: EdgeInsets.only(top: 16),
        child: ElevatedButton(
          child: Text("Back to Homepage"),
          onPressed: () {
            Navigator.push(
                context, MaterialPageRoute(builder: (context) => HomeScreen()));
          },
        ),
      ),
      Expanded(
          child: GoogleMap(
        initialCameraPosition: _initialPosition,
        mapType: MapType.satellite,
        markers: Set<Marker>.of(myMarker),
        onMapCreated: (GoogleMapController controller) {
          _controller.complete(controller);
        },
      ))
    ])));
  }
}
