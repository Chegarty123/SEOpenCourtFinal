import 'package:flutter/material.dart';
import 'package:opencourtapp/signin_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ElevatedButton(
        child: Text("Logout"),
        onPressed: () {
          Navigator.push(
              context, MaterialPageRoute(builder: (context) => SignInScreen()));
        },
      ),
    );
  }
}
