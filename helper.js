require("dotenv").config();

const cheerio = require("cheerio");
const { client, makeHeader } = require("./api");

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
          console.log("There is something I should put online");
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
      return null;
    }
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
    const { data, status } = await client.get(
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
        const { status, data } = await client.get(
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

module.exports = {
  getProjectMilestones,
  getProjectData,
  getBudget,
  getIssuesFromMilestone,
  getMilestonesData,
};
