require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SK);
const couponManager = require("./coupon");
const { fetchProject, getProjectData, getBudget } = require("./helper");

const appUrl = process.env.APP_URL;
const port = 9442;
const serverHost = `http://localhost:${port}`;

app.use(
  cors({
    origin: appUrl,
  })
);

app.use(express.json());

app.get("/", (_, res) => {
  res.send("Payment API is working perfectly");
});

app.post("/get-project", async (req, res) => {
  const { apiKey, projectIdentifier } = req.body;
  if (apiKey && projectIdentifier) {
    const data = await fetchProject(apiKey, projectIdentifier);
    if (data !== null && data !== "") {
      res.status(200).json({ msg: "Project Details", data });
    } else res.status(400).json({ msg: "Bad request" });
  } else res.status(404).json({ msg: "Some keys are missing", data: null });
});

app.post("/get-budget", async (req, res) => {
  const { apiKey, issues } = req.body;
  if (apiKey && issues) {
    const amount = await getBudget(apiKey, issues);
    if (amount === null && amount === "") {
      res.status(400).json({ msg: "Bad request" });
    } else res.status(200).json({ msg: "Budget amount", data: amount });
  } else res.status(404).json({ msg: "Some keys are missing", data: null });
});

app.post("/coupon", async (req, res) => {
  const { apiKey, issues, coupon, pid } = req.body;
  if (apiKey && issues && coupon) {
    const amount = await getBudget(apiKey, issues);
    if (!(amount === null && amount === "")) {
      const result = couponManager.calculate(
        amount,
        coupon,
        pid,
        apiKey,
        issues
      );
      let code = 200;
      if (result !== undefined) {
        if (result.isValid) code = 200;
        else code = 400;
      } else code = 400;
      res.status(code).json(result);
    } else res.status(400).json({ msg: "Bad request" });
  } else res.status(404).json({ msg: "Some keys are missing", data: null });
});

app.get("/stripe-redirect/:id", (req, res) => {
  const paramValue = req.params["id"];
  let url = "";
  if (paramValue !== undefined) {
    if (paramValue.toLowerCase() === "cancel") {
      url = `${appUrl}/`;
    } else {
      const pid = req.query["pid"];
      url = `${appUrl}/#/success`;
      couponManager.updateCsvFile(pid);
    }
  }
  res.status(302).redirect(url);
});

app.post("/checkout", async (req, res) => {
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
});

app.get("*", function (req, res) {
  const msg = `<p>No possible <b>${req.path} </b> endpoint for <b>${req.method}</b> method</p>`;
  res.status(404).send(msg);
});

app.listen(port, () => {
  console.log(`Koders payment app listening at ${serverHost}`);
});
