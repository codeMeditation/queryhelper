import { FindManyOptions, LessThanOrEqual, Like, MoreThanOrEqual } from "typeorm";

export function transformValue(value: any, type: string) {
  let attribute;
  let result;

  if (typeof value === "object") {
    attribute = Object.keys(value)[0];
    result = Object.values(value)[0];
  } else {
    result = value;
  }

  switch (type) {
    case "number":
      result = Number(result);
      break;
    case "boolean":
      result = result === "true" ?? false;
      break;
    default:
      break;
  }

  if (attribute) {
    const obj: any = {};
    obj[attribute] = result;
    return obj;
  } else {
    return result;
  }
}

function setNestedConditions(dbQuery: any, path: any, targetValue: any) {
  path = path.replace(/^\w+/, "where").replace(/\*/g, ".");
  const keys = path.split(".");
  const searchField = keys.pop();
  const lastQueryObject = keys.reduce((obj: any, key:any) => (obj[key] = obj[key] || {}), dbQuery);
  lastQueryObject[searchField] = targetValue;
  return dbQuery;
}

function getTargetValue(value: any) {
  const filter = buildFilter(value);
  return buildTargetValue(filter.value, filter.operator);
}

function buildFilter(value: any): Filter {
  if (typeof value === "object") {
    return {
      operator: Object.keys(value)[0] as Operator,
      value: Object.values(value)[0],
    };
  } else {
    return {
      operator: "like",
      value,
    };
  }
}

function buildTargetValue(value: any, operator: string) {
  let result;
  switch (operator) {
    case "eq":
      result = value;
      break;
    case "like":
      result = Like(`%${value}%`);
      break;
    case "gte":
      result = MoreThanOrEqual(value);
      break;
    case "lte":
      result = LessThanOrEqual(value);
      break;
    default:
      result = value;
      break;
  }
  return result;
}

export function buildSearchParams(query: Query): DbQuery {
  let dbQuery: FindManyOptions<any> = {};
  dbQuery.where = {};
  let page = 1;
  let count = 50;

  Object.keys(query).forEach((key) => (query[key] === undefined ? delete query[key] : {}));

  if (query.hasOwnProperty("page")) {
    page = query["page"];
    delete query.page;
  }

  if (query.hasOwnProperty("count")) {
    count = query["count"];
    delete query.count;
  }

  for (const key in query) {
    if (query.hasOwnProperty(key)) {
      const targetValue = getTargetValue(query[key]);
        if (key.indexOf("*") !== -1) {
        dbQuery = setNestedConditions(dbQuery, key, targetValue);
        } else {
          if (dbQuery.where) {
            dbQuery.where[key] = targetValue;
          }
        }
    }   
  }
  dbQuery.skip = (page - 1) * count;
  dbQuery.take = count;
  return dbQuery;
}

interface Query {
  [key: string]: any;
}

type DbQuery = FindManyOptions<any>;

type Operator = "eq" | "lte" | "gte" | "like";

interface Filter {
  operator: Operator;
  value: any;
}
