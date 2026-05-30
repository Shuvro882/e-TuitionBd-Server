const express = require("express");
const cors = require("cors");
const app = express();
const dns = require("dns");
// Change DNS
dns.setServers(["1.1.1.1", "8.8.8.8"]);
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
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
    const paymentsCollections = db.collection("payments");
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

    // get user role
    app.get("/users/role/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const user = await usersCollections.findOne({ email });

        if (!user) {
          return res.status(404).send({
            message: "User not found",
          });
        }

        res.send({
          role: user.role,
        });
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed to get role",
        });
      }
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

      const existing = await applicationsCollections.findOne({
        tuitionId: application.tuitionId,
        tutorEmail: application.tutorEmail,
      });

      if (existing) {
        return res.status(400).send({
          message: "Already applied",
        });
      }

      application.createdAt = new Date();

      const result = await applicationsCollections.insertOne(application);
      res.send(result);
    });

    app.get("/applications/tutor/ongoing/:email", async (req, res) => {
      const email = req.params.email;

      const query = {
        tutorEmail: email,
        status: "approved",
        paymentStatus: "paid",
      };

      const result = await applicationsCollections
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    });

    app.get("/applications/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await applicationsCollections.findOne(query);
      res.send(result);
    });

    app.get("/applications/student/:email", async (req, res) => {
      const email = req.params.email;

      const query = {
        studentEmail: email,
      };

      const result = await applicationsCollections
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    });

    app.get("/applications/tutor/:email", async (req, res) => {
      const email = req.params.email;

      const query = {
        tutorEmail: email,
      };

      const result = await applicationsCollections
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    });

    app.patch("/applications/reject/:id", async (req, res) => {
      const id = req.params.id;

      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          status: "rejected",
        },
      };

      const result = await applicationsCollections.updateOne(filter, updateDoc);

      res.send(result);
    });

    app.delete("/applications/:id", async (req, res) => {
      const id = req.params.id;

      const result = await applicationsCollections.deleteOne({
        _id: new ObjectId(id),
      });

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

    app.get("/users", async (req, res) => {
      try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 10;

        const query = search
          ? {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
            ],
          }
          : {};

        const users = await usersCollections
          .find(query)
          .skip(page * limit)
          .limit(limit)
          .sort({ createdAt: -1 })
          .toArray();

        const total = await usersCollections.countDocuments(query);

        res.send({
          users,
          total,
        });
      } catch (error) {
        res.status(500).send({ message: "Failed to get users" });
      }
    });

    app.patch("/users/:id/role", async (req, res) => {
      try {
        const id = req.params.id;
        const { role } = req.body;

        const result = await usersCollections.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: { role },
          }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Role update failed" });
      }
    });

    app.get("/admin/payments", async (req, res) => {
      const result = await paymentsCollections
        .find()
        .sort({ paidAt: 1 })
        .toArray();

      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await usersCollections.deleteOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Delete failed" });
      }
    });

    app.get("/admin/stats", async (req, res) => {
      try {
        const totalUsers = await usersCollections.countDocuments();
        const totalTutors = await usersCollections.countDocuments({ role: "tutor" });

        const totalTuitions = await tuitionPostCollections.countDocuments();
        const approvedTuitions = await tuitionPostCollections.countDocuments({
          status: "Approved",
        });
        const pendingTuitions = await tuitionPostCollections.countDocuments({
          status: "Pending",
        });

        const revenueData = await paymentsCollections
          .aggregate([
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$amountBDT" },
              },
            },
          ])
          .toArray();

        const totalRevenue = revenueData[0]?.totalRevenue || 0;

        res.send({
          totalUsers,
          totalTutors,
          totalTuitions,
          approvedTuitions,
          pendingTuitions,
          totalRevenue,
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Failed to load admin stats" });
      }
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

    //payment related apis
    app.post("/payment-checkout-session", async (req, res) => {
      try {
        const paymentInfo = req.body;

        // BDT TO USD
        const exchangeRate = 125; // 1 USD = 110 BDT (approx safe rate)

        const usdAmount = parseFloat(paymentInfo.budget) / exchangeRate;

        const amount = Math.round(usdAmount * 100);

        const session = await stripe.checkout.sessions.create({
          line_items: [
            {
              price_data: {
                currency: "usd",

                unit_amount: amount,

                product_data: {
                  name: `Tutor Payment: ${paymentInfo.tutorName}`,
                },
              },

              quantity: 1,
            },
          ],

          mode: "payment",

          customer_email: paymentInfo.studentEmail,

          metadata: {
            applicationId: paymentInfo.applicationId,
            tuitionId: paymentInfo.tuitionId,
            tutorEmail: paymentInfo.tutorEmail,
            studentEmail: paymentInfo.studentEmail,
            budgetBDT: paymentInfo.budget,
          },

          success_url: `${process.env.SITE_DOMAIN}/dashboard/applied-tutors?session_id={CHECKOUT_SESSION_ID}&appId=${paymentInfo.applicationId}`,

          cancel_url: `${process.env.SITE_DOMAIN}/dashboard/applied-tutors?cancel=true`,
        });

        res.send({
          url: session.url,
        });
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Stripe session failed",
        });
      }
    });

    app.patch("/applications/payment-success/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const { transactionId } = req.body;

        // GET STRIPE SESSION
        const session = await stripe.checkout.sessions.retrieve(transactionId);

        // REAL PAYMENT INTENT ID
        const realTransactionId = session.payment_intent;

        // CHECK EXISTING PAYMENT
        const existingPayment = await paymentsCollections.findOne({
          transactionId: realTransactionId,
        });

        // IF ALREADY EXISTS
        if (existingPayment) {
          return res.send({
            message: "Payment already saved",
          });
        }

        // UPDATE APPLICATION
        const filter = {
          _id: new ObjectId(id),
        };

        const updateDoc = {
          $set: {
            status: "approved",
            paymentStatus: "paid",
            transactionId: realTransactionId,
            paidAt: new Date(),
          },
        };

        await applicationsCollections.updateOne(filter, updateDoc);

        // SAVE PAYMENT
        const paymentDoc = {
          applicationId: session.metadata.applicationId,

          tuitionId: session.metadata.tuitionId,

          tutorEmail: session.metadata.tutorEmail,

          studentEmail: session.metadata.studentEmail,

          amountUSD: session.amount_total / 100,

          amountBDT: Number(session.metadata.budgetBDT),

          transactionId: realTransactionId,

          paidAt: new Date(),
        };

        await paymentsCollections.insertOne(paymentDoc);

        res.send({
          message: "Payment saved successfully",
        });
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Payment update failed",
        });
      }
    });

    // GET /payments?email=...
    app.get("/payments", async (req, res) => {
      try {
        const email = req.query.email;

        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        const query = { studentEmail: email };

        const result = await paymentsCollections
          .find(query)
          .sort({ paidAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Failed to get payments" });
      }
    });



    app.get("/payments/tutor", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(400).send({ message: "Email required" });
      }

      const query = { tutorEmail: email };

      const result = await paymentsCollections
        .find(query)
        .sort({ paidAt: -1 })
        .toArray();

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
