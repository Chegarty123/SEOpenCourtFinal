import 'package:flutter/material.dart';
import 'package:opencourtapp/color_utils.dart';
import 'package:opencourtapp/signin_screen.dart';
import 'package:opencourtapp/map_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late PageController _pageController;
  int totalPage = 3;

  void _onScroll(){
  }


  @override
  void initState() {
    _pageController
      = PageController(
          initialPage: 0,
      )..addListener(_onScroll);

      super.initState();
  }  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Home'),
        actions: <Widget>[
          IconButton(
            icon: Icon(Icons.logout),
            onPressed: () {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (context) => SignInScreen()),
              );
            },
          ),
        ],
      ),



      body: PageView(
        controller: _pageController,
        children: <Widget>[
          makePage(
            page: 1,
            image: 'assets/images/west.jpeg',
            title: "West Campus",
            description: 'Contains a selection of oudoor courts, as well as an indoor facility that has a total of 6 different hoops.'  
          ),
          makePage(
            page: 2,
            image: 'assets/images/main.jpeg',
            title: 'Main Campus',
            description: "The area of campus with the most amount of choices. Contains a total of 7 different full courts that make up the Driscoll outdoor courts, as well as the indoor courts of Alumni Hall and Nevin Fieldhouse."  
          ),
          makePage(
            page: 3,
            image: 'assets/images/south.jpeg',
            title: 'South Campus',
            description: 'South Campus is made up of one full outdoor court that contains 2 different hoops.'   
          ),
        ],       
      )
    );
  }

  Widget makePage({image, title, description, page}){
    return Container(
      decoration: BoxDecoration(
        image: DecorationImage(
          image: AssetImage(image),
          fit: BoxFit.cover
          )
      ),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.bottomRight,
            stops: [0.3, 0.9],
            colors:[
              Colors.black.withOpacity(0.9),
              Colors.black.withOpacity(0.2),
            ]
          )
        ),
        child: Padding(
          padding: EdgeInsets.all(20),
          child: Column(
            children: <Widget>[
              SizedBox(
                height: 40,
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: <Widget>[
                  Text(page.toString(), style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.bold),),
                  Text('/'+ totalPage.toString(), style: TextStyle(color: Colors.white, fontSize: 15),)
                ],
              ),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(title, style: TextStyle(color: Colors.white, fontSize: 50, fontWeight: FontWeight.bold),),
                    SizedBox(
                      height: 20,
                    ),
                    Row(
                      children: <Widget>[
                        Container(
                          margin: EdgeInsets.only(right: 3), 
                          child: Icon(Icons.star, color: Colors.yellow, size: 15),
                        ),
                        Container(
                          margin: EdgeInsets.only(right: 3), 
                          child: Icon(Icons.star, color: Colors.yellow, size: 15),
                        ),
                        Container(
                          margin: EdgeInsets.only(right: 3), 
                          child: Icon(Icons.star, color: Colors.yellow, size: 15),
                        ),
                        Container(
                          margin: EdgeInsets.only(right: 3), 
                          child: Icon(Icons.star, color: Colors.yellow, size: 15),
                        ),
                        Container(
                          margin: EdgeInsets.only(right: 5), 
                          child: Icon(Icons.star, color: Colors.grey, size: 15),
                        ),
                        Text('4.0', style: TextStyle(color: Colors.white70),),
                        Text('(2300)', style: TextStyle(color: Colors.white38, fontSize: 12),),
                      ],
                    ),
                    SizedBox(
                      height: 20,
                    ),
                    Padding(
                      padding: const EdgeInsets.only(right: 50),
                      child: Text(description, style: TextStyle(color: Colors.white.withOpacity(.7), height: 1.9, fontSize: 15),),
                    ),
                    SizedBox(height: 20,),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => MapScreen()),
                        );
                      },
                      child: Text(
                        'READ MORE',
                        style: TextStyle(color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        padding: EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                        ),
                      ),
                    ),
                    SizedBox(height: 30,),
                  ],
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}

  @override
  Widget build(BuildContext context) {
    // TODO: implement build
    throw UnimplementedError();
  }
// Remove the incomplete code block