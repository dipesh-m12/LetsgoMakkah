const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const PDFDocument = require("pdfkit");

const app = express();
app.use(cors({ origin: ["http://localhost:3000"] }));
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(
    "mongodb+srv://mavinash422:cCRAQrT8blgY5fWf@cluster0.bic32gr.mongodb.net/Makkah?retryWrites=true&w=majority"
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// AviationStack API Configuration (optional)
const AVIATIONSTACK_API_KEY = "YOUR_AVIATIONSTACK_API_KEY"; // Replace with your key from https://aviationstack.com
const AVIATIONSTACK_API_URL = "http://api.aviationstack.com/v1";

// Schemas
const airportSchema = new mongoose.Schema({
  iataCode: String,
  city: String,
  name: String,
});

const flightSchema = new mongoose.Schema({
  flightNumber: String,
  airline: String,
  from: String,
  to: String,
  price: Number,
  originalPrice: Number,
  time: String,
});

const bookingSchema = new mongoose.Schema({
  flight: flightSchema,
  price: Number,
  createdAt: { type: Date, default: Date.now },
});

const priceAttemptSchema = new mongoose.Schema({
  flightId: String,
  attempts: [{ timestamp: Date }],
});

const Airport = mongoose.model("Airport", airportSchema);
const Flight = mongoose.model("Flight", flightSchema);
const Booking = mongoose.model("Booking", bookingSchema);
const PriceAttempt = mongoose.model("PriceAttempt", priceAttemptSchema);

// Initialize data
const initializeData = async () => {
  // Initialize airports
  const airportCount = await Airport.countDocuments();
  if (airportCount === 0) {
    const airports = [
      {
        iataCode: "DEL",
        city: "Delhi",
        name: "Indira Gandhi International Airport",
      },
      {
        iataCode: "BOM",
        city: "Mumbai",
        name: "Chhatrapati Shivaji Maharaj International Airport",
      },
      {
        iataCode: "BLR",
        city: "Bengaluru",
        name: "Kempegowda International Airport",
      },
      {
        iataCode: "MAA",
        city: "Chennai",
        name: "Chennai International Airport",
      },
      {
        iataCode: "HYD",
        city: "Hyderabad",
        name: "Rajiv Gandhi International Airport",
      },
      {
        iataCode: "CCU",
        city: "Kolkata",
        name: "Netaji Subhas Chandra Bose International Airport",
      },
      {
        iataCode: "AMD",
        city: "Ahmedabad",
        name: "Sardar Vallabhbhai Patel International Airport",
      },
      { iataCode: "PNQ", city: "Pune", name: "Pune International Airport" },
      { iataCode: "GOI", city: "Goa", name: "Goa International Airport" },
      { iataCode: "JAI", city: "Jaipur", name: "Jaipur International Airport" },
      {
        iataCode: "LKO",
        city: "Lucknow",
        name: "Chaudhary Charan Singh International Airport",
      },
      {
        iataCode: "PAT",
        city: "Patna",
        name: "Jay Prakash Narayan International Airport",
      },
      { iataCode: "COK", city: "Kochi", name: "Cochin International Airport" },
      {
        iataCode: "TRV",
        city: "Thiruvananthapuram",
        name: "Trivandrum International Airport",
      },
      {
        iataCode: "BBI",
        city: "Bhubaneswar",
        name: "Biju Patnaik International Airport",
      },
    ];
    await Airport.insertMany(airports);
    console.log("Initialized 15 airports");
  }

  // Initialize flights
  const flightCount = await Flight.countDocuments();
  if (flightCount === 0) {
    const airlines = ["IndiGo", "SpiceJet", "AirIndia"];
    const times = ["morning", "afternoon", "evening"];
    const routes = [
      { from: "DEL", to: "BOM" },
      { from: "BOM", to: "DEL" },
      { from: "DEL", to: "BLR" },
      { from: "BLR", to: "DEL" },
      { from: "DEL", to: "MAA" },
      { from: "MAA", to: "DEL" },
      { from: "DEL", to: "HYD" },
      { from: "HYD", to: "DEL" },
      { from: "DEL", to: "CCU" },
      { from: "CCU", to: "DEL" },
      { from: "BOM", to: "BLR" },
      { from: "BLR", to: "BOM" },
      { from: "BOM", to: "MAA" },
      { from: "MAA", to: "BOM" },
      { from: "BOM", to: "HYD" },
      { from: "HYD", to: "BOM" },
      { from: "BLR", to: "MAA" },
      { from: "MAA", to: "BLR" },
      { from: "DEL", to: "AMD" },
      { from: "AMD", to: "DEL" },
    ];
    const flights = [];
    for (let i = 0; i < 100; i++) {
      const route = routes[i % routes.length];
      const price = Math.floor(Math.random() * (3000 - 2000 + 1)) + 2000;
      flights.push({
        flightNumber: `FL${1000 + i}`,
        airline: airlines[Math.floor(Math.random() * airlines.length)],
        from: route.from,
        to: route.to,
        price,
        originalPrice: price,
        time: times[Math.floor(Math.random() * times.length)],
      });
    }
    await Flight.insertMany(flights);
    console.log("Initialized 100 flights");
  }
};
initializeData();

app.get("/", (req, res) => {
  res.send("Let's go Makkah!");
});

// Routes
// Airport suggestions
app.get("/api/flights/suggest", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      console.log("Missing query parameter");
      return res
        .status(400)
        .json({ success: false, message: "Query is required", data: null });
    }
    console.log(`Fetching suggestions for query: ${query}`);
    // Query MongoDB for suggestions
    const suggestions = await Airport.find({
      $or: [
        { city: { $regex: query, $options: "i" } },
        { iataCode: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } },
      ],
    }).limit(5);
    const formattedSuggestions = suggestions.map((airport) => ({
      PlaceId: airport.iataCode,
      PlaceName: airport.city,
      IataCode: airport.iataCode,
    }));
    console.log("MongoDB suggestions:", formattedSuggestions);

    // Optional: Validate with AviationStack
    if (AVIATIONSTACK_API_KEY !== "YOUR_AVIATIONSTACK_API_KEY") {
      try {
        const response = await axios.get(`${AVIATIONSTACK_API_URL}/airports`, {
          params: {
            access_key: AVIATIONSTACK_API_KEY,
            search: query,
          },
        });
        console.log("AviationStack suggest response:", response.data);
        const apiSuggestions = response.data.data
          .filter((airport) => airport.iata_code && airport.city)
          .map((airport) => ({
            PlaceId: airport.iata_code,
            PlaceName: airport.city,
            IataCode: airport.iata_code,
          }));
        formattedSuggestions.push(...apiSuggestions);
      } catch (apiError) {
        console.error("AviationStack suggest error:", apiError.message);
      }
    }

    res.json({
      success: true,
      message: "Suggestions fetched",
      data: [
        ...new Set(formattedSuggestions.map((s) => JSON.stringify(s))),
      ].map((s) => JSON.parse(s)),
    });
  } catch (error) {
    console.error("Suggest endpoint error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch suggestions",
      data: null,
    });
  }
});

