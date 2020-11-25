var mysql = require('mysql');

var con = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: "office_hours"
});

// https://www.w3schools.com/nodejs/nodejs_mysql_insert.asp

module.exports = {
    createMeeting: async function (professorName, meetingId) {
        SQL = `insert into office_hours (user_id, start_time, end_time, meeting_id)\
        values (${userId}, now(), now(), ${meetingId})`;
        return result;
    },
    addStudent: async function (studentName, meetingId) {
      return 33;
    }
};