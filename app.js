const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

const dbPath = path.join(__dirname, "covid19India.db");

let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

function convertDbObjectToResponseObject(dbObject) {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
}

function covertDbObjectToDistrictResponseObject(dbObject) {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
}

app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    Select 
      *
    From
      state;`;

  let stateArray = await database.all(getStatesQuery);
  stateArray = stateArray.map((dbObj) => {
    return convertDbObjectToResponseObject(dbObj);
  });
  response.send(stateArray);
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    Select 
      *
    From
      state
    where state_id = ${stateId};`;
  let state = await database.get(getStateQuery);
  state = convertDbObjectToResponseObject(state);
  response.send(state);
});

app.post("/districts/", async (request, response) => {
  const districtDetail = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetail;

  const addDistrictQuery = `
  Insert Into
    district(district_name,state_id,cases,cured,active,deaths)
    Values('${districtName}',${stateId}, ${cases},${cured},${active},${deaths});`;

  await database.run(addDistrictQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
  Select * 
  From 
  district
  Where district_id = ${districtId};`;
  const district = await database.get(getDistrictQuery);
  response.send(covertDbObjectToDistrictResponseObject(district));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    Delete From 
    district
    Where 
    district_id = ${districtId};`;

  await database.run(deleteDistrictQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const updateDistrictQuery = `
  Update
  district
  Set
  district_name = '${districtName}',
  state_id = ${stateId},
  cases = ${cases},
  cured = ${cured},
  active = ${active},
  deaths = ${deaths}
  Where district_id = ${districtId};`;

  await database.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getTotalCases = `
  Select 
  Sum(cases) as totalCases,
  Sum(cured) as totalCured,
  Sum(active) as totalActive,
  Sum(deaths) as totalDeaths
  From district
  Where state_id = ${stateId};`;

  const totalCases = await database.get(getTotalCases);
  response.send(totalCases);
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictDetailQuery = `
    Select 
    state_name as stateName
    from state inner join
    district on state.state_id = district.state_id
    where district_id = ${districtId};`;

  const stateName = await database.get(getDistrictDetailQuery);
  response.send(stateName);
});

module.exports = app;
