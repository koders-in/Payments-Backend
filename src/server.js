require("dotenv").config();
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SK);
const {
  fetchProject,
  getProjectData,
  getBudget,
  getInvoiceDetails,
  getFilteredProjectStatus,
} = require("./helper");
const sendEmail = require("./mail");
const generatePDF = require("./invoice/helper");
const getWebhookPayload = require("./constant");

const appUrl = process.env.APP_URL;
const port = 9442;
const serverHost = `http://localhost:${port}`;
const allowedUrls = [appUrl, "https://raagwaas.com"];
app.disable("x-powered-by");
// enable cors with allowed urls
app.use(
  cors()
  //   {
  //   origin: allowedUrls,
  //   optionsSuccessStatus: 200,
  // }
);

app.use((req, res, next) => {
  if (req.originalUrl === "/stripe") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.get("/", (_, res) => {
  res.send("Payment API is working perfectly");
});

app.get("/status", async (_, res) => {
  const apiKey = process.env.REDMINE_API_KEY;
  if (apiKey) {
    const blackListedProjects = [
      "public-relations",
      "kore",
      "x12-mirror",
      "graphana",
      "test-project-budget-check",
      "wait-list",
      "getting-started-with-koders",
    ];
    const data = await getFilteredProjectStatus(apiKey, blackListedProjects);
    res.status(200).json({ msg: "Project Status", data });
  } else {
    res.status(400).json({ msg: "Bad request" });
  }
});

app.post("/get-project", async (req, res) => {
  const { apiKey, projectIdentifier } = req.body;
  if (apiKey && projectIdentifier) {
    const data = await fetchProject(apiKey, projectIdentifier);
    if (data !== null && String(data) !== "") {
      res.status(200).json({ msg: "Project Details", data });
    } else res.status(400).json({ msg: "Bad request" });
  } else res.status(404).json({ msg: "Some keys are missing", data: null });
});

app.post("/get-budget", async (req, res) => {
  const { apiKey, issues } = req.body;
  if (apiKey && issues) {
    const amount = await getBudget(apiKey, issues);
    if (amount === null && String(amount) === "") {
      res.status(400).json({ msg: "Bad request" });
    } else res.status(200).json({ msg: "Budget amount", data: amount });
  } else res.status(404).json({ msg: "Some keys are missing", data: null });
});

// FEAT: Add coupon functionality to hasura
// app.post('/coupon', async (req, res) => {
//   const { apiKey, issues, coupon, pid } = req.body
//   if (apiKey && issues && coupon) {
//     const amount = await getBudget(apiKey, issues)
//     if (!(amount === null && String(amount) === '')) {
//       const result = couponManager.calculate(
//         amount,
//         coupon,
//         pid,
//         apiKey,
//         issues
//       )
//       let code = 200
//       if (result !== undefined) {
//         if (!result.isValid) {
//           code = 400
//         }
//       } else code = 400
//       res.status(code).json(result)
//     } else res.status(400).json({ msg: 'Bad request' })
//   } else res.status(404).json({ msg: 'Some keys are missing', data: null })
// })

app.get("/stripe-redirect/:id", (req, res) => {
  const paramValue = req.params.id;
  let url = "";
  if (paramValue !== undefined) {
    if (paramValue.toLowerCase() === "cancel") {
      url = `${appUrl}/`;
    } else {
      // const pid = req.query.pid
      url = `${appUrl}/#/success`;
      // couponManager.updateCsvFile(pid)
    }
  }
  res.status(302).redirect(url);
});

app.post("/checkout", async (req, res) => {
  try {
    const {
      milestoneTitle,
      milestoneUnitAmount: amount,
      apiKey,
      projectIdentifier,
      type,
    } = req.body;
    const { projectName, projectIcon } = await getProjectData(
      apiKey,
      projectIdentifier
    );
    if ((milestoneTitle && amount) || projectIcon) {
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: type.toLowerCase(),
              product_data: {
                name: projectName,
                description: milestoneTitle,
                images: [projectIcon],
              },
              unit_amount: Math.round(Number(amount)) * 100,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${serverHost}/stripe-redirect/success?pid=${projectIdentifier}`,
        cancel_url: `${serverHost}/stripe-redirect/cancel`,
      });
      res.status(200).json({ msg: "Checkout URL", data: session.url });
    } else res.status(404).json({ msg: "Some keys are missing", data: null });
  } catch (error) {
    res.status(500).json({ msg: error?.message, data: null });
  }
});

app.post("/invoice", async (req, res) => {
  try {
    const {
      data: { project, apiKey },
    } = req.body;
    console.log("project, apiKey", project, apiKey);
    if (!project && !apiKey) {
      res
        .status(400)
        .json({ message: "Bad request! All parameter's are required." });
      return;
    }
    const response = await getInvoiceDetails(project, apiKey);
    console.log("Invoice data get from redmine", response);
    if (response === null) {
      res.status(500).json({
        message: "Internal Server Error:Unable to fetch data from redmine",
      });
    } else {
      const path = await generatePDF(response);
      console.log("get file path", path);
      if (path?.filename) {
        const base64PDF = fs.readFileSync(path.filename, {
          encoding: "base64",
        });
        res.json({
          data: base64PDF,
          name:
            response?.invoiceData?.project?.name || new Date().toLocaleString(),
        });
        fs.unlink(path.filename, (err) => {
          if (err) console.log(err);
          console.log(path.filename + " was deleted");
        });
      } else throw Error("Unable to generate PDF");
    }
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error:" + error?.message });
  }
});

app.post("/send-email", async (req, res) => {
  // This endpoint is not the part of KODERS, This is used for raagwaas website.
  const { data } = req.body;
  let response = null;
  if (data?.type === "contact") {
    if (data?.name && data?.phone && data?.message && data?.email) {
      response = await sendEmail(data);
    } else {
      res.status(400).json({ message: "All parameters are required." });
    }
  } else if (data?.type === "subscription" && data?.email) {
    response = await sendEmail(data);
  } else res.status(400).json({ message: "Bad request." });
  if (response?.data) {
    res
      .status(200)
      .json({ message: "Mail sent Successfully!", data: response?.data });
  } else if (response === null) {
    res.status(500).json({ message: "Internal server error." });
  } else {
    res.status(400).json({ message: "Unable to send email. Try later." });
  }
});

let id = null;
const endpointSecret = process.env.WH_STRIPE_SECRET;

app.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    try {
      const sig = request.headers["stripe-signature"];
      let event = {};
      try {
        event = stripe.webhooks.constructEvent(
          request.body,
          sig,
          endpointSecret
        );
      } catch (err) {
        console.log(err?.message);
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }
      if (id !== event?.data?.object?.id) {
        id = event?.data?.object?.id;
        switch (event.type) {
          case "charge.succeeded":
            {
              const payload = getWebhookPayload(event?.data?.object);
              axios(process.env.WH_DISCORD_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify(payload),
              })
                .then((res) => {
                  console.log("Send successfully!");
                })
                .catch((e) => {
                  console.log("Error:", e?.message);
                });
            }
            break;
          default: {
            console.log(`Unhandled event type---> ${event.type}`);
          }
        }
      }

      response.send();
    } catch (error) {
      console.log(error?.message);
      response.status(400).send(error.message);
    }
  }
);

app.get("*", function (req, res) {
  const msg = `<p>No possible <b>${req.path} </b> endpoint for <b>${req.method}</b> method</p>`;
  res.status(404).send(msg);
});

app.listen(port, () => {
  console.log(`Koders payment app listening at ${serverHost}`);
});

module.exports = app;
