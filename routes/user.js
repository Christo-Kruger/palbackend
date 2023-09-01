const express = require("express");
const router = express.Router();
const User = require("../model/User");
const Child = require("../model/Child");
const jwt = require("jsonwebtoken");
const { sendSMS } = require("../services/smsService");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const auth = require("../middleware/auth");
const pdf = require("pdfkit");


router.post("/register", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    const token = jwt.sign(
      {
        _id: user._id,
        role: user.role,
        name: user.name,
        phone: user.phone, // add this line
        campus: user.campus, // add this line
      },
      process.env.JWT_SECRET
    );
    res.json({ token, role: user.role, name: user.name, _id: user._id });
  } catch (err) {
    console.log(err);
    if (err.code === 11000) {
      res.status(400).json({ error: "This email is already registered." });
    } else {
      res
        .status(500)
        .json({ error: "An error occurred while registering the user." });
    }
  }
});

router.post("/login", async (req, res) => {
  const user = await User.findOne({ phone: req.body.phone });
  console.log(user); // Log the user returned from the query

  if (!user || !(await user.isValidPassword(req.body.password))) {
    console.log("The user is invalid or the password is incorrect");
    return res.status(400).send("Invalid phone or password.");
  }

  const token = jwt.sign(
    {
      _id: user._id,
      role: user.role,
      name: user.name,
      phone: user.phone,
      campus: user.campus,
      attendedPresentation: user.attendedPresentation, // Optionally add this to the JWT payload if needed
      children: user.children,
    },
    process.env.JWT_SECRET
  );

  // Include the role, name, phone, campus, and attendedPresentation in the response
  res.send({
    token,
    role: user.role,
    name: user.name,
    phone: user.phone,
    campus: user.campus,
    attendedPresentation: user.attendedPresentation, // Include this in the response
    children: user.children,
  });
});

router.get("/parentsForAdmin", async (req, res) => {
  // Assuming the admin is authenticated and their ID is available in req.user._id (from JWT decoding)

  // Fetch the admin from the database
  const admin = await User.findById(req.user._id);

  // Check if the user is an admin
  if (admin.role !== "admin") {
    return res.status(403).json({ message: "Not authorized" });
  }

  // Fetch parents based on the admin's campus
  const parents = await User.find({ campus: admin.campus, role: "parent" });

  return res.json(parents);
});

router.get("/parents/:id", auth, async (req, res) => {
  try {
    const parent = await User.findById(req.params.id).populate("children"); // Populate children details
    if (parent) {
      res.json(parent);
    } else {
      res.status(404).json({ error: "Parent not found." });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "An error occurred while fetching parent." });
  }
});

router.get("/parents", async (req, res) => {
  try {
    const parents = await User.find({ role: "parent" }) // Assuming you have a role field to distinguish parents
      .populate("children"); // Populate children details
    if (parents && parents.length > 0) {
      res.json(parents);
    } else {
      res.status(404).json({ error: "No parents found." });
    }
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching parents." });
  }
});

//Get Children

router.get("/:id/children", async (req, res) => {
  try {
    const userId = req.params.id;
    const children = await Child.find({ parent: userId });
    res.json(children);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch children." });
  }
});



