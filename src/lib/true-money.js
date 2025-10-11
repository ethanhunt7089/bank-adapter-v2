const jwt = require('jsonwebtoken');

//rawData คือ message ที่ได้รับจากการเรียก Webhook
const rawData = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJldmVudF90eXBlIjoiUDJQIiwicmVjZWl2ZWRfdGltZSI6IjIwMjUtMTAtMTFUMDI6MzY6NTArMDcwMCIsInNlbmRlcl9tb2JpbGUiOiIwODI2NTM2NTg5IiwibWVzc2FnZSI6IiIsImFtb3VudCI6MjAwLCJjaGFubmVsIjoiIiwic2VuZGVyX25hbWUiOiLguJfguKPguIfguIrguLHguKIg4LmA4Lib4LijKioqIiwidHJhbnNhY3Rpb25faWQiOiI1MDA0NjY1MjYxODYwNCIsImlhdCI6MTc2MDEyNTAxMX0.YE0ymUH6V_9NKYJki5VHQqnaHR3rBNaHbYZR_-2JpZE';

const secret = '5ac3229a71af61ea62c5de9bb254c02a'; //ใส่ .env ไว้

jwt.verify(rawData, secret, (err, decoded) => {
    if (err || !decoded){
        console.log('Error = ', err.message);
    }else{
        console.log('decode = ', decoded);
    }
});