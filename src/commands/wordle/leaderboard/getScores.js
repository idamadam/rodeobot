const Database = require('sqlite-async');
const { calculateWeeklyLeaderboardDates } = require('./weeklyLeaderboardDates');

const allTimeSql = `
SELECT 
  CAST (user_id AS TEXT) as user_id, 
  sum(7 - score) as score,
  DENSE_RANK () OVER ( ORDER BY  sum(7 - score)  DESC  ) rank 
FROM 
  games
GROUP BY
  user_id
ORDER BY
	score ASC
`


const weeklySql = (prevSunday, nextSunday) => (`
SELECT 
  CAST (user_id AS TEXT) as user_id, 
  sum(7 - score) as score,
  DENSE_RANK () OVER ( ORDER BY  sum(7 - score)  DESC  ) rank 
FROM 
  games
WHERE
  timestamp BETWEEN '${prevSunday}' AND '${nextSunday}'
GROUP BY
  user_id
ORDER BY
	score ASC
`)

async function getScores(type = 'all-time') {
  const weeklyLeaderboardDates = calculateWeeklyLeaderboardDates();
  const prevSunday = weeklyLeaderboardDates[0];
  const nextSunday = weeklyLeaderboardDates[1];

  const sql = (type == 'all-time') ? allTimeSql : weeklySql(prevSunday, nextSunday);
  
  try {
    const db = await Database.open(process.env.DB_PATH);
    const data = await db.all(sql);
    await db.close()
    return data;
  } catch (err) {
    return console.error(err.message)
  }
}

module.exports = {
  allTimeSql,
  weeklySql,
  getScores
}