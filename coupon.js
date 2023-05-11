const fs = require('fs')
const csvjson = require('csvjson')
const path = require('path')
const moment = require('moment')
const { stringify } = require('csv-stringify')
const { getTagsFromIssues } = require('./helper')

const couponHeader = {
  type: 'type',
  validity: 'validity',
  description: 'description',
  couponCode: 'couponCode',
  value: 'value',
  projectTag: 'projectTag',
  couponQty: 'couponQty',
  minAmount: 'minAmount',
  id: 'id'
}

const projectHeader = {
  pid: 'pid',
  isApplied: 'isApplied',
  appliedAt: 'appliedAt',
  couponCode: 'couponCode',
  amountAfterDiscount: 'amountAfterDiscount',
  budget: 'budget'
}

class CouponManager {
  constructor () {
    this.availableCoupon = []
    this.projects = []
    this.couponFileName = 'coupons.csv'
    this.projectFileName = 'projects.csv'
    this.isCouponFileRead = false
    this.isProjectFileRead = false
    this.cacheCouponDetails = {}
    this.readCoupons()
  }

  createPath (fileName) {
    return path.join(__dirname, 'storage', fileName)
  }

  readCsvFile (fileName) {
    return fs.readFileSync(this.createPath(fileName), {
      encoding: 'utf8'
    })
  }

  isFileExist (fileName) {
    return fs.existsSync(this.createPath(fileName))
  }

  readCoupons () {
    if (this.isFileExist(this.couponFileName)) {
      if (!this.isCouponFileRead) {
        const fileData = this.readCsvFile(this.couponFileName)
        const options = {
          delimiter: ','
        }
        this.availableCoupon = csvjson.toObject(fileData, options)
        console.log('Coupons read from csv file')
        this.isCouponFileRead = true
      }
    } else console.log('coupons.csv file does not exist')
  }

  writeCsvFile (data, header, fileName) {
    stringify(data, { header: true, columns: header }, (e, output) => {
      if (e) return console.log(`Error while stringify data:->${e}`)
      fs.writeFile(fileName, output, (er) => {
        if (er) return console.log(`Error while writing data:->${er}`)
        console.log(`${fileName} updated successfully🎉🎉`)
      })
    })
  }

  updateCsvFile (pid) {
    if (pid === undefined) return
    if (this.isFileExist(this.couponFileName)) {
      console.log('Getting cache details for ' + pid)
      const details = this.getCacheCouponDetails(pid)
      if (details !== undefined) {
        const tempCoupons = this.availableCoupon.map((coupon) => {
          if (coupon?.id === details.coupon?.id) {
            return details.coupon
          }
          return coupon
        })
        console.log('Updating... coupon file')
        this.availableCoupon = tempCoupons
        this.writeCsvFile(tempCoupons, couponHeader, this.couponFileName)
        this.updateProjectFile(details.project)
      }
    }
  }

  updateProjectFile (project) {
    if (this.isFileExist(this.projectFileName)) {
      const projects = this.readProjects()
      let data = []
      if (projects !== undefined) {
        data = [...projects, project]
      } else {
        data = [project]
      }
      console.log('Updating... project file')
      this.writeCsvFile(data, projectHeader, this.projectFileName)
    }
  }

  readProjects () {
    if (this.isFileExist(this.projectFileName)) {
      if (!this.isProjectFileRead) {
        const fileData = this.readCsvFile(this.projectFileName)
        const options = {
          delimiter: ','
        }
        const projects = csvjson.toObject(fileData, options)
        if (projects.length > 0) {
          return projects
        } else console.log('No, projects exist in csv file')
      }
    } else console.log('projects.csv file does not exist')
  }

  parseCouponCode (code = '') {
    return code.replace(/\s/g, '').toLowerCase()
  }

  isValidCode (code) {
    return !(code.length === 0)
  }

  isValidAmount (amount) {
    if (Number.isInteger(amount)) {
      return {
        result: true,
        amount: parseInt(amount)
      }
    }
    const parseAmount = parseFloat(amount)
    if (!isNaN(parseAmount)) {
      return {
        amount: parseAmount,
        result: true
      }
    }
    return {
      result: false,
      amount: 0
    }
  }

