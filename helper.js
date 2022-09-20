require("dotenv").config();

const axios = require("axios");
const cheerio = require("cheerio");

const redmineUrl = process.env.REDMINE_URL;

const getProjectMilestones = async (apiKey, projectIdentifier) => {
  const milestones = new Set();
  try {
    const response = await axios.get(

      `${redmineUrl}/projects/${projectIdentifier}/issues.json`,
      { headers: { "X-Redmine-API-Key": apiKey } }
    );
    for (let issue in response.data.issues) {
      try {
        milestones.add(response.data.issues[issue].fixed_version.id);
      } catch (err) {
        console.log("Something went wrong. Unable to find any releases");
      }
    }
    return milestones;
  } catch (error) {
    console.error(error);
  }
};

const getProjectData = async (apiKey, projectIdentifier) => {
  try {
    const response = await axios.get(
      `${redmineUrl}/projects/${projectIdentifier}.json`,
      { headers: { "X-Redmine-API-Key": apiKey } }
    );

    const projectData = {};
    projectData["projectName"] = response.data.project.name;

    for (let customField of response.data.project.custom_fields) {
      if (customField.name == "Project Icon") {
        if (customField.value !== "")
          projectData["projectIcon"] = customField.value;
        else projectData["projectIcon"] = null;
        return projectData;
      }
    }
  } catch (error) {
    console.error(error);
  }
};

const getBudget = async (apiKey, issueIdentifier) => {
  try {
    const { data } = await axios.get(
      `${redmineUrl}/issues/${issueIdentifier}?token${apiKey}`,
      {
        headers: {
          "X-Redmine-API-Key": apiKey,
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.102 Safari/537.36 OPR/90.0.4480.78 (Edition std-1)",
        },
      }
    );

    const $ = cheerio.load(data);
    const tableItems = $(".billing-details tbody tr");
    for (let i = 0; i < tableItems.length; i++) {
      const el = tableItems[i];
      if ($(el).children("th").text() === "Budget") {
        return $(el).children("td").text().trim()
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
    const response = await axios.get(
      `${redmineUrl}/projects/${projectIdentifier}/issues.json`,
      { headers: { "X-Redmine-API-Key": apiKey } }
    );
    for (let issue in response.data.issues) {
      try {
        if (response.data.issues[issue].fixed_version.id == milestoneIdentifier)
          issues.add(response.data.issues[issue].id);
      } catch (err) {
        console.log("Issue not assigned to a version. Passing...");
      }
    }

    return issues;
  } catch (err) {
    return err.message;
  }
};

const getMilestonesData = async (apiKey, milestones) => {
  const milestonesData = {};
  try {
    for (let milestone of milestones) {
      try {
        const response = await axios.get(
          `${redmineUrl}/versions/${milestone}.json`,
          { headers: { "X-Redmine-API-Key": apiKey } }
        );

        milestonesData[response.data.version.name] = {
          status: response.data.version.status,
          mileStoneId: response.data.version.id,
        };
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
}
