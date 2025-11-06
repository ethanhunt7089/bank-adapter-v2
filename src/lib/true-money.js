const jwt = require("jsonwebtoken");

//rawData คือ message ที่ได้รับจากการเรียก Webhook
const rawData =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJldmVudF90eXBlIjoiUDJQIiwicmVjZWl2ZWRfdGltZSI6IjIwMjUtMTAtMjRUMDA6MTg6MDErMDcwMCIsInNlbmRlcl9tb2JpbGUiOiIwODgwNjYyNDkxIiwibWVzc2FnZSI6IiIsImFtb3VudCI6MjAwMCwiY2hhbm5lbCI6IiIsInNlbmRlcl9uYW1lIjoi4Liq4Li44Lie4Lix4LiV4Lij4LiyIOC4mOC4suC4lSoqKiIsInRyYW5zYWN0aW9uX2lkIjoiNTAwNDcwOTE4ODE4MDIiLCJpYXQiOjE3NjEyMzk4ODJ9.4m-LsGrTOI4zRedXzY5J1fQ-vNk1lIeUzIFwa7I9Kss";

const secret = "e8c70bc65228c708505777bbf8abc6e5"; //ใส่ .env ไว้

jwt.verify(rawData, secret, (err, decoded) => {
  if (err || !decoded) {
    console.log("Error = ", err.message);
  } else {
    console.log("decode = ", decoded);
  }
});
