const pdf = require('html-pdf')
const fs = require('fs')
const handlebars = require('handlebars')
const { v4: uuidv4 } = require('uuid')

function generatePDF (response) {
  return new Promise(async (resolve, reject) => {
    try {
      const source = fs.readFileSync('./invoice.hbs', 'utf8')
      const template = handlebars.compile(source)
      const data = getInvoiceObject(response)
      const html = template({
        ...data,
        isShowEarlyPay: parseInt(data.earlyPayDiscount) > 0
      })
      const options = {
        childProcessOptions: {
          env: {
            OPENSSL_CONF: '/dev/null'
          }
        },
        format: 'Letter',
        footer: {
          height: '30px'
        },
        header: {
          height: '30px'
        }
      }
      const uniqueName = uuidv4()
      const path = `./pdf/${uniqueName}.pdf`
      pdf.create(html, options).toFile(path, async (err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      })
    } catch (error) {
      console.log(error)
      reject(error)
    }
  })
}

function getInvoiceObject (payload) {
  return {
    name:
      payload?.contactDetails?.first_name +
      ' ' +
      payload.contactDetails?.middle_name +
      ' ' +
      payload?.contactDetails?.last_name,
    invoiceNo: payload?.invoiceData?.number,
    invoiceDate: payload?.invoiceData?.invoice_date,
    currency: currencySymbols[payload?.invoiceData?.currency],
    address: payload?.contactDetails?.address?.full_address?.full_address,
    number: payload?.contactDetails?.phones?.length
      ? payload?.contactDetails?.phones[0]?.number
      : 'Not provided',
    email: payload?.contactDetails?.emails?.length
      ? payload?.contactDetails?.emails[0]?.address
      : 'Not provided',
    lines: payload?.invoiceData?.lines.map((item, i) => ({
      ...item,
      index: i + 1
    })),
    payments: payload?.invoiceData?.payments.map((item) => ({
      ...item,
      payment_date: new Date(item?.payment_date).toLocaleString().split(',')[0],
      currency: currencySymbols[payload?.invoiceData?.currency]
    })),
    invoice:
      payload?.invoiceData?.status?.name === 'Estimate' ||
        payload?.invoiceData?.status?.name === 'Draft'
        ? 'Quotation'
        : 'Invoice',
    total: geTotalOfInvoiceLines(payload?.invoiceData?.lines),
    discountPercent: Number(
      payload?.invoiceData?.discount / 100
    ).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 }),
    discountAmount: (
      Math.ceil(
        (payload?.invoiceData?.amount / 100) *
        payload?.invoiceData?.discount *
        10
      ) / 10
    ).toFixed(2),
    balance: (
      payload?.invoiceData?.amount - payload?.invoiceData?.balance
    ).toFixed(2),
    earlyPayDate: new getEarlyPayData(payload?.invoiceData)?.date,
    earlyPayDiscount: getEarlyPayData(payload?.invoiceData)?.discount,
    earlyPayAmt: (
      parseFloat(payload?.invoiceData?.amount) -
      parseFloat(getEarlyPayData(payload?.invoiceData)?.discount) -
      parseFloat(payload?.invoiceData?.balance)
    ).toFixed(2),
    conditions: payload?.invoiceData?.custom_fields
      .filter((item) => item.name === 'Terms & Condition')[0]
      ?.value?.split(','),
    qr: payload?.invoiceData?.custom_fields.filter(
      (item) => item.name === 'QR'
    )[0]?.value
  }
}

function geTotalOfInvoiceLines (lines) {
  let total = 0
  lines.forEach((line) => {
    total += parseFloat(line.total)
  })
  return total
}

function getEarlyPayData (invoiceData) {
  const earlyPayData = {}
  invoiceData?.custom_fields.forEach((item) => {
    if (item?.name === 'Early Pay Date') {
      earlyPayData.date = new Date(item?.value)
        .toLocaleString()
        .split(',')[0]
    }
    if (item?.name === 'Early Pay Discount') {
      earlyPayData.discount = item?.value
    }
  })
  return earlyPayData
}

const currencySymbols = {
  USD: '$',
  EUR: '€',
  CRC: '₡',
  GBP: '£',
  ILS: '₪',
  INR: '₹',
  JPY: '¥',
  KRW: '₩',
  NGN: '₦',
  PHP: '₱',
  PLN: 'zł',
  PYG: '₲',
  THB: '฿',
  UAH: '₴',
  VND: '₫'
}

module.exports = generatePDF
