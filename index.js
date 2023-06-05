const express=require('express')
const app=express()
const cors=require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port=process.env.PORT || '5000'

//middleware
app.use(cors())
app.use(express.json())

app.get('/', (req,res)=>{
    res.send('server running')
})

const verifyJWT=(req,res,next)=>{
  const authorization=req.headers.authorization
  if(!authorization){
    return res.status(401).send({error:true, message:'Unauthorized Access'})
  }
  //bearer token
  const token=authorization.split(' ')[1]
  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (error,decoded)=>{
    if(error){
      return res.status(401).send({error:true, message:'Unauthorized Access'})
    }
    req.decoded=decoded
    next()
  })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.ow6kx3p.mongodb.net/?retryWrites=true&w=majority`;

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
    await client.connect();
    const menuCollection=client.db('kalabhunaDB').collection('menu')
    const cartCollection=client.db('kalabhunaDB').collection('cart')
    const userCollection=client.db('kalabhunaDB').collection('user')
    app.post('/jwt', async(req,res)=>{
      const user=req.body
      const token=jwt.sign(user, process.env.JWT_ACCESS_TOKEN, { expiresIn: '1h' });
      res.send({token})
    })
    //verifyAdmin
    const verifyAdmin=async(req,res,next)=>{
        const email=req.decoded.email 
        const query={email:email}
        const user=await userCollection.findOne(query)
        if(user?.role!=='admin'){
          res.status(403).send({error:true, message:'Forbidden Access'})
        }
        next()
    }
    app.get('/menus', async(req,res)=>{
        const result= await menuCollection.find().toArray()
        res.send(result)
    })
    app.post('/menus', verifyJWT, verifyAdmin, async(req,res)=>{
      const menuData=req.body
      const result=await menuCollection.insertOne(menuData)
      res.send(result)
    })
    //cart collection
    app.post('/carts', async(req,res)=>{
      const data=req.body
      const result=await cartCollection.insertOne(data)
      res.send(result)
    })
    app.get('/carts', verifyJWT, async(req,res)=>{
      const email=req.query.email
      if(!email){
        res.send([])
      }
      const decodedEmail=req.decoded.email
      if(decodedEmail!==email){
        return res.status(403).send({error:true, message:'Forbidden Access'})
      }
      const query={email:email}
      const result = await cartCollection.find(query).toArray();
      res.send(result)
    })
    app.delete('/carts/:id', async(req,res)=>{
      const id=req.params.id
      const query={_id: new ObjectId(id)}
      const result = await cartCollection.deleteOne(query);
      res.send(result)
    })

    //user collection
    app.get('/users', verifyJWT, verifyAdmin, async(req,res)=>{
      const allUsers = await userCollection.find().toArray();
      res.send(allUsers)
    })
    //check user Admin or Normal user
    app.get('/users/admin/:email', verifyJWT, async(req,res)=>{
      const email = req.params.email
      if(req.decoded.email!==email){
        res.send({admin:false})
      }
      const query={email: email}
      const user=await userCollection.findOne(query)
      const result={admin: user?.role==='admin'}
      res.send(result)
    })

    app.put('/users/admin/:id', async(req,res)=>{
      const id=req.params.id
      const query={_id: new ObjectId(id)}
      const updateUser = {
        $set: {
          role: 'admin'
        },
      };
      const result = await userCollection.updateOne(query, updateUser);
      res.send(result)
    })

    app.post('/users', async(req,res)=>{
      const userData=req.body
      const query={email:userData.email}
      const existingUser = await userCollection.findOne(query);
      if(existingUser){
       return res.send({message :'user all ready exist'})
      }
      const result=await userCollection.insertOne(userData)
      res.send(result)
    })
    app.delete('/users/:id', async(req,res)=>{
      const id=req.params.id
      const query={_id: new ObjectId(id)}
      const result = await userCollection.deleteOne(query);
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




app.listen(port, ()=>{
    console.log(`Example app listening on port ${port}`)
})