// Search flights
app.get("/api/flights/search", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      console.log("Missing from or to parameters");
      return res.status(400).json({
        success: false,
        message: "Origin and destination are required",
        data: null,
      });
    }
    console.log(`Searching flights from ${from} to ${to}`);
    // Validate IATA codes
    const fromAirport = await Airport.findOne({ iataCode: from.toUpperCase() });
    const toAirport = await Airport.findOne({ iataCode: to.toUpperCase() });
    if (!fromAirport || !toAirport) {
      console.log(`Invalid airport code: from=${from}, to=${to}`);
      return res.status(400).json({
        success: false,
        message: "Invalid origin or destination airport code",
        data: null,
      });
    }

    // Optional: Check AviationStack for real-time flights
    if (AVIATIONSTACK_API_KEY !== "YOUR_AVIATIONSTACK_API_KEY") {
      try {
        const response = await axios.get(`${AVIATIONSTACK_API_URL}/flights`, {
          params: {
            access_key: AVIATIONSTACK_API_KEY,
            dep_iata: from,
            arr_iata: to,
          },
        });
        console.log("AviationStack search response:", response.data);
      } catch (apiError) {
        console.error("AviationStack search error:", apiError.message);
      }
    }

    // Get flights from MongoDB
    let flights = await Flight.find({
      from: from.toUpperCase(),
      to: to.toUpperCase(),
    }).limit(10);
    console.log(`Found ${flights.length} flights in MongoDB`);

    // If fewer than 10 flights, supplement with generated flights
    if (flights.length < 10) {
      const airlines = ["IndiGo", "SpiceJet", "AirIndia"];
      const times = ["morning", "afternoon", "evening"];
      const additionalFlights = Array.from(
        { length: 10 - flights.length },
        (_, i) => ({
          flightNumber: `FL${2000 + i + flights.length}`,
          airline: airlines[Math.floor(Math.random() * airlines.length)],
          from: from.toUpperCase(),
          to: to.toUpperCase(),
          price: Math.floor(Math.random() * (3000 - 2000 + 1)) + 2000,
          originalPrice: Math.floor(Math.random() * (3000 - 2000 + 1)) + 2000,
          time: times[Math.floor(Math.random() * times.length)],
        })
      );
      await Flight.insertMany(additionalFlights);
      flights = await Flight.find({
        from: from.toUpperCase(),
        to: to.toUpperCase(),
      }).limit(10);
      console.log(`Supplemented with ${additionalFlights.length} flights`);
    }

    // Dynamic pricing
    for (let flight of flights) {
      let attemptRecord = await PriceAttempt.findOne({ flightId: flight._id });
      if (attemptRecord) {
        const recentAttempts = attemptRecord.attempts.filter(
          (a) => new Date() - new Date(a.timestamp) < 5 * 60 * 1000
        );
        if (recentAttempts.length >= 3) {
          flight.price = Math.round(flight.originalPrice * 1.1);
          console.log(
            `Dynamic pricing applied for ${flight.flightNumber}: ₹${flight.price}`
          );
        } else {
          flight.price = flight.originalPrice;
        }
        attemptRecord.attempts = attemptRecord.attempts.filter(
          (a) => new Date() - new Date(a.timestamp) < 10 * 60 * 1000
        );
        await attemptRecord.save();
        if (attemptRecord.attempts.length === 0) {
          await PriceAttempt.deleteOne({ flightId: flight._id });
          console.log(`Cleared attempts for ${flight.flightNumber}`);
        }
      }
    }

    res.json({ success: true, message: "Flights fetched", data: flights });
  } catch (error) {
    console.error("Search endpoint error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch flights",
      data: null,
    });
  }
});

