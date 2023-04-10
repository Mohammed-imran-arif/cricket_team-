const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializationOfDbandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server is running on http:localhost:3000/");
    });
  } catch (error) {
    console.log(`db error is ${error}`);
    process.exit(1);
  }
};
initializationOfDbandServer();

//API 1 Returns a list of all the players in the player table
const convertPlayerDetailsQuery = (objectItem) => {
  return {
    playerId: objectItem.player_id,
    playerName: objectItem.player_name,
  };
};

app.get("/players/", async (request, response) => {
  const getPlayerDetailsQuery = `select * from player_details`;
  const getPlayerDetailsQueryResponse = await db.all(getPlayerDetailsQuery);
  response.send(
    getPlayerDetailsQueryResponse.map((each) => convertPlayerDetailsQuery(each))
  );
});

//API 2 Returns a specific player based on the player ID
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getParticularPlayerQuery = `select * from player_details 
    where player_id=${playerId};`;
  const getParticularPlayerQueryResponse = await db.get(
    getParticularPlayerQuery
  );
  response.send(convertPlayerDetailsQuery(getParticularPlayerQueryResponse));
});

//API 3 Updates the details of a specific player based on the player ID
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePLayerDetailsQuery = `update player_details 
    set player_name='${playerName}'
    where player_id=${playerId};`;

  const updatePLayerDetailsQueryResponse = await db.run(
    updatePLayerDetailsQuery
  );
  response.send("Player Details Updated");
});

//API 4 Returns the match details of a specific match
const convertMatchDetailsQuery = (objectItem) => {
  return {
    matchId: objectItem.match_id,
    match: objectItem.match,
    year: objectItem.year,
  };
};

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetailsQuery = `select * from match_details where match_id=${matchId}`;
  const getMatchDetailsQueryResponse = await db.get(getMatchDetailsQuery);
  response.send(convertMatchDetailsQuery(getMatchDetailsQueryResponse));
});

//API 5 Returns a list of all the matches of a player
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getMatchesOfPlayerQuery = `select * from player_match_score 
  natural join match_details  where player_id = ${playerId};`;

  const getMatchesOfPlayer = await db.all(getMatchesOfPlayerQuery);
  response.send(
    getMatchesOfPlayer.map((eachItem) => convertMatchDetailsQuery(eachItem))
  );
});

//API 6 Returns a list of players of a specific match
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getMatchPlayerQuery = `select * from player_match_score NATURAL join player_details 
    where match_id=${matchId};`;
  const getMatchPlayerQueryResponse = await db.all(getMatchPlayerQuery);
  response.send(
    getMatchPlayerQueryResponse.map((eachItem) =>
      convertPlayerDetailsQuery(eachItem)
    )
  );
});

//API 7 Returns the statistics of the total score, fours, sixes of a specific player based on the player ID
const convertFoutSixScoredb = (objectItem) => {
  return {
    playerId: objectItem.player_id,
    playerName: objectItem.player_name,
    totalScore: objectItem.totalScore,
    totalFours: objectItem.totalFours,
    totalSixes: objectItem.totalSixes,
  };
};

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerScored = `
    select player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(player_match_score.score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes FROM 
    player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};`;

  const getPlayerState = await db.get(getPlayerScored);
  response.send(getPlayerState);
});

module.exports = app;
