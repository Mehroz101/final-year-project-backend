const Space = require("../models/Space"); // Import your Space model
const fs = require("fs");
const path = require("path");
const review = require("../models/Review");
// const io = require("socket.io"); // Attach to your server
// Get the Socket.io instance from the app
// Create a new space
const createSpace = async (req, res) => {
  try {
    const user = req.user.id;
    if (!user) {
      console.log("User not found");
      return res.status(401).json();
    }
    console.log(req);

    const userId = user;
    const {
      title,
      short_description,
      description,
      address,
      city,
      country,
      features,
      longitude,
      latitude,
      per_hour,
      per_day,
    } = req.body;

    // Check if required fields are missing
    if (
      !title ||
      !short_description ||
      !description ||
      !address ||
      !city ||
      !country ||
      !longitude ||
      !latitude ||
      !per_hour ||
      !per_day
    ) {
      return res.status(400).json();
    }

    const newSpace = new Space({
      userId,
      title,
      short_description,
      description,
      address,
      city,
      country,
      features: JSON.parse(features),
      longitude,
      latitude,
      per_hour,
      per_day,
      images: req.files.map((file) => file.filename), // Save the file paths
    });

    const data = await newSpace.save();
    const io = req.app.get("io");

    // Emit an event to notify clients about the space status change
    io.emit("spaceUpdated", {
      message: "Space status updated",
    });
    return res.status(201).json({ data });
  } catch (error) {
    console.error("Server error:", error.message);
    return res.status(500).json();
  }
};
const showSpace = async (req, res) => {
  try {
    const user = req.user.id;
    console.log(user);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const spaces = await Space.find({ userId: user });
    if (spaces.length === 0) {
      return res.status(404).json();
    }

    return res.status(200).json({ data: spaces });
  } catch (error) {
    // console.error("Error fetching spaces:", error.message);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
const toggleSpaceStatus = async (req, res) => {
  try {
    const { spaceId } = req.body;
    console.log("Space ID:", req);

    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    // Toggle the state
    space.state = space.state === "active" ? "deactivated" : "active";
    await space.save();
    const io = req.app.get("io");

    // Emit an event to notify clients about the space status change
    io.emit("spaceUpdated", {
      spaceId: spaceId,
      status: space.state,
      message: "Space status updated",
    });
    res.status(200).json({ message: "Space status updated", data: space });
  } catch (error) {
    console.error("Error toggling space status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const getspacedetail = async (req, res) => {
  const { spaceId } = req.params;
  console.log(spaceId);
  try {
    const space = await Space.findById(spaceId);
    if (space) {
      return res.status(201).json({ space });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const updateSpaceDetails = async (req, res) => {
  const { spaceId } = req.params;
  const {
    title,
    short_description,
    description,
    address,
    city,
    country,
    features,
    longitude,
    latitude,
    per_hour,
    per_day,
    removeImg,
  } = req.body;

  try {
    // Find space by ID
    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    // Update space details
    space.title = title || space.title;
    space.short_description = short_description || space.short_description;
    space.description = description || space.description;
    space.address = address || space.address;
    space.city = city || space.city;
    space.country = country || space.country;
    space.features = features ? JSON.parse(features) : space.features;
    space.longitude = longitude || space.longitude;
    space.latitude = latitude || space.latitude;
    space.per_hour = per_hour || space.per_hour;
    space.per_day = per_day || space.per_day;

    // Handle image removal
    if (removeImg && removeImg.length > 0) {
      const removedImages = space.images.filter((img) =>
        removeImg.includes(img)
      );

      // Delete removed images from server
      for (const img of removedImages) {
        const imagePath = path.join(__dirname, "../uploads", img);

        // Check if file exists before attempting to delete
        if (fs.existsSync(imagePath)) {
          fs.unlink(imagePath, (err) => {
            if (err) {
              console.error(`Failed to delete image ${img}:`, err);
            } else {
              console.log(`Deleted image: ${img}`);
            }
          });
        } else {
          console.log(`File ${imagePath} does not exist, skipping deletion.`);
        }
      }

      // Remove images from database
      space.images = space.images.filter((img) => !removeImg.includes(img));
    }

    // Handle new images upload
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => file.filename);
      space.images = [...space.images, ...newImages];
    }

    // Save the updated space in the database
    const response = await space.save();
    const io = req.app.get("io");

    // Emit an event to notify clients about the space status change
    io.emit("spaceUpdated", {
      spaceId: spaceId,
      status: space.state,
      message: "Space detail updated",
    });
    res.status(201).json({ message: "Space updated successfully", response });
  } catch (error) {
    console.error("Error updating space details:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
const deleteSpace = async (req, res) => {
  const { spaceId } = req.params;
  try {
    const space = await Space.findByIdAndDelete(spaceId);
    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }
    const io = req.app.get("io");

    // Emit an event to notify clients about the space status change
    io.emit("spaceUpdated", {
      spaceId: spaceId,
      status: space.state,
      message: "Space deleted",
    });
    res.status(200).json({ message: "Space deleted successfully" });
  } catch (error) {
    console.error("Error deleting space:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
const getallspaces = async (req, res) => {
  try {
    // const user = req.user.id;
    // if (!user) {
    //   return res.status(401).json({ message: "Unauthorized" });
    // }

    const spaces = await Space.find({ state: "active" });
    if (spaces.length === 0) {
      return res.status(404).json();
    }

    return res.status(201).json({ data: spaces });
  } catch (error) {
    // console.error("Error fetching spaces:", error.message);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
const getspacedetailforreservation = async (req, res) => {
  const { spaceId } = req.params;
  try {
    const user = req.user.id;
    console.log(user);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const spaces = await Space.findById(spaceId);
    if (spaces.length === 0) {
      return res.status(404).json();
    }

    return res.status(200).json({ data: spaces });
  } catch (error) {
    // console.error("Error fetching spaces:", error.message);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const getSpaceReview = async (req,res)=>{
  const {spaceId} = req.params;
  try {
    const response = await review.find({spaceId:spaceId}).populate("userId", "fName")
    res.status(201).json(response)
  } catch (error) {
    console.log(error.message)
  }
}

module.exports = {
  createSpace,
  showSpace,
  toggleSpaceStatus,
  getspacedetail,
  updateSpaceDetails,
  deleteSpace,
  getallspaces,
  getspacedetailforreservation,
  getSpaceReview,
};
