require("dotenv").config();

const client = require("./axios");
const cheerio = require("cheerio");
const { makeConfig, getValueFromArray, fetchData } = require("./utils");

const getMilestoneData = async (apiKey, milestone) => {
  const milestoneData = {};
  try {
    const { data, status } = await client.get(
      `/versions/${milestone}.json`,
      makeConfig(apiKey)
    );
    if (status === 200) {
      const { version } = data;
      milestoneData[version.id] = {
        title: version.name,
        description: version.description,
        status: version.status,
        dueDate: version.due_date,
        demoLink: getValueFromArray(version.custom_fields, "Demo Link"),
        filesLink: getValueFromArray(version.custom_fields, "Files Link"),
        paymentStatus: getValueFromArray(
          version.custom_fields,
          "Payment Status"
        ),
      };
      return milestoneData;
    }
  } catch (err) {
    console.log("Milestone not found. Skipping...");
    return null;
  }
  return null;
};

const getProjectMilestones = async (apiKey, projectIdentifier) => {
  const milestonesData = {};
  try {
    const response = await client.get(
      `/projects/${projectIdentifier}/issues.json?status_id=*&limit=100`,
      makeConfig(apiKey)
    );
    for (let issue of response.data.issues) {
      try {
        if (milestonesData[issue.fixed_version.id] === undefined)
          milestonesData[issue.fixed_version.id] = {
            doneRatio: issue.done_ratio,
            issues: [issue.id],
          };
        else
          milestonesData[issue.fixed_version.id] = {
            doneRatio:
              milestonesData[issue.fixed_version.id].doneRatio +
              issue.done_ratio,
            issues: [
              ...milestonesData[issue.fixed_version.id].issues,
              issue.id,
            ],
          };
      } catch (error) {
        console.log("Something went wrong. Unable to find any releases", error);
        return null;
      }
    }
    return milestonesData;
  } catch (error) {
    console.error("Something went wrong while fetching milestone data.", error);
    return null;
  }
};

const getProjectData = async (apiKey, projectIdentifier) => {
  try {
    const { data, status } = await client.get(
      `/projects/${projectIdentifier}.json`,
      makeConfig(apiKey)
    );

    const projectData = {};
    if (status === 200) {
      const { project } = data;
      projectData["projectName"] = project.name;
      projectData["description"] = project.description;
      projectData["projectIcon"] = getValueFromArray(
        project.custom_fields,
        "Project Icon"
      );
      return projectData;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getBudget = async (apiKey, issueIdentifiers) => {
  let amount = 0;
  for (let issue of issueIdentifiers) {
    try {
      const { data } = await client.get(
        `/issues/${issue}?token=${apiKey}`,
        makeConfig(apiKey, true)
      );

      const $ = cheerio.load(data);
      const tableItems = $(".billing-details tbody tr");
      for (let i = 0; i < tableItems.length; i++) {
        const el = tableItems[i];
        if ($(el).children("th").text() === "Budget") {
          amount += Number(
            $(el).children("td").text().trim().replace(/[,₹]/g, "")
          );
        }
      }
    } catch (error) {
      console.log("Something went wrong while calculating budget. Skipping...");
      return null;
    }
  }
  return amount;
};

const fetchProject = async (apiKey, projectIdentifier) => {
  try {
    const project = {};
    const projectData = await getProjectData(apiKey, projectIdentifier);
    const projectMilestones = await getProjectMilestones(
      apiKey,
      projectIdentifier
    );

    project[projectIdentifier] = { projectData: projectData };

    const milestones = {};
    for (let milestone in projectMilestones) {
      const milestoneData = await getMilestoneData(apiKey, milestone);
      milestones[milestone] = {
        title: milestoneData[milestone].title,
        description: milestoneData[milestone].description,
        issues: projectMilestones[milestone].issues,
        status: milestoneData[milestone].status,
        dueDate: milestoneData[milestone].dueDate,
        doneRatio: projectMilestones[milestone].doneRatio,
        paymentStatus: milestoneData[milestone].paymentStatus,
        demoLink: milestoneData[milestone].demoLink,
        filesLink: milestoneData[milestone].filesLink,
      };
    }
    project[projectIdentifier].milestones = milestones;
    return project;
  } catch (error) {
    console.log(
      "Something went wrong while fetching project details. Skipping...",
      error
    );
    return null;
  }
};

// tags retreive

const getTagsFromIssues = async (apiKey, issues, targtedTag) => {
  if (issues === undefined) return false;
  for (const issue of issues) {
    const { data, status } = await client.get(
      `/issues/${issue}.json`,
      makeConfig(apiKey)
    );
    if (status === 200) {
      const tags = data["issue"]["tags"];
      for (const tag of tags) {
        if (tag.name.toLowerCase().includes(targtedTag.toLowerCase()))
          return true;
      }
    }
  }

  return false;
};

async function getInvoiceDetails(project) {
  try {
    if (!project) return null;
    const projectDetails = await fetchData(`/projects/${project}.json`);
    if (projectDetails !== null) {
      const invoiceField = projectDetails?.project?.custom_fields.filter(
        (item) => item.name === "Invoice id"
      );
      const invoiceDetails = await fetchData(
        `/invoices/${invoiceField[0].value}.json`
      );
      if (invoiceDetails !== null) {
        const contactDetails = await fetchData(
          `/contacts/${invoiceDetails?.invoice?.contact?.id}.json`
        );
        return {
          projectData: projectDetails?.project,
          invoiceData: invoiceDetails.invoice,
          contactDetails: contactDetails ? contactDetails?.contact : null,
        };
      } else return null;
    } else return null;
  } catch (error) {
    return null;
  }
}

module.exports = {
  getBudget,
  fetchProject,
  getProjectData,
  getTagsFromIssues,
  getInvoiceDetails,
};
