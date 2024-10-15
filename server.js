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
const reservation = require("./models/Reservation");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["*", "https://mehroz101-final-year-project-frontend.vercel.app"],
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

// Serve static files
app.use(express.static(path.join(__dirname, "uploads")));

// Check reservations status
const checkReservationStatus = async () => {
  try {
    const now = new Date();
    const reservationsConfirmed = await reservation.find({ state: "confirmed" });
    const reservationsReserved = await reservation.find({ state: "reserved" });

    for (const reservation of reservationsConfirmed) {
      const arrivalTime = new Date(`${reservation.arrivalDate}T${reservation.arrivalTime}`);
      if (now >= arrivalTime) {
        reservation.state = "reserved";
        await reservation.save();
        io.emit("reservationUpdated", {
          message: "Reservation status updated",
          reservation,
        });
      }
    }

    for (const reservation of reservationsReserved) {
      const leaveTime = new Date(`${reservation.leaveDate}T${reservation.leaveTime}`);
      if (now >= leaveTime) {
        reservation.state = "completed";
        await reservation.save();
        io.emit("reservationUpdated", {
          message: "Reservation status updated",
          reservation,
        });
      }
    }
  } catch (error) {
    console.error("Error checking reservation status:", error);
  }
};

// Run the check every minute
setInterval(checkReservationStatus, 60000);

// API Routes
app.use("/api/spaces", spaceRoutes);
app.use("/api/reservation", reservationRoutes);
app.use("/api/withdraw", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