  formatDate () {
    return moment(moment.now()).format('YYYY-MM-DD')
  }

  isCouponExpired (couponDetail, couponCode) {
    if (couponDetail.couponCode.toLowerCase() === couponCode) {
      return !moment().isBefore(moment(couponDetail.validity))
    }

    return true
  }

  async isValidTag (tag, apiKey, issues) {
    return await getTagsFromIssues(apiKey, issues, tag)
  }

  getProject (pid) {
    const response = { data: null, isValid: false }
    const projects = this.readProjects()
    if (projects !== undefined) {
      for (const project of projects) {
        if (parseInt(project.pid) === pid) {
          response.data = project
          response.isValid = false
          return response
        }
      }
    }
    response.isValid = true
    return response
  }

  isCouponExistInList (couponCode) {
    for (const coupon of this.availableCoupon) {
      if (coupon.couponCode.toLowerCase() === couponCode) {
        return {
          exist: true,
          couponDetail: coupon
        }
      }
    }
    return {
      exist: false,
      couponDetail: null
    }
  }

  createResponse (msg, isValid, data) {
    return { msg, isValid, data }
  }

  isCouponLeft (couponDetail) {
    return Number(couponDetail.couponQty) > 0
  }

  applyCouponAmount (amount, budget, pid, couponDetail) {
    if (amount > 0) {
      this.cacheCouponDetails[pid] = {
        couponDetail,
        pid,
        budget,
        amount
      }
      return this.createResponse('COUPON_APPLIED', true, {
        originalBudget: budget,
        budgetAfterAppliedCoupon: amount
      })
    }
    return this.createResponse("CAN'T_APPLIED_COUPON", false, null)
  }

  getCacheCouponDetails (pid) {
    if (pid in this.cacheCouponDetails) {
      const couponDetails = { ...this.cacheCouponDetails[pid].couponDetail }
      return {
        coupon: {
          ...couponDetails,
          couponQty: Number(couponDetails.couponQty) - 1
        },
        project: {
          pid,
          isApplied: true,
          appliedAt: this.formatDate(),
          couponCode: couponDetails.couponCode,
          amountAfterDiscount: this.cacheCouponDetails[pid].amount,
          budget: this.cacheCouponDetails[pid].budget
        }
      }
    }
  }

  calculate (budget, code, pid, apiKey, issues = []) {
    const coupon = this.parseCouponCode(code)
    if (!this.isValidCode(coupon)) {
      return this.createResponse('INVALID_COUPON_CODE', false, null)
    }
    const { couponDetail, exist } = this.isCouponExistInList(coupon)
    if (!exist) return this.createResponse('COUPON_NOT_EXIST', false, null)
    const { isValid, data } = this.getProject(Number(pid))
    if (!isValid) {
      return this.createResponse('ALREADY_APPLIED_ON_THIS_PID', false, data)
    }
    if (this.isCouponExpired(couponDetail, coupon)) {
      return this.createResponse('EXPIRED_COUPON', false, null)
    }
    if (!this.isValidTag(couponDetail.projectTag, apiKey, issues)) {
      return this.createResponse('TAG_NOT_MATCHED', false, null)
    }
    if (!this.isCouponLeft(couponDetail)) {
      return this.createResponse('NO_COUPON_LEFT', false, null)
    }
    const { amount, result } = this.isValidAmount(budget)
    if (result) {
      if (!(amount >= couponDetail.minAmount)) {
        // eslint-disable-next-line quotes
        return this.createResponse("BUDGET_IS_TOO_SMALL", false, null)
      }
      // eslint-disable-next-line eqeqeq
      if (couponDetail.type == 'FLAT') {
        const discount = amount - couponDetail.value
        return this.applyCouponAmount(discount, amount, pid, couponDetail)
      } else {
        const discount = amount - amount * (couponDetail.value / 100)
        return this.applyCouponAmount(discount, amount, pid, couponDetail)
      }
    }
  }
}

module.exports = new CouponManager()
