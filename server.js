require("dotenv").config();

const cheerio = require("cheerio");
const express = require("express");
const cors = require("cors");
const { client, makeHeader } = require("./api");
const stripe = require("stripe")(process.env.STRIPE_SK);
const app = express();
const port = 8080;

const appUrl = process.env.APP_URL;

app.use(
  cors({
    origin: appUrl,
  })
);

app.use(express.json());

app.use((req, res, cb) => {
  if ("apiKey" in req.body) cb();
  else res.status(422).send({ data: null, msg: "API key is missing in body" });
});

const getProjectMilestones = async (apiKey, projectIdentifier) => {
  const milestones = new Set();
  try {
    const { data, status } = await client.get(
      `/projects/${projectIdentifier}/issues.json`,
      makeHeader(apiKey)
    );
    if (status === 200) {
      for (let issue in data.issues) {
        try {
          milestones.add(data.issues[issue].fixed_version.id);
        } catch (err) {
          console.log("Issue not assigned to a version. Passing...");
        }
      }
      return milestones;
    }
  } catch (error) {
    console.error(error);
  }
};

const getProjectData = async (apiKey, projectIdentifier) => {
  try {
    const { status, data } = await client.get(
      `/projects/${projectIdentifier}.json`,
      makeHeader(apiKey)
    );

    if (status === 200) {
      const projectData = {};
      projectData["projectName"] = data.project.name;
      for (let customField of data.project.custom_fields) {
        if (customField.name == "Project Icon") {
          if (customField.value !== "")
            projectData["projectIcon"] = customField.value;
          else projectData["projectIcon"] = null;
          return projectData;
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
};
const getBudget = async (apiKey, issueIdentifier) => {
  try {
    const { data, status } = await client.get(
      `/issues/${issueIdentifier}?token${apiKey}`,
      makeHeader(apiKey, true)
    );
    if (status === 200) {
      const $ = cheerio.load(data);
      const tableItems = $(".billing-details tbody tr");
      for (let i = 0; i < tableItems.length; i++) {
        const el = tableItems[i];
        if ($(el).children("th").text() === "Budget") {
          return $(el).children("td").text().replace("₹", "");
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};

const getIssuesFromMilestone = async (
  apiKey,
  projectIdentifier,
  milestoneIdentifier
) => {
  const issues = new Set();
  try {
    const { status, data } = await client.get(
      `/projects/${projectIdentifier}/issues.json`,
      makeHeader(apiKey)
    );
    if (status === 200) {
      for (let issue in data.issues) {
        try {
          if (data.issues[issue].fixed_version.id == milestoneIdentifier)
            issues.add(data.issues[issue].id);
        } catch (err) {
          console.log("Issue not assigned to a version. Passing...");
        }
      }

      return issues;
    }
  } catch (err) {
    return err.message;
  }
};

const getMilestonesData = async (apiKey, milestones) => {
  const milestonesData = {};
  try {
    for (let milestone of milestones) {
      try {
        const { data, status } = await client.get(
          `/versions/${milestone}.json`,
          makeHeader(apiKey)
        );
        if (status === 200) {
          milestonesData[data.version.name] = {
            status: data.version.status,
            mileStoneId: data.version.id,
          };
        }
      } catch (err) {
        console.log("Milestone not found. Passing...");
      }
    }
    return milestonesData;
  } catch (error) {
    return err.message;
  }
};

app.get("/", (_, res) => {
  res.send("Hello World!");
});

app.post("/milestones", async (req, res) => {
  const { apiKey, projectIdentifier } = req.body;
  if (apiKey && projectIdentifier) {
    const milestones = await getProjectMilestones(apiKey, projectIdentifier);
    if (milestones instanceof Set) {
      const response = await getMilestonesData(apiKey, milestones);
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
        const issue_budget = await getBudget(apiKey, issue);
        if (issue_budget !== null) amount += Number(issue_budget);
      }
      res.status(200).json({ msg: "Budget amount", data: amount });
    } else res.status(404).json({ msg: issues, data: null });
  } else res.status(404).json({ msg: "Some keys are missing", data: null });
});

app.post("/checkout", async (req, res) => {
  const { milestoneTitle, milestoneUnitAmount, apiKey, projectIdentifier } =
    req.body;
  if (apiKey && projectIdentifier) {
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
  } else res.status(404).json({ msg: "Some keys are missing", data: null });
});

app.get("*", function (req, res) {
  const msg = `<p>No possible <b>${req.path} </b> endpoint for <b>${req.method}</b> method</p>`;
  res.status(404).send(msg);
});

app.listen(port, () => {
  console.log(`Koders payment app listening at http://localhost:${port}`);
});