//Update
router.put("/user/:id", auth, async (req, res) => {
  try {
    const userId = req.params.id;

    const { user, children } = req.body;

    // Update the user
    await User.findByIdAndUpdate(userId, user);

    // Update children
    for (let child of children) {
      await Child.findByIdAndUpdate(child._id, child);
    }

    res.status(200).send({ message: "Details updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    res
      .status(500)
      .send({ error: "An error occurred while updating the details." });
  }
});

router.patch("/:userId/attendedPresentation", async (req, res) => {
  console.log(req.params, req.body);
  const userId = req.params.userId;
  const { attended } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    user.attendedPresentation = attended;
    await user.save();

    res.status(200).json({ message: "Attendance updated successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while updating attendance." });
  }
});

router.patch("/parent/:parentId", async (req, res) => {
  try {
    const parent = await User.findByIdAndUpdate(req.params.parentId, req.body, {
      new: true,
    });

    if (parent) {
      res.json(parent);
    } else {
      res.status(404).send({ message: "Parent not found" });
    }
  } catch (error) {
    res.status(500).send({ message: "Error updating parent details" });
  }
});

router.get("/:userId/qrcode", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user || !user.qrCodeDataURL) {
      return res.status(404).send("QR code not found");
    }

    res.setHeader("Content-disposition", "attachment; filename=qrcode.pdf");
    res.setHeader("Content-type", "application/pdf");

    const doc = new pdf();
    doc.pipe(res);

    // Logo
    const logoPath = "logo/JLP.png"; // Replace with path to your logo
    doc.image(logoPath, 150, 30, { width: 100 });

    // Title
    doc
      .font("Helvetica-Bold")
      .fontSize(25)
      .text("J Lee Presentation", 150, 120, { align: "center" });

    // Greeting
    doc.font("Helvetica").fontSize(12).text(`Hello ${user.name},`, 50, 170);

    // Body
    doc.text(
      `Thank you for booking for the J Lee Presentation. Please keep this QR code safe and present it when you enter. We look forward to seeing you.`,
      50,
      190,
      { width: 410, align: "left" }
    );

    // QR Code
    const qrCodeBuffer = Buffer.from(user.qrCodeDataURL, "base64");
    doc.image(qrCodeBuffer, 150, 240, { width: 200 });

    // Footer
    doc
      .fontSize(10)
      .text("For more information visit our website: www.jlpedu.com", 50, 460)
      .text("Bundang Campus 031) 713-9405", 50, 480)
      .text("경기도 성남시 분당구 정자일로 121 더샵스타파크", 50, 490)
      .text("(주) 제이리│제 3324호", 50, 500)
      .text("Suji Campus 031) 526-9777", 50, 520)
      .text("경기도 용인시 수지구 문정로7번길 10 서초프라자", 50, 530)
      .text("​(주)제이리어학원│ 제 3503-1호", 50, 540)
      .text("Dongtan Campus 031) 373-1633", 50, 560)
      .text("​경기도 화성시 동탄대로 587 재원프라자", 50, 570)
      .text("(주)제이리어학원│제 3892호", 50, 580);

    // Border
    doc.rect(40, 20, 500, 600).stroke("#364150");

    doc.end();
  } catch (err) {
    console.error("Error fetching QR code:", err.message);
    res.status(500).send("Error fetching QR code");
  }
});

//Admin CRUD
router.get("/admins", async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admins." });
  }
});

// Route to delete an admin
router.delete("/admin/:adminId", async (req, res) => {
  try {
    await User.findByIdAndRemove(req.params.adminId);
    res.json({ message: "Admin removed successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete admin." });
  }
});

// Route to update an admin
router.put("/admin/:adminId", async (req, res) => {
  try {
    const updatedAdmin = await User.findByIdAndUpdate(
      req.params.adminId,
      req.body,
      { new: true }
    );
    res.json(updatedAdmin);
  } catch (err) {
    res.status(500).json({ error: "Failed to update admin." });
  }
});



router.patch("/:userId/attendedPresentation", async (req, res) => {
  const userId = req.params.userId;
  const { attended } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    user.attendedPresentation = attended;
    await user.save();

    res.status(200).json({ message: "Attendance updated successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while updating attendance." });
  }
});


// Generate Reset Token and Send SMS
router.post('/forgot-password', async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    const user = await User.findOne({ phone: phoneNumber });

    if (!user) {
      return res.status(400).json({ error: '전화번호가 잘못 기재되었습니다.' });
    }

    const resetToken = crypto.randomBytes(4).toString('hex');
    const resetTokenExpires = Date.now() + 3600000; // 1 hour

    user.resetToken = resetToken;
    user.resetTokenExpires = resetTokenExpires;
    await user.save();

    const message = `아래의 인증코드를 기재 후 변경하실 비밀번호를 하단에 작성 해 주시기 바랍니다.\n\n
인증코드: ${resetToken}\n\n`;

    try {
      const response = await sendSMS(phoneNumber, message);
      console.log('Response from Naver Cloud SMS:', response);
    } catch (error) {
      console.error('Error sending SMS:', error);
      return res.status(500).json({ error: 'An error occurred while sending the SMS.' });
    }

    res.send('SMS has been sent. Please check your phone.');
 } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});



router.post('/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetToken,
      resetTokenExpires: { $gt: new Date(Date.now()) },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    user.set({ password: newPassword });
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    res.send('Password has been successfully reset.');
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});





module.exports = router;
