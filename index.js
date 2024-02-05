const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken");

require("colors");

//Middleware
app.use(cors());
app.use(express.json());

//Mongo DB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.je7jmto.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//Collections

const Services = client.db("Medi-Time").collection("Services");
const Reviews = client.db("Medi-Time").collection("Reviews");
const Users = client.db("Medi-Time").collection("Users");
const AppointmentOption = client
  .db("Medi-Time")
  .collection("Appointment-Option");
const BookingsCollection = client
  .db("Medi-Time")
  .collection("Bookings-Collection");

async function run() {
  try {
    await client.connect();
    console.log("Database Conneted".cyan);
  } catch (error) {
    console.log(error);
    res.send({
      status: false,
      message: error,
    });
  }
}
run();

// Initial Server Load
app.get("/", (req, res) => {
  res.send("Server is Running");
});

///Jwt Token

app.get("/jwt", async (req, res) => {
  try {
    const email = req.query.email;
    const user = await Users.findOne({ email: email });

    if (user) {
      const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ accessToken: token });
    } else {
      res.status(403).send({ accessToken: "" });
    }
  } catch (error) {
    console.log(error);
    res.send({
      status: false,
      message: error,
    });
  }
});

//Verify jwt token
function verifyJWT(req, res, next) {
  console.log("inside verify", req.headers.author);
  const token = req.headers.author;
  if (!token) {
    return res.status(401).send("Unauthorized Access");
  }

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      res.status(403).send("Forbidden Access");
    }
    req.decoded = decoded;
    next();
  });
}

//Appointments Server

//Appointment Options
app.get("/appointmentOptions", async (req, res) => {
  try {
    const date = req.query.date;
    console.log(date);
    const options = await AppointmentOption.find({}).toArray();

    const alreadyBooked = await BookingsCollection.find({
      apppointmentDate: date,
    }).toArray();

    options.forEach((option) => {
      const bookedOption = alreadyBooked.filter(
        (book) => book.treatment === option.name
      );
      const bookedSlots = bookedOption.map((book) => book.slot);
      const remainingSlots = option.slots.filter(
        (slot) => !bookedSlots.includes(slot)
      );
      option.slots = remainingSlots;
    });

    // console.log(alreadyBooked);

    res.send(options);
  } catch (error) {
    console.log(error);
    res.send({
      status: false,
      message: error,
    });
  }
});

//Add Bookings
app.post("/bookings", async (req, res) => {
  try {
    const bookings = req.body;

    const alreadyBooked = await BookingsCollection.find({
      apppointmentDate: bookings.apppointmentDate,
      email: bookings.email,
      treatment: bookings.treatment,
    }).toArray();

    if (alreadyBooked.length) {
      res.send({
        status: false,
        message: `You have already a booking on ${bookings.treatment}`,
      });
      return;
    }

    const result = await BookingsCollection.insertOne(bookings);

    if (result.insertedId) {
      res.send({
        status: true,
        message: " Booking Confirmed ",
      });
    } else {
      res.send({
        status: false,
        message: "Failed to add the Bookig",
      });
    }
  } catch (error) {
    console.log(error);
    res.send({
      status: false,
      message: error.message,
    });
  }
});

//Get Bookings

app.get("/bookings", async (req, res) => {
  try {
    const email = req.query.email;

    const bookings = await BookingsCollection.find({ email: email }).toArray();

    res.send({
      status: true,
      data: bookings,
    });
  } catch (error) {
    console.log(error);
    res.send({
      status: false,
      message: error.message,
    });
  }
});

//users Add
app.post("/users", async (req, res) => {
  try {
    const user = req.body;
    const result = await Users.insertOne(user);
    if (result.insertedId) {
      res.send({
        status: true,
        message: `Sucessfully added the user`,
        email: req.body.email,
      });
    } else {
      res.send({
        status: false,
        message: "Failed to add the user",
      });
    }
  } catch (error) {
    res.send({
      status: false,
      message: error.message,
    });
  }
});

//Services Server

app.get("/services", async (req, res) => {
  try {
    const services = await Services.find({}).toArray();

    res.send({
      status: true,
      data: services,
    });
  } catch (error) {
    console.log(error);
    res.send({
      status: false,
      message: error.message,
    });
  }
});

//Get 3 Services

