const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const express = require('express');
const cors = require('cors');
const jwt=require('jsonwebtoken')
const cookiePerser=require('cookie-parser')
const app=express();
const port=process.env.PORT || 5000;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qucghff.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
// middlewares
const logger=async(req,res,next)=>{
  console.log('called',req.host,req.originalUrl)
  next()
}
const verifyToken=async(req,res,next)=>{
  const token=req.cookies?.token
  console.log(token)
  if(!token){
    return res.send(401).send({message:'not athorized'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({message:'unauthorized'})
    }
    console.log('value in the token',decoded);
    req.user=decoded;
    next()
  })
}
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const servicesCollection=client.db('carDoctor').collection('services');
    const bookingCollection=client.db('carDoctor').collection('booking');
    // auth related api
    app.post('/jwt',logger,async(req,res)=>{
      const user=req.body;
      console.log(user);
      const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1hr'})
      res
      .cookie('token',token,{
        hattpOnly:true,
        secure:false,
        sameSite:'none'
      })
      res.send({success:true})
    })
    app.post('/logout',async(req,res)=>{
      const user=req.body;
      res.clearCookie('token',{maxAge:0}).send({success:true})
    })
    // services related api
    app.get('/services',logger,async(req,res)=>{
        const cursor=servicesCollection.find();
        const result=await cursor.toArray();
        res.send(result);
    })
    app.get('/services/:id',async(req,res)=>{
        const id=req.params.id;
        const query={_id:new ObjectId(id)}
        const options = {
          projection: {
            title:1,price:1,service_id:1,img:1
          },
        }
        const result=await servicesCollection.findOne(query,options)
        res.send(result)
    })
    app.post('/booking',async(req,res)=>{
      const newBooking=req.body;
      const result=await bookingCollection.insertOne(newBooking)
      res.json(result)
    })
    app.get('/booking',logger,verifyToken,async(req,res)=>{
      console.log(req.query.email);
      console.log(req.user)
      if(req.query.email!=req.user.email){
        return res.status(403).send({message:'forbidden access'})
      }
      let query={}
      if(req.query?.email){
        query={email:req.query.email}
      }
      const cursor=bookingCollection.find();
      const result=await cursor.toArray();
      res.send(result);
    })
    app.patch('/booking/:id',async(req,res)=>{
      const id=req.params.id;
      const filter={_id:new ObjectId(id)}
      const updatedBooking=req.body
      const updateDoc={
        $set:{
          status:updatedBooking.status
        },
      }
      const result=await bookingCollection.updateOne(filter,updateDoc);
      res.send(result)
      console.log(updatedBooking);
    })
    app.delete('/booking/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)}
      const result=await bookingCollection.deleteOne(query)
      res.send(result)
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


// middleware
app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true,
}))
app.use(express.json())
app.use(cookiePerser())
app.get('/',(req,res)=>{
    res.send('hello world')
})
app.listen(port,()=>{
    console.log(`server is running on port ${port}`)
})