// Book flight
app.post("/api/flights/book", async (req, res) => {
  try {
    const { flightId } = req.body;
    if (!flightId) {
      console.log("Missing flightId");
      return res
        .status(400)
        .json({ success: false, message: "Flight ID is required", data: null });
    }
    console.log(`Booking flight: ${flightId}`);
    const flight = await Flight.findById(flightId);
    if (!flight) {
      console.log(`Flight not found: ${flightId}`);
      return res
        .status(404)
        .json({ success: false, message: "Flight not found", data: null });
    }

    // Dynamic pricing
    let price = flight.originalPrice;
    let attemptRecord = await PriceAttempt.findOne({ flightId });
    if (!attemptRecord) {
      attemptRecord = new PriceAttempt({
        flightId,
        attempts: [{ timestamp: new Date() }],
      });
    } else {
      attemptRecord.attempts.push({ timestamp: new Date() });
      const recentAttempts = attemptRecord.attempts.filter(
        (a) => new Date() - new Date(a.timestamp) < 5 * 60 * 1000
      );
      if (recentAttempts.length >= 3) {
        price = Math.round(flight.originalPrice * 1.1);
        console.log(`Dynamic pricing applied: ₹${price}`);
      }
    }
    await attemptRecord.save();

    // Create booking
    const booking = new Booking({
      flight,
      price,
      createdAt: new Date(),
    });
    await booking.save();
    console.log(`Booking created: ${booking._id}`);

    // Update flight price
    flight.price = price;
    await flight.save();

    res.json({
      success: true,
      message: "Flight booked successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Book endpoint error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Failed to book flight",
      data: null,
    });
  }
});

// Get booking history
app.get("/api/bookings", async (req, res) => {
  try {
    console.log("Fetching bookings");
    const bookings = await Booking.find().sort({ createdAt: -1 });
    console.log(`Found ${bookings.length} bookings`);
    res.json({ success: true, message: "Bookings fetched", data: bookings });
  } catch (error) {
    console.error("Bookings endpoint error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      data: null,
    });
  }
});

// Generate ticket PDF
app.get("/api/ticket", async (req, res) => {
  try {
    const { bookingId } = req.query;
    if (!bookingId) {
      console.log("Missing bookingId");
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
        data: null,
      });
    }
    console.log(`Generating ticket for booking: ${bookingId}`);
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.log(`Booking not found: ${bookingId}`);
      return res
        .status(404)
        .json({ success: false, message: "Booking not found", data: null });
    }

    // Create PDF
    const doc = new PDFDocument();
    const filename = `ticket-${bookingId}.pdf`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // PDF Content
    doc.fontSize(20).text("Flight Ticket Voucher", { align: "center" });
    doc.moveDown();
    doc
      .fontSize(12)
      .text("----------------------------------------", { align: "center" });
    doc.moveDown();

    doc.text(`Passenger Name: Traveler`);
    doc.text(`Booking ID: ${bookingId}`);
    doc.text(`Airline: ${booking.flight.airline}`);
    doc.text(`Flight Number: ${booking.flight.flightNumber}`);
    doc.text(`From: ${booking.flight.from}`);
    doc.text(`To: ${booking.flight.to}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.text(`Time: ${booking.flight.time}`);
    doc.text(`Price: ₹${booking.price.toLocaleString()}`);

    doc.moveDown();
    doc.text("Thank you for booking with us!", { align: "center" });
    doc.text(`Issued on: ${new Date().toLocaleDateString()}`, {
      align: "center",
    });

    doc.end();
    console.log(`Ticket generated: ${bookingId}`);
  } catch (error) {
    console.error("Ticket endpoint error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Failed to generate ticket",
      data: null,
    });
  }
});

// Start server
const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
