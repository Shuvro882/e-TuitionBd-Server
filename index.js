const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 3000;

//middleware
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@db-first-server.9dfabil.mongodb.net/?appName=Db-first-server`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("e_tuition_bd_db");
    const usersCollections = db.collection("users");
    const tuitionPostCollections = db.collection("tuitions");
    // const tutorsCollections = db.collection("tutors");

    //users related apis
    app.post("/users", async (req, res) => {
      const user = req.body;
      user.createdAt = new Date();

      const email = user.email;
      const userExist = await usersCollections.findOne({ email });

      if (userExist) {
        return res.send({ message: "user exists" });
      }

      const result = await usersCollections.insertOne(user);
      res.send(result);
    });

    

    //tutor related apis
    
    app.get("/latest-tutors", async (req, res) => {
      const query = {
        role: "tutor",
      };

      const result = await usersCollections
        .find(query)
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();

      res.send(result);
    });

    //postTuition api
    app.get("/tuitions", async (req, res) => {
      const email = req.query.email;

      const query = {
        postedEmail: email,
      };

      const cursor = tuitionPostCollections.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/tuitions", async (req, res) => {
      const tuition = req.body;
      // default status set
      tuition.status = "Pending";
      //parcel created time
      tuition.createdAt = new Date();

      const result = await tuitionPostCollections.insertOne(tuition);
      res.send(result);
    });

    app.delete("/tuitions/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await tuitionPostCollections.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("eTuitionBd run");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
