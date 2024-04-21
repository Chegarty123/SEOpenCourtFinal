import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/widgets.dart';
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

class MainCampus extends StatefulWidget {
  const MainCampus({Key? key}) : super(key: key);

  @override
  State<MainCampus> createState() => _MapScreenState();
}

class _MapScreenState extends State<MainCampus> {
  int _checkInCount = 0;
  int _checkInCount2 = 0;
  int _checkInCount3 = 0;
  int _checkInCount4 = 0;
  int _checkInCount5 = 0;
  int _checkInCount6 = 0;
  int _checkInCount7 = 0;

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
                  'Main Campus',
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
                    child: Text('Alumni Hall - $_checkInCount player(s)'),
                    onPressed: () {
                      setState(() {
                        _checkInCount++;
                      });
                    },
                  ),
                  ElevatedButton(
                    child: Text('Driscoll 1 - $_checkInCount2 player(s)'),
                    onPressed: () {
                      setState(() {
                        _checkInCount2++;
                      });
                    },
                  ),
                ElevatedButton(
                  child: Text('Driscoll 2 - $_checkInCount3 player(s)'),
                  onPressed: () {
                    setState(() {
                      _checkInCount3++;
                    });
                  },
                ),
                ElevatedButton(
                  child: Text('Driscoll 3 - $_checkInCount4 player(s)'),
                  onPressed: () {
                    setState(() {
                      _checkInCount4++;
                    });
                  },
                ),
                ElevatedButton(
                  child: Text('Driscoll 4 - $_checkInCount5 player(s)'),
                  onPressed: () {
                    setState(() {
                      _checkInCount5++;
                    });
                  },
                ),
                ElevatedButton(
                  child: Text('Nevin 1 - $_checkInCount6 player(s)'),
                  onPressed: () {
                    setState(() {
                      _checkInCount6++;
                    });
                  },
                ),
                ElevatedButton(
                  child: Text('Nevin 2 - $_checkInCount7 player(s)'),
                  onPressed: () {
                    setState(() {
                      _checkInCount7++;
                    });
                  },
                ),
              ],
            ),
            Row(
                 mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Padding(
                  padding: EdgeInsets.symmetric(vertical: 25),
                  child: Image.asset(
                    "/images/main.jpeg",
                    width: 625,
                    height: 600,
                  )
                ),
              ],)
          ],
        ),
      ),
      )
    );
  }
}
