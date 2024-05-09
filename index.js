const express = require('express');
var jwt = require('jsonwebtoken');
const  cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var cors = require('cors')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;

//middleware
app.use(cors({
  origin : ['http://localhost:5173'],
  credentials : true
}));

app.use(express.json());
app.use(cookieParser());

//loger 
const loger = async(req,res,next)=>{
  console.log('Called :', req.host, req.originalUrl);
  next();
}


//verify token

const verifyToken = async(req,res,next)=>{
  const token = req.cookies;
  console.log('middleware token : ', token);
 
  if(!token){
    return res.status(401).send({massage : 'unAuthorize'})
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=> {
   
    if(err){
      return req.status(401).send({massage : 'unauthorize user'});
    }
    req.user = decoded;
    next();
  });
  
  next()
  
  
}

//mongodb connection


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aq01puw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    const cardoctorCollection = client.db('CarDoctorDB').collection('carDoctor');

    const bookingCollection = client.db('CarDoctorDB').collection('booking');


    //auth api
    app.post('/jwt', async(req,res) =>{
     
      const user = req.body;
      console.log('user token : ', user);
      //create token
      const token =  jwt.sign({user}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    
   //cookies setup
    res.cookie('token',token, {
      httpOnly: true,
      secure: process.env.ACCESS_TOKEN_SECRET === 'production',
      sameSite: process.env.ACCESS_TOKEN_SECRET === 'production'? 'none': 'strict',
    })
    .send({success : true});

    })


    //logout for cookies 
    app.post('/logout', async(req,res) =>{
      const user = req.body;
      console.log('user : ',user);
      
      res.clearCookie('token',{maxAge:0}).send({success: true})
     
    })

    //services relatated api
    app.get('/service',loger,  async(req,res) =>{
        
        const query = cardoctorCollection.find();
        const result = await query.toArray();
        res.send(result);
    })


    app.get('/service/:id',loger, verifyToken, async(req,res)=>{
        const id = req.params.id;
        const query = {_id : new ObjectId(id)};
       
        const options = {
          
            sort: { "imdb.rating": -1 },
          
            projection: {  title: 1, service_id: 1,img:1, price: 1 },
          };

        const result = await cardoctorCollection.findOne(query, options);
        res.send(result);
       


    })


    //Booking 

    //get booking 
    app.get('/booking', async(req, res) =>{
        const query = bookingCollection.find();
        const result = await query.toArray();
        res.send(result);
    })

    //get only booking single user email 
    app.get('/booking',loger, async(req,res) =>{
        const email = req.params.email;
        console.log(email);
        console.log('token woner',req.user);
        
        if(req.user.email !== req.params.email){
          return req.status(403).send({massage : 'forbiden auth'})
        }

        let query = {};
        if(req.params?.email){
           query = {Email : req.params?.email}
        }
        console.log('cook cookies : ',req.cookies);
        const result =await bookingCollection.findOne();
        res.send(result);

    })


    //post
    app.post('/booking', async(req, res) =>{

        const booking = req.body;
        console.log(booking);
        const result = await bookingCollection.insertOne(booking);
        
        res.send(result);
    })



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req,res)=>{
    res.send('car-doctor server runninggggg')
})

app.get('/user', (req, res)=>{

    res.send('It is working user pathhhhh');
})


app.listen(port, () => {
  console.log(`car-doctor-server running on port ${port}`)
})