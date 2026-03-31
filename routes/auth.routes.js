const express = require("express");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

const user = require("../models/user");

const router = express.Router();

let otpStorage = 0;
let otpEmail = "";

router.post("/verify", async function (req, res) {
  try {
    const name = req.body.username;
    const data = await user.findOne({ username: name });

    if (data != null) {
      const encrypt = await bcrypt.compare(req.body.password, data.password);
      if (encrypt) {
        return res.status(200).json({
          status: "done",
          data,
        });
      }

      return res.status(400).json({
        status: "password",
        message: "invalid password",
      });
    }

    return res.status(400).json({
      status: "username",
      message: "invalid username",
    });
  } catch (err) {
    return res.status(400).json({
      status: "err",
    });
  }
});

router.get("/getuser", async function (req, res) {
  try {
    const username = req.query.username;
    const data = await user.findOne({ username });

    if (data) {
      return res.status(200).json({
        status: "done",
        data,
      });
    }

    return res.status(404).json({
      status: "not_found",
      message: "User not found",
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

router.post("/add", async function (req, res) {
  try {
    const crypt = await bcrypt.hash(req.body.password, 10);

    const obj = {
      username: req.body.username,
      role: req.body.role,
      email: req.body.email,
      domain: req.body.domain,
      mobile: req.body.mobile,
      password: crypt,
      ischanged: false,
    };

    const existingUser = await user.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({
        status: "err",
        message: "Email already exists. Please use a different email.",
      });
    }

    const existingUsername = await user.findOne({
      username: req.body.username,
    });
    if (existingUsername) {
      return res.status(400).json({
        status: "err",
        message: "Username already exists. Please use a different username.",
      });
    }

    if (req.body.role === "TeamLead" || req.body.role === "Associate") {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "sgkalathiya3047@gmail.com",
          pass: "quhl bftx xyia fvaw",
        },
      });

      const mailOptions = {
        from: "sgkalathiya3047@gmail.com",
        to: req.body.email,
        subject: "Your Account Has Been Successfully Created",
        text: `Dear ${req.body.username},

          Welcome to [TMC TASK MANAGEMENT SYSTEM]!

          Your account has been successfully created. Below are your login details:

          Username: ${req.body.username}
          Password: ${req.body.password}

          For security reasons, we recommend changing your password after logging in for the first time.

          If you did not request this account or need any assistance, please contact our support team.

          Best regards,
          [TMC TASK MANAGEMENT SYSTEM]`,
      };

      await transporter.sendMail(mailOptions);
    }

    await user.create(obj);

    return res.status(200).json({
      status: "done",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        status: "err",
        message: "Duplicate entry. Email already exists.",
      });
    }

    return res.status(500).json({
      status: "err",
      message: "Internal server error",
    });
  }
});

router.post("/otp", async function (req, res) {
  try {
    const email = req.body.email;
    const loguser = await user.findOne({ email: email });

    if (!loguser) {
      return res.status(400).json({
        status: "invalid_user",
      });
    }

    res.status(200).json({
      status: "valid_user",
    });

    const otp = Math.floor(Math.random() * 1000000 + 1);
    otpStorage = otp;
    otpEmail = email;

    const mailOptions = {
      from: "sgkalathiya3047@gmail.com",
      to: email,
      subject: "Your OTP for Verification",
      text: `Dear User,

          Your One-Time Password (OTP) for verification is: ${otp}

          Please use this code to complete your verification process. This OTP is valid for a limited time and should not be shared with anyone.

          If you did not request this, please ignore this email.

          Best regards,
          [TMC TASK MANAGEMENT SYSTEM]`,
    };

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "sgkalathiya3047@gmail.com",
        pass: "quhl bftx xyia fvaw",
      },
    });

    transporter.sendMail(mailOptions, function () {
      return;
    });
  } catch {
    return res.status(400).json({
      status: "err",
      message: "Internal server error",
    });
  }
});

router.post("/checkotp", async function (req, res) {
  const userotp = req.body.otp;

  try {
    if (parseInt(userotp, 10) === parseInt(otpStorage, 10)) {
      return res.status(200).json({
        status: "otp_varified",
      });
    }

    return res.status(200).json({
      status: "otp_error",
    });
  } catch (error) {
    return res.status(400).json({
      status: "err",
    });
  }
});

router.post("/newpassword", async function (req, res) {
  const newpassword = req.body.newpassword;
  const rnewpassword = req.body.rnewpassword;

  if (!newpassword || !rnewpassword || !otpEmail) {
    return res.status(400).json({ status: "error", message: "Missing fields" });
  }

  try {
    const existingUser = await user.findOne({ email: otpEmail });

    if (!existingUser) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    const isSameAsOld = await bcrypt.compare(
      existingUser.password,
      newpassword,
    );
    if (isSameAsOld) {
      return res.status(400).json({
        status: "error",
        message: "New password cannot be the same as old password",
      });
    }

    if (newpassword.toLowerCase() === existingUser.username.toLowerCase()) {
      return res.status(400).json({
        status: "error",
        message: "Password cannot be the same as username",
      });
    }

    if (newpassword !== rnewpassword) {
      return res
        .status(400)
        .json({ status: "error", message: "Passwords do not match" });
    }

    const hashedPassword = await bcrypt.hash(newpassword, 10);

    const updateUser = await user.findOneAndUpdate(
      { email: otpEmail },
      { password: hashedPassword, ischanged: true },
      { new: true },
    );

    if (updateUser) {
      return res
        .status(200)
        .json({ status: "changed", message: "Password updated successfully" });
    }

    return res
      .status(500)
      .json({ status: "error", message: "Failed to update password" });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
});

module.exports = router;
