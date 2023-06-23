const pdf = require("html-pdf");
const fs = require("fs");
const handlebars = require("handlebars");
const { v4: uuidv4 } = require("uuid");

function generatePDF(response) {
  return new Promise((resolve, reject) => {
    try {
      const source = fs.readFileSync("./invoice.hbs", "utf8");
      const template = handlebars.compile(source);
      const data = getInvoiceObject(response);
      const html = template({
        ...data,
        isShowEarlyPay: parseInt(data.earlyPayDiscount) > 0,
      });
      const options = {
        format: "Letter",
      };
      const uniqueName = uuidv4();
      const path = `./pdf/${uniqueName}.pdf`;
      pdf.create(html, options).toFile(path, async (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
}

function getInvoiceObject(payload) {
  return {
    name:
      payload?.contactDetails?.first_name +
      " " +
      payload.contactDetails?.middle_name +
      " " +
      payload?.contactDetails?.last_name,
    invoiceNo: payload?.invoiceData?.number,
    invoiceDate: payload?.invoiceData?.invoice_date,
    currency: currency_symbols[payload?.invoiceData?.currency],
    address: payload?.contactDetails?.address?.full_address?.full_address,
    number: payload?.contactDetails?.phones[0]?.number,
    email: payload?.contactDetails?.emails[0]?.address,
    lines: payload?.invoiceData?.lines.map((item, i) => ({
      ...item,
      index: i + 1,
    })),
    payments: payload?.invoiceData?.payments.map((item) => ({
      ...item,
      payment_date: new Date(item?.payment_date).toLocaleString().split(",")[0],
      currency: currency_symbols[payload?.invoiceData?.currency],
    })),
    invoice:
      payload?.invoiceData?.status?.name !== "Estimate" ||
      payload?.invoiceData?.status?.name !== "Draft"
        ? "Invoice"
        : "Quotation",
    total: geTotalOfInvoiceLines(payload?.invoiceData?.lines),
    discountPercent: Number(
      payload?.invoiceData?.discount / 100
    ).toLocaleString(undefined, { style: "percent", minimumFractionDigits: 2 }),
    discountAmount: (
      Math.ceil(
        (payload?.invoiceData?.amount / 100) *
          payload?.invoiceData?.discount *
          10
      ) / 10
    ).toFixed(2),
    balance: payload?.invoiceData?.balance,
    earlyPayDate: new getEarlyPayData(payload?.invoiceData)?.date,
    earlyPayDiscount: getEarlyPayData(payload?.invoiceData)?.discount,
    earlyPayAmt: (
      parseFloat(payload?.invoiceData?.amount) -
      parseFloat(getEarlyPayData(payload?.invoiceData)?.discount) -
      parseFloat(payload?.invoiceData?.balance)
    ).toFixed(2),
    conditions: payload?.invoiceData?.custom_fields
      .filter((item) => item.name === "Terms & Condition")[0]
      ?.value?.split(","),
    qr: payload?.invoiceData?.custom_fields.filter(
      (item) => item.name === "QR"
    )[0],
  };
}

function geTotalOfInvoiceLines(lines) {
  let total = 0;
  lines.forEach((line) => {
    total += parseFloat(line.total);
  });
  return total;
}

function getEarlyPayData(invoiceData) {
  let earlyPayData = {};
  invoiceData?.custom_fields.forEach((item) => {
    if (item?.name === "Early Pay Date") {
      earlyPayData["date"] = new Date(item?.value)
        .toLocaleString()
        .split(",")[0];
    }
    if (item?.name === "Early Pay Discount") {
      earlyPayData["discount"] = item?.value;
    }
  });
  return earlyPayData;
}

const currency_symbols = {
  USD: "$", // US Dollar
  EUR: "€", // Euro
  CRC: "₡", // Costa Rican Colón
  GBP: "£", // British Pound Sterling
  ILS: "₪", // Israeli New Sheqel
  INR: "₹", // Indian Rupee
  JPY: "¥", // Japanese Yen
  KRW: "₩", // South Korean Won
  NGN: "₦", // Nigerian Naira
  PHP: "₱", // Philippine Peso
  PLN: "zł", // Polish Zloty
  PYG: "₲", // Paraguayan Guarani
  THB: "฿", // Thai Baht
  UAH: "₴", // Ukrainian Hryvnia
  VND: "₫", // Vietnamese Dong
};

module.exports = generatePDF;
