import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:opencourtapp/home_screen.dart';
import 'package:opencourtapp/main_campus.dart';
import 'package:opencourtapp/south_campus.dart';
import 'package:opencourtapp/west_campus.dart';

// Function to convert hex color string to Color object
Color hexStringToColor(String hexColor) {
  hexColor = hexColor.toUpperCase().replaceAll("#", "");
  if (hexColor.length == 6) {
    hexColor = "FF" + hexColor;
  }
  return Color(int.parse(hexColor, radix: 16));
}

class MapScreen extends StatefulWidget {
  const MapScreen({Key? key}) : super(key: key);

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final Completer<GoogleMapController> _controller = Completer();
  int _checkInCount = 0;

  static const CameraPosition _initialPosition = CameraPosition(
    target: LatLng(40.03603365942587, -75.34103877887395),
    zoom: 17,
  );

  final List<Marker> myMarker = [];
  final List<Marker> markerList = const [
     Marker(markerId: MarkerId('Alumni Hall'),
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
      position: LatLng(40.033733665145206, -75.33817067654877),
      infoWindow: InfoWindow(
        title: 'Nevin 1',
      ),
    ),
    Marker(markerId: MarkerId('Nevin 2'),
      position: LatLng(40.03365027942263, -75.3382937877755),
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

  void initState() {
    super.initState();
    myMarker.addAll(markerList);
    // packData();
  }

  Future<Position> getUserLocation() async
  {
    await Geolocator.requestPermission().then((value) 
    {

    }).onError((error, stackTrace) 
    {
      print('error$error');
    });

    return await Geolocator.getCurrentPosition();
  }

  packData()
  {
    getUserLocation().then((value) async
    {
      print('My Location');
      print('${value.latitude} ${value.longitude}');

      myMarker.add(
        Marker(
          markerId: const MarkerId('My Location'),
          position: LatLng(value.latitude, value.longitude),
          infoWindow: InfoWindow(
            title: 'My Location',
          )
        )
      );
      CameraPosition cameraPosition = CameraPosition(
        target: LatLng(value.latitude, value.longitude),
        zoom: 17
      );

      final GoogleMapController controller = await _controller.future;

      controller.animateCamera(CameraUpdate.newCameraPosition(cameraPosition));
      setState((){
        
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              hexStringToColor("81b1ce"),
              hexStringToColor("151269"),
              hexStringToColor("81b1ce")
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: EdgeInsets.only(top: 16, bottom: 16),
                child: ElevatedButton(
                  child: Text("Back to Homepage"),
                  onPressed: () {
                    Navigator.push(context, MaterialPageRoute(builder: (context) => HomeScreen()));
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
                ),
              ),
              Padding(
                padding: EdgeInsets.only(top: 16, bottom: 16),
                child: ElevatedButton(
                  child: Text("Check into Main Campus"),
                  onPressed: () {
                    Navigator.push(context, MaterialPageRoute(builder: (context) => MainCampus()));
                  },
                ),
              ),
              Padding(
                padding: EdgeInsets.only(top: 16, bottom: 16),
                child: ElevatedButton(
                  child: Text("Check into South Campus"),
                  onPressed: () {
                    Navigator.push(context, MaterialPageRoute(builder: (context) => SouthCampus()));
                  },
                ),
              ),
              Padding(
                padding: EdgeInsets.only(top: 16, bottom: 16),
                child: ElevatedButton(
                  child: Text("Check into West Campus"),
                  onPressed: () {
                    Navigator.push(context, MaterialPageRoute(builder: (context) => WestCampus()));
                  },
                ),
              ),
            ],
          ),
        ),
        ),
      ),
      floatingActionButton : FloatingActionButton(
        onPressed: () 
          {
            packData();
          },
          child: Icon(Icons.radio_button_off),
      ),
    );
  }
}
