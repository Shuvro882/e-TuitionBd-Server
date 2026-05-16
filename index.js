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
    const applicationsCollections = db.collection("applications");
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

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;

      const result = await usersCollections.findOne({ email });

      res.send(result);
    });

    app.patch("/users/:email", async (req, res) => {
      const email = req.params.email;
      const updatedData = req.body;

      const result = await usersCollections.updateOne(
        { email },
        { $set: updatedData },
      );

      res.send(result);
    });

    //tutor related apis

    app.get("/tutors", async (req, res) => {
      const limit = parseInt(req.query.limit);

      const query = {
        role: "tutor",
      };

      let cursor = usersCollections.find(query).sort({ createdAt: -1 });

      if (limit) {
        cursor = cursor.limit(limit);
      }

      const result = await cursor.toArray();

      res.send(result);
    });

    app.get("/tutors/:id", async (req, res) => {
      const id = req.params.id;

      const result = await usersCollections.findOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    //tuition application apis
    app.post("/applications", async (req, res) => {
      const application = req.body;

      application.createdAt = new Date();

      const result = await applicationsCollections.insertOne(application);

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

      tuition.status = "Pending";

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

    //admin related apis
    app.get("/admin/tuitions", async (req, res) => {
      const result = await tuitionPostCollections
        .find()
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    });

    app.patch("/tuitions/status/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;

      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          status: status,
        },
      };

      const result = await tuitionPostCollections.updateOne(filter, updateDoc);

      res.send(result);
    });

    //public api
    app.get("/approved-tuitions", async (req, res) => {
      const result = await tuitionPostCollections
        .find({ status: "Approved" })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    });

    app.get("/tuitions/:id", async (req, res) => {
      const id = req.params.id;

      const result = await tuitionPostCollections.findOne({
        _id: new ObjectId(id),
      });

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
