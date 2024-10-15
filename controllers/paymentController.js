const Reservation = require("../models/Reservation");
const User = require("../models/User");
const Payment = require("../models/Payment");
const Space = require("../models/Space");

const withdrawRequest = async (req, res) => {
  try {
    // Destructure necessary fields from the request body
    const { accountType, accountName, accountNumber, withdrawAmount } =
      req.body;
    const user_Id = req.user.id;

    // Check for missing fields
    if (!accountType || !accountName || !accountNumber || !withdrawAmount) {
      return res.status(400).json({
        message:
          "All fields are required (accountType, accountName, accountNumber, withdrawAmount).",
      });
    }

    // Fetch the user by ID
    const user = await User.findById(user_Id);
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }
    const space = await Space.find({ userId: user_Id });

    if (!space) {
      return res.status(404).json({
        message: "User does not have any spaces.",
      });
    }
    const spaceIds = space.map((spa) => spa._id);

    // Fetch completed, non-withdrawn reservations for the user
    const reservations = await Reservation.find({
      state: "completed",
      withdrawn: false,
      spaceId: { $in: spaceIds },
    });

    console.log(reservations.map((res) => res));
    // If no reservations found
    if (reservations.length === 0) {
      return res.status(404).json({
        message: "No completed reservations available for withdrawal.",
      });
    }

    // Calculate total withdrawable amount from completed reservations
    const totalPrice = reservations.reduce((acc, reservation) => {
      if (
        reservation.state === "completed" &&
        reservation.withdrawn === false
      ) {
        const price = parseFloat(reservation.totalPrice);
        return acc + (isNaN(price) ? 0 : price);
      }
      return acc;
    }, 0);
    console.log(totalPrice);
    console.log(parseFloat(withdrawAmount));
    // Ensure the requested withdraw amount matches the total withdrawable amount
    if (totalPrice !== parseFloat(withdrawAmount)) {
      return res.status(400).json({
        message:
          "Withdraw amount does not match the total completed reservation earnings.",
      });
    }

    // Create a new payment request
    const newWithdrawRequest = new Payment({
      userId:user_Id,
      accountType,
      accountName,
      accountNumber,
      withdrawAmount,
    });

    // Save the withdraw request
    const savedRequest = await newWithdrawRequest.save();

    // Mark the related reservations as withdrawn
    const update = await Reservation.updateMany(
      { _id: { $in: reservations.map((res) => res._id) } },
      { $set: { withdrawn: true } }
    );
    console.log("update");
    console.log(update);

    // Return success response
    return res.status(200).json({
      message: "Withdraw request submitted successfully.",
      data: savedRequest,
    });
  } catch (error) {
    console.error("Withdraw Request Error:", error.message);

    // Return internal server error response
    return res.status(500).json({
      message:
        "An internal server error occurred while processing the withdraw request.",
      error: error.message,
    });
  }
};

const getWithdrawRequest = async (req, res) => {
  try {
    const userId = req.user.id;

    // Ensure user ID exists
    if (!userId) {
      return res.status(400).json({
        message: "User ID is required.",
      });
    }

    // Fetch all withdrawal requests for the user
    const withdrawalRequests = await Payment.find({ userId });

    // Return the withdrawal requests
    return res.status(200).json(withdrawalRequests);
  } catch (error) {
    console.error("Get Withdraw Requests Error:", error.message);

    // Return internal server error response
    return res.status(500).json({
      message: "An error occurred while fetching withdraw requests.",
      error: error.message,
    });
  }
};

module.exports = { withdrawRequest, getWithdrawRequest };
