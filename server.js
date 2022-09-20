require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SK);

const { getProjectMilestones, getMilestonesData, getIssuesFromMilestone, getBudget, getProjectData } = require("./helper");
const appUrl = process.env.APP_URL;
const port = 9442;

app.use(cors({
    origin: appUrl
}));

app.use(express.json());

app.get("/", (_, res) => {
  res.send("Payment API is working perfectly");
});

app.post("/milestones", async (req, res) => {
  const { apiKey, projectIdentifier } = req.body;
  if (apiKey && projectIdentifier) {
    const milestones = await getProjectMilestones(apiKey, projectIdentifier);
    if (milestones instanceof Set) {
      const response = await getMilestonesData(apiKey, milestones);
      console.log({ data: response, msg: "Project milestone" });
      res.status(200).json({ data: response, msg: "Project milestone" });
    } else res.status(404).json({ msg: milestones, data: null });
  } else res.status(404).json({ msg: "Some keys are missing", data: null });
});

app.post("/get-budget", async (req, res) => {
  const { apiKey, milestoneIdentifier, projectIdentifier } = req.body;
  if (apiKey && milestoneIdentifier && projectIdentifier) {
    const issues = await getIssuesFromMilestone(
      apiKey,
      projectIdentifier,
      milestoneIdentifier
    );
    let amount = 0;
    if (issues instanceof Set) {
      for (let issue of issues) {
        let issue_budget = await getBudget(apiKey, issue);
          issue_budget = issue_budget.trim();
          console.log(issue_budget.replace("\n", ""))
          console.log(issue_budget.trim())
          console.log(typeof(issue_budget))
        if (issue_budget !== null) amount += Number(issue_budget);
      }
      console.log({ msg: "Budget amount", data: amount });
      res.status(200).json({ msg: "Budget amount", data: amount });
    } else res.status(404).json({ msg: issues, data: null });
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
