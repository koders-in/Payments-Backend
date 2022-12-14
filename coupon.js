// coupon code using as key must be in lowercase
const couponOpen = "open";
const couponClose = "close";
const availableCoupons = [
  {
    type: "FLAT",
    code: "Kode500",
    description: "",
    status: couponOpen,
    projectTag: "all",
    value: 20,
    minAmount: 100, // This must be in INR
  },
  {
    type: "PERCENTAGE",
    code: "discount100",
    description: "",
    status: couponOpen,
    projectTag: "all",
    value: 10,
    minAmount: 100,
  },
];
class CouponManager {
  constructor() {
    this.appliedCoupon = [];
  }
  static parseCouponCode(code = "") {
    return code.trim().toLowerCase();
  }

  static isValidCode(code) {
    return !(code.length === 0);
  }

  static isValidAmount(amount) {
    if (Number.isInteger(amount))
      return {
        result: true,
        amount: parseInt(amount),
      };
    if (!isNaN(parseFloat(amount)))
      return {
        amount: parseFloat(amount),
        result: true,
      };
    return {
      result: false,
      amount: 0,
    };
  }

  static isCouponExpired(status) {
    return status == couponClose;
  }

  static isValidTag(tagArr = [], targetedTag) {
    for (const tag of tagArr) {
      if (tag.toLowerCase() === targetedTag.toLowerCase()) return true;
    }
    return false;
  }

  static isCouponExistInList(couponCode) {
    for (const coupon of availableCoupons) {
      if (coupon.code.toLowerCase() === couponCode)
        return {
          exist: true,
          couponDetail: coupon,
        };
    }
    return {
      exist: false,
      couponDetail: coupon,
    };
  }

  calculate(budget, code, tagArr = []) {
    const { amount, result } = CouponManager.isValidAmount(budget);
    if (!result) return "IVALID_AMOUNT";
    const coupon = CouponManager.parseCouponCode(code);
    if (this.appliedCoupon.includes(coupon)) return "USED_COUPON_CODE";
    if (!CouponManager.isValidCode(coupon)) return "INVALID_CODE";
    const { couponDetail, exist } = CouponManager.isCouponExistInList(coupon);
    if (!exist) return "COUPON_NOT_EXIST";
    if (!(amount >= couponDetail.minAmount)) return "BUDGET_IS_TOO_SMALL";
    if (CouponManager.isCouponExpired(couponDetail.status))
      return "EXPIRED_COUPON";
    if (!CouponManager.isValidTag(tagArr, couponDetail.projectTag))
      return "TAG_NOT_MATCHED";
    this.appliedCoupon.push(CouponManager.parseCouponCode(couponDetail.code));
    if (couponDetail.type == "FLAT") return amount - couponDetail.value;
    else return amount - amount * (couponDetail.value / 100);
  }
}

module.exports = new CouponManager();
