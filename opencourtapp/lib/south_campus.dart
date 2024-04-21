import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:opencourtapp/home_screen.dart';
import 'package:opencourtapp/map_screen.dart';

// Function to convert hex color string to Color object
Color hexStringToColor(String hexColor) {
  hexColor = hexColor.toUpperCase().replaceAll("#", "");
  if (hexColor.length == 6) {
    hexColor = "FF" + hexColor;
  }
  return Color(int.parse(hexColor, radix: 16));
}

class SouthCampus extends StatefulWidget {
  const SouthCampus({Key? key}) : super(key: key);

  @override
  State<SouthCampus> createState() => _MapScreenState();
}

class _MapScreenState extends State<SouthCampus> {
  int _checkInCount = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              hexStringToColor("0f1056"),
              hexStringToColor("151269"),
              hexStringToColor("81b1ce")
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Padding(
                padding: EdgeInsets.only(top: 16, bottom: 16),
                child: ElevatedButton(
                  child: Text("Back to Map Page"),
                  onPressed: () {
                    Navigator.push(context, MaterialPageRoute(builder: (context) => MapScreen()));
                  },
                ),
              ),
              Center(
                child: Text(
                  'South Campus',
                  style: TextStyle(
                    fontSize: 50,
                    fontWeight: FontWeight.bold,
                    color: Colors.white, // Set text color to white
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ElevatedButton(
                    child: Text('South Court - $_checkInCount player(s)'),
                    onPressed: () {
                      setState(() {
                        _checkInCount++;
                      });
                    },
                  ),
                ],
              ),  
            ],
          ),
        ),
      ),
    );
  }
}
