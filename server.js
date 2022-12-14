require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SK);
const couponManager = require("./coupon");
const { fetchProject, getProjectData, getBudget } = require("./helper");
const appUrl = process.env.APP_URL;
const port = 9442;

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
    console.log(data);
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
  const { apiKey, issues, coupon } = req.body;
  if (apiKey && issues && coupon) {
    const amount = await getBudget(apiKey, issues);
    if (!(amount === null && amount === "")) {
      // tags array from Redmine
      const tags = ["all", "backend", "kode100"];
      const couponRes = couponManager.calculate(amount, coupon, tags);
      if (typeof couponRes === "string") {
        res.status(200).json({ msg: couponRes, data: null });
      } else {
        // dont chnage this msg key because in frontend we use this
        res.status(200).json({ msg: "Budget amount", data: couponRes });
      }
    } else res.status(400).json({ msg: "Bad request" });
  } else res.status(404).json({ msg: "Some keys are missing", data: null });
});

app.post("/checkout", async (req, res) => {
  const {
    milestoneTitle,
    milestoneUnitAmount: amount,
    apiKey,
    projectIdentifier,
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
            currency: "inr",
            product_data: {
              name: projectName,
              description: milestoneTitle,
              images: [projectIcon],
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}/#/success`,
      cancel_url: `${appUrl}/`,
    });
    res.status(200).json({ msg: "Checkout URL", data: session.url });
  } else res.status(404).json({ msg: "Some keys are missing", data: null });
});

app.get("*", function (req, res) {
  const msg = `<p>No possible <b>${req.path} </b> endpoint for <b>${req.method}</b> method</p>`;
  res.status(404).send(msg);
});

app.listen(port, () => {
  console.log(`Koders payment app listening at http://localhost:${port}`);
});
