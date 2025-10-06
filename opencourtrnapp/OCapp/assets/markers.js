const markers = [
    {
        "name": "South Campus Court",
        "coordinates": {
            "latitude": 40.03183612267258,
            "longitude": -75.34072850475515,
            "latitudeDelta": 0.0005,
            "longitudeDelta": 0.0005,

        },
        "description": "The outdoor full basketball court on Villanova University's South Campus, featuring two basketball hoops.",
        "image": "https://www1.villanova.edu/content/university/residence-life/residence-halls/_jcr_content/pagecontent/displaybox_122343007/par_container/image.img.jpg/1606160259715.jpg",
    },
    {
        "name": "West Campus Court 1",
        "coordinates": {
            "latitude": 40.040236688354774,
            "longitude": -75.3443793087503,
            "latitudeDelta": 0.0005,
            "longitudeDelta": 0.0005,

        },
        "description": "One of three outdoor full basketball courts on Villanova University's West Campus, featuring two basketball hoops.",
        "image": "https://www.internhousinghub.com/sites/default/files/2025-02/West%20Campus%20outside%20walkway.jpg",
    },
    {
        "name": "West Campus Court 2",
        "coordinates": {
            "latitude": 40.04040712698465,
            "longitude": -75.34474140696871,
            "latitudeDelta": 0.0005,
            "longitudeDelta": 0.0005,

        },
        "description": "One of three outdoor full basketball courts on Villanova University's West Campus, featuring two basketball hoops.",
        "image": "https://www.internhousinghub.com/sites/default/files/2025-02/West%20Campus%20outside%20walkway.jpg",
    },
    {
        "name": "West Campus Court 3",
        "coordinates": {
            "latitude": 40.04073978910447,
            "longitude": -75.34540659481569,
            "latitudeDelta": 0.0005,
            "longitudeDelta": 0.0005,

        },
        "description": "One of three outdoor full basketball courts on Villanova University's West Campus, featuring two basketball hoops.",
        "image": "https://www.internhousinghub.com/sites/default/files/2025-02/West%20Campus%20outside%20walkway.jpg",
    },
    {
        "name": "St. Mary's Hall Court",
        "coordinates": {
            "latitude": 40.03998616332942,
            "longitude": -75.342177215135,
            "latitudeDelta": 0.0005,
            "longitudeDelta": 0.0005,

        },
        "description": "The indoor full basketball court in St. Mary's Hall's Gymnasium on Villanova University's West Campus, featuring a total of six basketball hoops.",
        "image": "https://www1.villanova.edu/content/university/residence-life/residence-halls/st-marys-hall/_jcr_content/pagecontent/displaybox/par_container/image.img.jpg/1751397977315.jpg",
    },
    {
        "name": "Driscoll Court 1",
        "coordinates": {
            "latitude": 40.03624675245199, 
            "longitude": -75.33882051241842,
            "latitudeDelta": 0.0005,
            "longitudeDelta": 0.0005,

        },
        "description": "One of four outdoor full basketball courts outside of Driscoll Hall on Villanova University's Main Campus, featuring two basketball hoops.",
        "image": "https://www1.villanova.edu/content/university/academic-enterprise/student-support/education-abroad/advising/_jcr_content/pagecontent/vusection/par_section/displaybox_copy_1792738099/par_container/image.img.jpg/1692717949587.jpg",
    },
    {
        "name": "Driscoll Court 2",
        "coordinates": {
            "latitude": 40.03623906077393, 
            "longitude": -75.33863282085471,
            "latitudeDelta": 0.0005,
            "longitudeDelta": 0.0005,

        },
        "description": "One of four outdoor full basketball courts outside of Driscoll Hall on Villanova University's Main Campus, featuring two basketball hoops.",
        "image": "https://www1.villanova.edu/content/university/academic-enterprise/student-support/education-abroad/advising/_jcr_content/pagecontent/vusection/par_section/displaybox_copy_1792738099/par_container/image.img.jpg/1692717949587.jpg",
    },
    {
        "name": "Driscoll Court 3",
        "coordinates": {
            "latitude": 40.03599384547394,  
            "longitude": -75.33875236023547,
            "latitudeDelta": 0.0005,
            "longitudeDelta": 0.0005,

        },
        "description": "One of four outdoor full basketball courts outside of Driscoll Hall on Villanova University's Main Campus, featuring two basketball hoops.",
        "image": "https://www1.villanova.edu/content/university/academic-enterprise/student-support/education-abroad/advising/_jcr_content/pagecontent/vusection/par_section/displaybox_copy_1792738099/par_container/image.img.jpg/1692717949587.jpg",
    },
    {
        "name": "Driscoll Court 4",
        "coordinates": {
            "latitude": 40.03586982851175,  
            "longitude": -75.33875776893687,
            "latitudeDelta": 0.0005,
            "longitudeDelta": 0.0005,

        },
        "description": "One of four outdoor full basketball courts outside of Driscoll Hall on Villanova University's Main Campus, featuring two basketball hoops.",
        "image": "https://www1.villanova.edu/content/university/academic-enterprise/student-support/education-abroad/advising/_jcr_content/pagecontent/vusection/par_section/displaybox_copy_1792738099/par_container/image.img.jpg/1692717949587.jpg",
    },
    {
        "name": "Alumni Hall Court",
        "coordinates": {
            "latitude": 40.036318440119736,  
            "longitude": -75.34249087687117,
            "latitudeDelta": 0.0005,
            "longitudeDelta": 0.0005,

        },
        "description": "The indoor full basketball court in Alumni Hall on Villanova University's Main Campus, featuring two basketball hoops.",
        "image": "https://www1.villanova.edu/content/university/residence-life/residence-halls/alumni-hall/_jcr_content/pagecontent/displaybox/par_container/image.img.jpg/1606160266096.jpg",
    },
    {
        "name": "Nevin Court 1",
        "coordinates": {
            "latitude": 40.03378544317585,   
            "longitude": -75.33818573929003,
            "latitudeDelta": 0.0005,
            "longitudeDelta": 0.0005,

        },
        "description": "One of two indoor full basketball courts in Jake Nevin Field House at Villanova University, featuring a total of six basketball hoops.",
        "image": "https://i.ytimg.com/vi/pBmAJcOq1ao/maxresdefault.jpg",
    },
    {
        "name": "Nevin Court 2",
        "coordinates": {
            "latitude": 40.03367554210464,   
            "longitude": -75.33832608618427,
            "latitudeDelta": 0.0005,
            "longitudeDelta": 0.0005,

        },
        "description": "One of two indoor full basketball courts in Jake Nevin Field House at Villanova University, featuring a total of six basketball hoops.",
        "image": "https://i.ytimg.com/vi/pBmAJcOq1ao/maxresdefault.jpg",
    },
    {
        "name": "Delurey Court",
        "coordinates": {
            "latitude": 40.03650605437342,    
            "longitude": -75.34673724988389,
            "latitudeDelta": 0.0005,
            "longitudeDelta": 0.0005,

        },
        "description": "The outdoor full basketball court outside of Delurey Hall at Villanova University, featuring two basketball hoops.",
        "image": "https://www1.villanova.edu/content/university/residence-life/residence-halls/delurey-hall/_jcr_content/pagecontent/displaybox/par_container/image.img.jpg/1606160273602.jpg",
    },

];
export default markers;