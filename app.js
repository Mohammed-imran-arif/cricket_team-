const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
const app = express();

app.use(express.json());

let db = null;
const initializationOfDbandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server is running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
initializationOfDbandServer();

//Login API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `select * from user where username ='${username}';`;
  const dbUser = await db.get(getUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isMatchedPassword = await bcrypt.compare(password, dbUser.password);
    if (isMatchedPassword === true) {
      const payload = { username: username };
      const jwtToken = await jwt.sign(payload, "msg123");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//Authentication API
const authetication = (request, response, next) => {
  let jwToken;
  const token = request.headers["authorization"];
  if (token !== undefined) {
    jwToken = token.split(" ")[1];
    if (jwToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      const isMatchedJWToken = jwt.verify(
        jwToken,
        "msg123",
        (error, payload) => {
          if (error) {
            response.status(401);
            response.send("Invalid JWT Token");
          } else {
            next();
          }
        }
      );
    }
  } else {
    response.status(401);
    response.send("Invalid JWT Token");
  }
};

const convertStateDbObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};
//Get all states API
app.get("/states/", authetication, async (request, response) => {
  const getStateQuery = `select * from state;`;
  const getStateQueryResponse = await db.all(getStateQuery);
  response.send(
    getStateQueryResponse.map((each) => convertStateDbObject(each))
  );
});
//GET state API
app.get("/states/:stateId/", authetication, async (request, response) => {
  const { stateId } = request.params;
  const getStateIdQuery = `select * from state where state_Id=${stateId};`;
  const getStateIDResponse = await db.get(getStateIdQuery);
  response.send(convertStateDbObject(getStateIDResponse));
});
//ADD district API
app.post("/districts/", authetication, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const getDistrictQuery = `insert into district(district_name,state_id,cases,cured,active,deaths)
values('${districtName}',${stateId},'${cases}','${cured}','${active}','${deaths}');`;
  const getDistrictResponse = await db.run(getDistrictQuery);
  response.send("District Successfully Added");
});

const convertDistrictDbObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};
//get districts API
app.get("/districts/:districtId/", authetication, async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `select * from district where district_id=${districtId};`;
  const getDistrictResponse = await db.get(getDistrictQuery);
  response.send(convertDistrictDbObject(getDistrictResponse));
});
//delete district API
app.delete(
  "/districts/:districtId/",
  authetication,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrcitQuery = `delete from district where district_id=${districtId};`;
    const deleteDistrcitQueryResponse = await db.run(deleteDistrcitQuery);
    response.send("District Removed");
  }
);
//Update District API
app.put("/districts/:districtId/", authetication, async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, active, cured, deaths } = request.body;
  const updateDistrictQuery = `update district 
set district_name='${districtName}',state_id=${stateId},cases='${cases}',active='${active}',cured='${cured}',deaths='${deaths}' where district_id=${districtId};`;
  const updated = await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});
//add total
app.get("/states/:stateId/stats/", authetication, async (request, response) => {
  const { stateId } = request.params;
  const getTotalQuery = ` select sum(cases) as totalCases ,sum(cured) as totalCured,sum(active) as totalActive,sum(deaths) as totalDeaths from district where state_id=${stateId};`;
  const getTotalQueryResponse = await db.get(getTotalQuery);
  response.send(getTotalQueryResponse);
});
module.exports = app;
