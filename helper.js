require("dotenv").config();

const axios = require("axios");
const cheerio = require("cheerio");

const redmineUrl = process.env.REDMINE_URL;

const getMilestoneData = async (apiKey, milestone) => {
  const milestoneData = {}
  try {
    const response = await axios.get(
      `${redmineUrl}/versions/${milestone}.json`,
      { headers: { "X-Redmine-API-Key": apiKey } }
    );

    milestoneData[response.data.version.id] = {
      title: response.data.version.name,
      description: response.data.version.description,
      status: response.data.version.status,
      dueDate: response.data.version.due_date,
      estimatedHours: response.data.version.estimated_hours,
      spentHours: response.data.version.spent_hours
    };
  } catch (err) {
    console.log("Milestone not found. Passing...");
  }
  return milestoneData;
};


const getProjectMilestones = async (apiKey, projectIdentifier) => {
  const milestonesData = {};
  try {
    const response = await axios.get(
      `${redmineUrl}/projects/${projectIdentifier}/issues.json`,
      { headers: { "X-Redmine-API-Key": apiKey } }
    );
    for (let issue of response.data.issues) {
      try {
        if (milestonesData[issue.fixed_version.id] === undefined)
          milestonesData[issue.fixed_version.id] = { "doneRatio": issue.done_ratio, "issues": [issue.id] }
        else
          milestonesData[issue.fixed_version.id] = { "doneRatio": (milestonesData[issue.fixed_version.id].doneRatio + issue.done_ratio), "issues": [...milestonesData[issue.fixed_version.id].issues, issue.id] }
      } catch (err) {
        console.log("Something went wrong. Unable to find any releases");
      }
    }
    return milestonesData;
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
    projectData["description"] = response.data.project.description;

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

const getBudget = async (apiKey, issueIdentifiers) => {
  let amount = 0;
  for (let issue of issueIdentifiers){
  try {
    const { data } = await axios.get(
      `${redmineUrl}/issues/${issue}?token${apiKey}`,
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
        amount += Number($(el).children("td").text().trim().replace(/[,₹]/g, ''));
      }
    }
  } catch (error) {
    console.log("Something went wrong while calculating budget. Passing...")
    return null;
    }
  }
  return amount;
};

const fetchProject = async(apiKey, projectIdentifier) => {
  const project = {}
  const projectData = await getProjectData(apiKey, projectIdentifier);
  const projectMilestones = await getProjectMilestones(apiKey, projectIdentifier);

  project[projectIdentifier] = {"projectData": projectData};

  const milestones = {}
  for (let milestone in projectMilestones){
    const milestoneData = await getMilestoneData(apiKey, milestone)
    milestones[milestone] = { 
      "title": milestoneData[milestone].title,
      "description": milestoneData[milestone].description,
      "issues": projectMilestones[milestone].issues,
      "status": milestoneData[milestone].status,
      "dueDate": milestoneData[milestone].dueDate,
      "doneRatio": projectMilestones[milestone].doneRatio,
      "estimatedHours": milestoneData[milestone].estimatedHours,
      "spentHours": milestoneData[milestone].spentHours
    }
  }
  project[projectIdentifier].milestones = milestones;
  return project
};

module.exports = {
  getBudget,
  fetchProject
}
