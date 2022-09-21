require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SK);

const { fetchProject, getBudget} = require("./helper");
const appUrl = process.env.APP_URL;
const port = 9442;

// app.use(cors({
//     origin: appUrl
// }));

app.use(cors()); // ! Remove in production

app.use(express.json());

app.get("/", (_, res) => {
  res.send("Payment API is working perfectly");
});

app.post("/get-project", async (req, res) => {
  const { apiKey, projectIdentifier } = req.body;
  if (apiKey && projectIdentifier) {
    const data = await fetchProject(apiKey, projectIdentifier);
      res.status(200).json({ data: data, msg: "Project Details" });
  } else res.status(404).json({ msg: "Some keys are missing", data: null });
});

app.post("/get-budget", async (req, res) => {
  const { apiKey, issues } = req.body;
  if (apiKey && issues ) {
    const amount = await getBudget(apiKey, issue);
      res.status(200).json({ msg: "Budget amount", data: amount });
  } else res.status(404).json({ msg: "Some keys are missing", data: null });
});

app.post("/checkout", async (req, res) => {
  const { milestoneTitle, milestoneUnitAmount, apiKey, projectIdentifier } =
    req.body;
  const { projectName, projectIcon } = await getProjectData(
    apiKey,
    projectIdentifier
  );

  if ((milestoneTitle && milestoneUnitAmount) || projectIcon) {
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
            unit_amount: milestoneUnitAmount * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}/success`,
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
