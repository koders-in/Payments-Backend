const dotenv = require('dotenv')
const { describe, it, expect } = require('@jest/globals')
const { fetchProject, getProjectIssues, getProjectMilestones, getBudget, getMilestoneData, getFilteredProjectStatus, getProjectData } = require('../src/helper')

dotenv.config()

describe('Testing helper functions', () => {
  it('should return project issues', async () => {
    const projectIdentifier = '89'
    const issues = await getProjectIssues(process.env.REDMINE_API_KEY, projectIdentifier)
    expect(issues).not.toBeNull()
  })
  it('should return project milestone data', async () => {
    const projectIdentifier = '89'
    const response = await getProjectMilestones(process.env.REDMINE_API_KEY, projectIdentifier)
    const milestones = Object.keys(response)
    for (const milestone of milestones) {
      const milestoneData = await getMilestoneData(process.env.REDMINE_API_KEY, milestone)
      expect(milestoneData).not.toBeNull()
    }
    expect(milestones).not.toBeNull()
  })
  it('should return all project status', async () => {
    const filteredProjectStatus = await getFilteredProjectStatus(process.env.REDMINE_API_KEY)
    expect(filteredProjectStatus).not.toBeNull()
  })
  it('should return project data', async () => {
    const projectIdentifier = '89'
    const projectData = await getProjectData(process.env.REDMINE_API_KEY, projectIdentifier)
    expect(projectData).not.toBeNull()
  })
  it('should return project budget', async () => {
    const issueIdentifiers = ['2079']
    const projectBudget = await getBudget(process.env.REDMINE_API_KEY, issueIdentifiers)
    expect(projectBudget).not.toBeNull()
  })
  it('should return fetched project', async () => {
    const projectIdentifier = '89'
    const project = await fetchProject(process.env.REDMINE_API_KEY, projectIdentifier)
    expect(project).not.toBeNull()
  })
  it('should return invoice details', async () => {
    const projectIdentifier = '89'
    const project = await fetchProject(process.env.REDMINE_API_KEY, projectIdentifier)
    expect(project).not.toBeNull()
  })
})
