const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const spaceRoutes = require("./routes/spaceRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const { connectDB, checkDatabaseConnection } = require("./config/db");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
// const attachSocketIo = require("./middleware/socketMiddleware"); // Import the middleware
const reservation = require("./models/Reservation");
// const {
//   checkReservationStatus,
// } = require("./controllers/reservationController");
require("dotenv").config();

const app = express();
const server = http.createServer(app); // Create HTTP server for socket.io
const io = socketIo(server, {
  cors: {
    origin: ["*" ,"https://mehroz101-final-year-project-frontend.vercel.app/"],
    methods: ["GET", "POST", "PATCH"],
  },
});

const PORT = process.env.PORT || 5000;

// Middleware and Routes
app.use(cors());
app.use(express.json());
connectDB();
app.use(checkDatabaseConnection);
app.set("io", io);
// console.log("Socket.io initialized:", io);  // Log here to confirm io is initialized
// Serve static files
app.use(express.static(path.join(__dirname, "uploads")));
// Expose the io instance to the whole app for use in routes/controllers
app.post("/check-reservations", (req, res) => {
  checkReservationStatus(req, res);
});

const checkReservationStatus = async (req, res) => {
  // console.log("io inside checkReservationStatus: ", io);  // Debugging log
  // const io = req.app.get("io"); // Access io here

  if (!io) {
    console.error("Socket.io instance is not available");
    return res.status(500).json({ message: "Socket.io not initialized" });
  } // Log here to confirm io is initialized
  // console.log("Socket.io initialized:", io);

  try {
    const now = new Date();
    // console.log("checkReservationStatus run");
    const reservationsConfirmed = await reservation.find({ state: "confirmed" });
    const reservationsReserved = await reservation.find({ state: "reserved" });
    reservationsConfirmed.forEach(async (reservation) => {
      const arrivalTime = new Date(
        `${reservation.arrivalDate}T${reservation.arrivalTime}`
      );

      // Check if the current time is past the arrival time
      if (now >= arrivalTime) {
        reservation.state = "reserved"; // Update state to 'reserved'
        await reservation.save();
        console.log("reserved");
        // Emit real-time updates using Socket.io (if applicable)
        if (io) {
          // Check if io exists before emitting
          io.emit("reservationUpdated", {
            message: "Reservation status updated",
            reservation,
          });
          console.log("update emit");
        } else {
          console.error("Socket.io instance is undefined");
        }
      }
    });
    reservationsReserved.forEach(async (reservation) => {
      console.log("check")
      const leaveTime = new Date(
        `${reservation.leaveDate}T${reservation.leaveTime}`
      );

      // Check if the current time is past the arrival time
      if (now >= leaveTime) {
        reservation.state = "completed"; // Update state to 'reserved'
        await reservation.save();
        console.log("completed");
        // Emit real-time updates using Socket.io (if applicable)
        if (io) {
          // Check if io exists before emitting
          io.emit("reservationUpdated", {
            message: "Reservation status updated",
            reservation,
          });
          console.log("update emit");
        } else {
          console.error("Socket.io instance is undefined");
        }
      }
    });
  } catch (error) {
    console.error("Error checking reservation status:", error);
  }
};
// You could run this function every minute (using setInterval or a cron job)
setInterval(checkReservationStatus, 60000); // Run every 1 minute

// Apply the attachSocketIo middleware for specific routes
app.use("/api/spaces", spaceRoutes);
app.use("/api/reservation", reservationRoutes);
app.use("/api/withdraw", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
// const HOST = '0.0.0.0'; // Change this from 'localhost' to '0.0.0.0'

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
// server.listen(PORT,HOST, () => {
//   console.log(`Server is running on port ${PORT} ${HOST}`);
// });
