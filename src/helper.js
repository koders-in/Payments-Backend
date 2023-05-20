require('dotenv').config()

const client = require('./axios')
const cheerio = require('cheerio')
const { makeConfig, getValueFromArray, fetchData } = require('./utils')

const getMilestoneData = async (apiKey, milestone) => {
  const milestoneData = {}
  try {
    const { data, status } = await client.get(
      `/versions/${milestone}.json`,
      makeConfig(apiKey)
    )
    if (status === 200) {
      const { version } = data
      milestoneData[version.id] = {
        title: version.name,
        description: version.description,
        status: version.status,
        dueDate: version.due_date,
        demoLink: getValueFromArray(version.custom_fields, 'Demo Link'),
        filesLink: getValueFromArray(version.custom_fields, 'Files Link'),
        paymentStatus: getValueFromArray(
          version.custom_fields,
          'Payment Status'
        )
      }
      return milestoneData
    }
  } catch (err) {
    console.log('Milestone not found. Skipping...')
    return null
  }
  return null
}

const getProjectIssues = async (apiKey, projectIdentifier) => {
  try {
    return client.get(
      `/projects/${projectIdentifier}/issues.json?status_id=*&limit=100`,
      makeConfig(apiKey)
    )
  } catch (error) {
    console.error('Something went wrong while fetching project issues.', error)
    return null
  }
}

const getProjectMilestones = async (apiKey, projectIdentifier) => {
  const milestonesData = {}
  const response = await getProjectIssues(apiKey, projectIdentifier)
  const issues = response.data.issues
  for (const issue of issues) {
    try {
      if (milestonesData[issue.fixed_version.id] === undefined) {
        milestonesData[issue.fixed_version.id] = {
          doneRatio: issue.done_ratio,
          issues: [issue.id]
        }
      } else {
        milestonesData[issue.fixed_version.id] = {
          doneRatio:
            milestonesData[issue.fixed_version.id].doneRatio +
            issue.done_ratio,
          issues: [
            ...milestonesData[issue.fixed_version.id].issues,
            issue.id
          ]
        }
      }
    } catch (error) {
      console.log('Something went wrong. Unable to find any releases', error)
      return null
    }
  }
  return milestonesData
}

const getAllProjects = async (apiKey) => {
  try {
    const { data, status } = await client.get('/projects.json', makeConfig(apiKey))
    if (status === 200) {
      return data
    } else {
      return null
    }
  } catch (error) {
    console.error('Something went wrong while fetching project status.', error)
    return null
  }
}

const getFilteredProjectStatus = async (apiKey, blackListedProjects = []) => {
  try {
    const reponse = await getAllProjects(apiKey)
    const projects = reponse.projects
    const projectStatus = {}
    for (const project of projects) {
      if (blackListedProjects.includes(project.identifier)) {
        continue
      }
      projectStatus[project.name] = 0
      const response = await getProjectIssues(apiKey, project.identifier)
      const issues = response.data.issues
      let issueCounter = 0
      if (issues) {
        for (const issue of issues) {
          projectStatus[project.name] += issue.done_ratio
          issueCounter += 1
        }
        if (issueCounter > 0) {
          projectStatus[project.name] /= issueCounter
          projectStatus[project.name] = projectStatus[project.name].toFixed(2)
        }
      }
    }
    return projectStatus
  } catch (error) {
    console.error('Something went wrong while fetching project status.', error)
    return null
  }
}

const getProjectData = async (apiKey, projectIdentifier) => {
  try {
    const { data, status } = await client.get(
      `/projects/${projectIdentifier}.json`,
      makeConfig(apiKey)
    )

    const projectData = {}
    if (status === 200) {
      const { project } = data
      projectData.projectName = project.name
      projectData.description = project.description
      projectData.projectIcon = getValueFromArray(
        project.custom_fields,
        'Project Icon'
      )
      return projectData
    }
  } catch (error) {
    console.error(error)
    return null
  }
}

const getBudget = async (apiKey, issueIdentifiers) => {
  let amount = 0
  for (const issue of issueIdentifiers) {
    try {
      const { data } = await client.get(
        `/issues/${issue}?token=${apiKey}`,
        makeConfig(apiKey, true)
      )

      const $ = cheerio.load(data)
      const tableItems = $('.billing-details tbody tr')
      for (const tableItem of tableItems) {
        if ($(tableItem).children('th').text() === 'Budget') {
          amount += Number(
            $(tableItem).children('td').text().trim().replace(/[,₹]/g, '')
          )
        }
      }
    } catch (error) {
      console.error(error)
      console.log('Something went wrong while calculating budget. Skipping...')
      return null
    }
  }
  return amount
}

const fetchProject = async (apiKey, projectIdentifier) => {
  try {
    const project = {}
    const projectData = await getProjectData(apiKey, projectIdentifier)
    const projectMilestones = await getProjectMilestones(
      apiKey,
      projectIdentifier
    )

    project[projectIdentifier] = { projectData }

    const milestones = {}
    for (const milestone in projectMilestones) {
      const milestoneData = await getMilestoneData(apiKey, milestone)
      milestones[milestone] = {
        title: milestoneData[milestone].title,
        description: milestoneData[milestone].description,
        issues: projectMilestones[milestone].issues,
        status: milestoneData[milestone].status,
        dueDate: milestoneData[milestone].dueDate,
        doneRatio: projectMilestones[milestone].doneRatio,
        paymentStatus: milestoneData[milestone].paymentStatus,
        demoLink: milestoneData[milestone].demoLink,
        filesLink: milestoneData[milestone].filesLink
      }
    }
    project[projectIdentifier].milestones = milestones
    return project
  } catch (error) {
    console.log(
      'Something went wrong while fetching project details. Skipping...',
      error
    )
    return null
  }
}

const getTagsFromIssues = async (apiKey, issues, targtedTag) => {
  if (issues === undefined) return false
  for (const issue of issues) {
    const { data, status } = await client.get(
      `/issues/${issue}.json`,
      makeConfig(apiKey)
    )
    if (status === 200) {
      const tags = data.issue.tags
      console.log(tags)
      for (const tag of tags) {
        if (tag.name.toLowerCase().includes(targtedTag.toLowerCase())) {
          return true
        }
      }
    }
  }
  return false
}

// FIXME: This is a temporary function to get the tags from issues but tags are not available in the response
// (async () => console.log(await getTagsFromIssues(process.env.REDMINE_API_KEY, [2077, 2078, 2079], 'akka')))()

async function getInvoiceDetails (project, apiKey) {
  try {
    if (!project) return null
    const projectDetails = await fetchData(`/projects/${project}.json`, apiKey)
    if (projectDetails !== null) {
      const invoiceField = projectDetails?.project?.custom_fields.filter(
        (item) => item.name === 'Invoice id'
      )
      const invoiceDetails = await fetchData(
        `/invoices/${invoiceField[0].value}.json`,
        apiKey
      )
      if (invoiceDetails !== null) {
        const contactDetails = await fetchData(
          `/contacts/${invoiceDetails?.invoice?.contact?.id}.json`,
          apiKey
        )
        return {
          projectData: projectDetails?.project,
          invoiceData: invoiceDetails.invoice,
          contactDetails: contactDetails ? contactDetails?.contact : null
        }
      } else return null
    } else return null
  } catch (error) {
    console.log(error)
    return null
  }
}

module.exports = {
  getBudget,
  fetchProject,
  getProjectData,
  getMilestoneData,
  getProjectMilestones,
  getTagsFromIssues,
  getProjectIssues,
  getInvoiceDetails,
  getFilteredProjectStatus
}
