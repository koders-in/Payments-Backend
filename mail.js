require("dotenv").config();
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs");

async function sendEmail(contactObj) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    let res = null;
    if (contactObj.type === "contact") {
      res = await transporter.sendMail({
        from: process.env.EMAIL_USERNAME,
        to: process.env.EMAIL_USERNAME,
        subject: "User Inquiry through Contact Us",
        text: `Dear Raghav,\n\nI hope this email finds you well. I am reaching out to inform you that we have received an inquiry through the Contact Us section of your website. The details of the inquiry are as follows:\n\nName:${contactObj.name}\nContact Details:${contactObj.phone}\n\nMessage:${contactObj.message}\n\nWe appreciate your efforts in creating a user-friendly platform for customers to connect with your brand. We will be taking prompt action to respond to the user and address their concerns accordingly.\n\nThank you for your attention to this matter.\n\nBest regards,\n${contactObj.name}\n${contactObj.phone}\n${contactObj.email}`,
      });
      const source = fs.readFileSync("./mail_assets/contact.hbs", "utf8");
      const template = handlebars.compile(source);
      const html = template({ user: contactObj.name });
      if (contactObj.email)
        await transporter.sendMail({
          from: process.env.EMAIL_USERNAME,
          to: contactObj.email,
          subject: "Thank you for contacting Raagwaas.",
          html,
          attachments: [
            {
              filename: "white-logo.png",
              path: "./mail_assets/white-logo.png",
              cid: "white-logo.png",
            },
            {
              filename: "instagram.png",
              path: "./mail_assets/instagram.png",
              cid: "instagram.png",
            },
            {
              filename: "facebook.png",
              path: "./mail_assets/facebook.png",
              cid: "facebook.png",
            },
          ],
        });
    } else {
      res = await transporter.sendMail({
        from: process.env.EMAIL_USERNAME,
        to: process.env.EMAIL_USERNAME,
        subject: "Request for Subscription",
        text: `Dear Raghav,\n\nI want to subscribing your newsletter! \n\n Email address:${contactObj?.email}`,
      });
      const source = fs.readFileSync("./mail_assets/subscribe.hbs", "utf8");
      const template = handlebars.compile(source);
      const html = template({ user: contactObj.name });
      if (contactObj.email)
        await transporter.sendMail({
          from: process.env.EMAIL_USERNAME,
          to: contactObj.email,
          subject: "Thank you for contacting Raagwaas.",
          html,
          attachments: [
            {
              filename: "white-logo.png",
              path: "./mail_assets/white-logo.png",
              cid: "white-logo.png",
            },
            {
              filename: "instagram.png",
              path: "./mail_assets/instagram.png",
              cid: "instagram.png",
            },
            {
              filename: "facebook.png",
              path: "./mail_assets/facebook.png",
              cid: "facebook.png",
            },
          ],
        });
    }
    if (res?.messageId || res?.response?.includes("OK")) {
      return { data: res };
    } else {
      return false;
    }
  } catch (error) {
    console.log("Error occurred during sending mail: " + error.message);
    return null;
  }
}

module.exports = sendEmail;
