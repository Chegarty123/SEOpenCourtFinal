import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:opencourtapp/home_screen.dart';

// Function to convert hex color string to Color object
Color hexStringToColor(String hexColor) {
  hexColor = hexColor.toUpperCase().replaceAll("#", "");
  if (hexColor.length == 6) {
    hexColor = "FF" + hexColor;
  }
  return Color(int.parse(hexColor, radix: 16));
}

class WestCampus extends StatefulWidget {
  const WestCampus({Key? key}) : super(key: key);

  @override
  State<WestCampus> createState() => _MapScreenState();
}

class _MapScreenState extends State<WestCampus> {
  int _checkInCount1 = 0;
  int _checkInCount2 = 0;
  int _checkInCount3 = 0;
int _checkInCount4 = 0;

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
                  child: Text("Back to Homepage"),
                  onPressed: () {
                    Navigator.push(context, MaterialPageRoute(builder: (context) => HomeScreen()));
                  },
                ),
              ),
              Center(
                child: Text(
                  'West Campus',
                  style: TextStyle(fontSize: 50, fontWeight: FontWeight.bold, color: Colors.white,),
                  textAlign: TextAlign.center,
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ElevatedButton(
                    child: Text('Check In - St. Marys ($_checkInCount1)'),
                    onPressed: () {
                      setState(() {
                        _checkInCount1++;
                      });
                    },
                  ),
                  ElevatedButton(
                    child: Text('Check In - West Court 1 ($_checkInCount2)'),
                    onPressed: () {
                      setState(() {
                        _checkInCount2++;
                      });
                    },
                  ),
                  ElevatedButton(
                    child: Text('Check In - West Court 2 ($_checkInCount3)'),
                    onPressed: () {
                      setState(() {
                        _checkInCount3++;
                      });
                    },
                  ),
                  ElevatedButton(
                    child: Text('Check In - West Court 3 ($_checkInCount4)'),
                    onPressed: () {
                      setState(() {
                        _checkInCount4++;
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
