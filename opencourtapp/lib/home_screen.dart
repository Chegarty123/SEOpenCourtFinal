import 'package:flutter/material.dart';
import 'package:opencourtapp/color_utils.dart';
import 'package:opencourtapp/map_screen.dart';
import 'package:opencourtapp/signin_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            hexStringToColor("0f1056"),
            hexStringToColor("151269"),
            hexStringToColor("81b1ce"),
          ],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Column(
          children: [
            Padding(
              padding: EdgeInsets.only(top: 16),
              child: ElevatedButton(
                child: Text("Logout"),
                onPressed: () {
                  Navigator.push(context,
                      MaterialPageRoute(builder: (context) => SignInScreen()));
                },
              ),
            ),
            Padding(
              padding: EdgeInsets.only(top: 16),
              child: ElevatedButton(
                child: Text("Map Page"),
                onPressed: () {
                  Navigator.push(context,
                      MaterialPageRoute(builder: (context) => MapScreen()));
                },
              ),
            ),
            Expanded(
              child: Center(
                child: Image.asset(
                  "assets/images/logo.png",
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
