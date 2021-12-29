const Database = require('sqlite-async')

const getScoreSql = `
SELECT 
  user_id, 
  sum(7 - score) as score
FROM 
  games
GROUP BY
  user_id
ORDER BY
	score DESC
`

async function getScores() {
  try {
    const db = await Database.open('./db/rodeo.db');
    const data = await db.all(getScoreSql)
    await db.close()
    return data;
  } catch (err) {
    return console.error(err.message)
  }
}

module.exports = {
  getScoreSql,
  getScores
}