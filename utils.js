const makeConfig = (apiKey, isUA = false) => {
  if (!isUA) {
    return {
      headers: { "X-Redmine-API-Key": apiKey },
    };
  } else {
    return {
      headers: {
        "X-Redmine-API-Key": apiKey,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.102 Safari/537.36 OPR/90.0.4480.78 (Edition std-1)",
      },
    };
  }
};

const getValueFromArray = (array = [], key = "") => {
  if (array.length === 0) return null;
  for (let item of array) {
    if (item.name === key) return item.value;
  }
  return null;
};

const parseValueFromArray = (array = []) => {
  let list = [];
  for (let item of array) {
    list.push(item.name?.toLowerCase());
  }
  return list;
};

module.exports = { makeConfig, getValueFromArray, parseValueFromArray };