app.get("/threeservices", async (req, res) => {
  try {
    const services = await Services.find({}).limit(3).toArray();

    res.send({
      status: true,
      data: services,
    });
  } catch (error) {
    console.log(error);
    res.send({
      status: false,
      message: error.message,
    });
  }
});

//Get One service by Id
app.get("/services/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const service = await Services.findOne({ _id: ObjectId(id) });
    if (service) {
      res.send({
        status: true,
        data: service,
      });
    } else {
      res.send({
        status: false,
        message: "Service not found",
      });
    }
  } catch (error) {
    console.log(error);
    res.send({
      status: false,
      message: error.message,
    });
  }
});

//Get One service by Id
app.get("/review/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const review = await Reviews.findOne({ _id: ObjectId(id) });
    if (review) {
      res.send({
        status: true,
        data: review,
      });
    } else {
      res.send({
        status: false,
        message: "Review not found",
      });
    }
  } catch (error) {
    console.log(error);
    res.send({
      status: false,
      message: error.message,
    });
  }
});

app.get("/newservice", async (req, res) => {
  try {
    const services = await Services.find({ newService: true }).toArray();

    if (services) {
      res.send({
        status: true,
        data: services,
      });
    } else {
      res.send({
        status: false,
        message: "Service not found",
      });
    }
  } catch (error) {
    console.log(error);
    res.send({
      status: false,
      message: error.message,
    });
  }
});

// Adding services

app.post("/serviceadd", async (req, res) => {
  try {
    const service = req.body;
    const result = await Services.insertOne(service);
    if (result.insertedId) {
      res.send({
        status: true,
        message: `Sucessfully added the service with ID: ${result.insertedId}`,
      });
    } else {
      res.send({
        status: false,
        message: "Failed to add the service",
      });
    }
  } catch (error) {
    console.log(error);
    res.send({
      status: false,
      message: error.message,
    });
  }
});

// Adding a Review
app.post("/reviewadd", async (req, res) => {
  try {
    const review = req.body;
    const result = await Reviews.insertOne(review);
    if (result.insertedId) {
      res.send({
        status: true,
        message: "Sucessfully added the review ",
      });
    } else {
      res.send({
        status: false,
        message: "Failed to add the review",
      });
    }
  } catch (error) {
    console.log(error);
    res.send({
      status: false,
      message: error.message,
    });
  }
});

//get review by service ID

app.get("/review", async (req, res) => {
  try {
    let query = {};

    if (req.query.serviceID) {
      query = {
        ServiceID: req.query.serviceID,
      };
    }
    const reviews = await Reviews.find(query).toArray();
    const result = reviews.sort().reverse();

    res.send({
      status: true,
      data: result,
    });
  } catch (error) {
    console.log(error);
    res.send({
      status: false,
      message: error.message,
    });
  }
});

// //review by email

app.get("/reviewemail", async (req, res) => {
  try {
    let query = {};

    if (req.query.email) {
      query = {
        email: req.query.email,
      };
    }
    const reviews = Reviews.find(query);
    const result = await reviews.toArray();

    if (result) {
      res.send({
        status: true,
        data: result,
      });
    } else {
      res.send({
        status: false,
        message: "No reviews found",
      });
    }
  } catch (error) {
    console.log(error);
    res.send({
      status: false,
      message: error.message,
    });
  }
});

// //delete a review

app.delete("/reviewdelete/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await Reviews.deleteOne({ _id: ObjectId(id) });

    if (result.deletedCount) {
      res.send({
        status: true,
        message: "Deleted successfully !!",
      });
    } else {
      res.send({ status: false, message: "Sorry !Review couldn't be deleted" });
    }
  } catch (error) {
    console.log(error);
    res.send({
      status: false,
      message: error.message,
    });
  }
});

//review Update
app.patch("/edit/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await Reviews.updateOne(
      { _id: ObjectId(id) },
      { $set: req.body }
    );

    if (result.modifiedCount) {
      res.send({
        status: true,
        message: "Updated successfully!!",
      });
    } else {
      res.send({
        status: false,
        message: "Sorry!Review couldn't be updated",
      });
    }
  } catch (error) {
    console.log(error);
    res.send({
      status: false,
      message: error.message,
    });
  }
});

// //App Listener

app.listen(port, () => {
  console.log("Server is conneted at port:", port);
});
module.exports = app;
