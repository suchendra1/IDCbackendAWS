require('dotenv').config();

const express = require("express");
const jwt = require("jsonwebtoken");
const mysql = require("mysql");

const app = express();
app.use(express.json());

const cors=require("cors");
const req = require("express/lib/request");
const corsOptions ={
  origin:'*', 
  credentials:true,            //access-control-allow-credentials:true
  optionSuccessStatus:200,
}

app.use(cors(corsOptions))

var connection = mysql.createConnection({
    host     : process.env.RDS_HOSTNAME,
    user     : process.env.RDS_USERNAME,
    password : process.env.RDS_PASSWORD,
    port     : process.env.RDS_PORT,
    database  : "IDC"
})

connection.connect((err)=>{
  if(err)
    console.log(err);
  else{
    // users table
    const users_sql = "CREATE TABLE IF NOT EXISTS users (memberid VARCHAR(255) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL);";
    connection.query(users_sql,(err,res)=>{
      if(err)
        console.log(err)
      else
        console.log("user table created or it already exists!!!");
    })
    // labtech table
    const labtech_sql = "CREATE TABLE IF NOT EXISTS labtech (mobile VARCHAR(255) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL);";
    connection.query(labtech_sql,(err,res)=>{
      if(err)
        console.log(err)
      else
        console.log("labtech table created or it already exists!!!");
    })
    // doctor table
    const doctor_sql = "CREATE TABLE IF NOT EXISTS doctor (mobile VARCHAR(255) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL);";
    connection.query(doctor_sql,(err,res)=>{
      if(err)
        console.log(err)
      else
        console.log("doctor table created or it already exists!!!");
    })
    // users_memberid table
    const memberid_sql = "CREATE TABLE IF NOT EXISTS user_memberid (current_memberid INT DEFAULT 1);";
    connection.query(memberid_sql,(err,res)=>{
      if(err)
        console.log(err)
      else
        console.log("user_memberid table created or it already exists!!!");
    })
    // check if the memberid table is empty
    const add_to_memberid_sql = "INSERT INTO user_memberid (current_memberid) SELECT 2 WHERE NOT EXISTS (SELECT * FROM user_memberid);"
    connection.query(add_to_memberid_sql,(err,res)=>{
      if(err)
        console.log(err);
      else
        console.log("added value to user_memberid or the vallue already exists");
    })
    // create table for records
    const create_record_table_sql = "CREATE TABLE IF NOT EXISTS records (id int(10) NOT NULL UNIQUE AUTO_INCREMENT,memberid VARCHAR(15) NOT NULL,hemoglobin VARCHAR(15),PCV VARCHAR(15),RCB VARCHAR(15),MCV VARCHAR(15),MCHC VARCHAR(15),platelet VARCHAR(15),WBC VARCHAR(15),neutrophils VARCHAR(15),lymphocytes VARCHAR(15),eosinophils VARCHAR(15),basophils VARCHAR(15),rhTyping VARCHAR(15),monocytes VARCHAR(15),FBS VARCHAR(15),PPBS VARCHAR(15),urea VARCHAR(15),creatinine VARCHAR(15),BUN VARCHAR(15),sodium VARCHAR(15),potassium VARCHAR(15),chloride VARCHAR(15),T3 VARCHAR(15),T4 VARCHAR(15),TSH VARCHAR(15),totalCholesterol VARCHAR(15),triglycerides VARCHAR(15),HDL VARCHAR(15),LDL VARCHAR(15),VLDL VARCHAR(15),totalCholesterolByHDLRatio VARCHAR(15),LDLByHDLRatio VARCHAR(15),bilirubinTotal VARCHAR(15),bilirubinDirect VARCHAR(15),bilirubinIndirect VARCHAR(15),SGOTByASL VARCHAR(15),SGPTByALT VARCHAR(15),phosphatase VARCHAR(15),totalProtein VARCHAR(15),albumin VARCHAR(15),globulin VARCHAR(15),agRatio VARCHAR(15),colour VARCHAR(15),PH VARCHAR(15),specificGravity VARCHAR(15),protein VARCHAR(15),glucose VARCHAR(15),ketone VARCHAR(15),nitrite VARCHAR(15),bilirubin VARCHAR(15),blood VARCHAR(15),urobilinogen VARCHAR(15),pusCells VARCHAR(15),epithelialCells VARCHAR(15),RBC VARCHAR(15),casts VARCHAR(15),crystals VARCHAR(15),others VARCHAR(15),bileSalt VARCHAR(15),bilePigments VARCHAR(15))";
    connection.query(create_record_table_sql,(err,result)=>{
      if(err)
        console.log(err);
      else
        console.log("Created table records or it already exists!!!");
    })
  }
})

const authenticateUser = async (req, res, next) => {
  let jwtToken;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    res.status(401);
    res.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "SUITS", async (error, payload) => {
    if (error) {
      res.status(401);
      res.send("Invalid JWT Token");
    } 
    else {
      if(payload.userType==="general")
        req.body.memberid=payload.memberid
      else if(payload.userType==="labtech")
        req.body.mobile=payload.mobile;
      else if(payload.userType==="doctor")
        req.body.mobile=payload.mobile;
      next();
    }
  });
  }
}

const getUserDetails = (memberid) => {
  const SQL = `SELECT * FROM users where memberid="${memberid}"`;
  return new Promise((resolve,reject)=>{
    connection.query(SQL, (err,result)=>{
      if(err)
        return reject(err)
      return resolve(result)
    })
  })
}

const getLabtechDetails = (mobile) => {
  const SQL = `SELECT * FROM labtech where mobile="${mobile}"`;
  return new Promise((resolve,reject)=>{
    connection.query(SQL, (err,result)=>{
      if(err)
        return reject(err)
      return resolve(result)
    })
  })
}

const getDoctorDetails = (mobile) => {
  const SQL = `SELECT * FROM doctor WHERE mobile="${mobile}"`;
  return new Promise((resolve,reject)=>{
    connection.query(SQL, (err,result)=>{
      if(err)
        return reject(err)
      return resolve(result)
    })
  })
}

const getNextMemberid = () => {
  const SQL = `SELECT * FROM user_memberid;`;
  return new Promise((resolve,reject)=>{
    connection.query(SQL, (err,result)=>{
      if(err)
        return reject(err)
      return resolve(result)
    })
  })
}

app.get("/",(req,res)=>{res.send('SUITS')});

// generates and returns the next memberid
app.get("/nextmemberid",async (req,res)=>{
  const currentMemberIdList = await getNextMemberid()
  const currentMemberId = currentMemberIdList[0].current_memberid;
  let memberid = "IDC";
  if(currentMemberId < 10)
    memberid += "000"+currentMemberId
  else if(currentMemberId < 100)
    memberid += "00"+currentMemberId
  else if(currentMemberId < 1000)
    memberid += "0"+currentMemberId
  else
    memberid += currentMemberId
  res.send({memberid})
});

// POST REQUEST TO LOGIN
app.post("/userlogin", async (req, res) => {
  const {memberid, password} = req.body;
  // fetch the user details from IDC database 
  const userDetails = await getUserDetails(memberid)
  const userDetail = userDetails[0];
  if(userDetail===undefined){
    res.status(400);
    res.send({"error":"Invalid user"});
  }
  else if(userDetail.blocked==="YES"){
    res.status(400);
    res.send({"error":"You have been temporarily blocked!!!"});
  }
  else if(userDetail.password===password){
    res.status(200);
    const jwttoken = jwt.sign({userType:"general",memberid},"SUITS");
    res.send({"jwt_token":jwttoken});
  }
  else{
    res.status(400);
    res.send({"error":"Invalid Password"});
  }
});

app.post("/techlogin",async (req,res)=>{
  const {mobile,password} = req.body;
  const labtechDetails = await getLabtechDetails(mobile);
  const labTechDetail = labtechDetails[0];
  if(labTechDetail === undefined){
    res.status(400);
    res.send({"error":"Invalid user"});
  }
  else if(labtechDetails.blocked==="YES"){
    res.status(400);
    res.send({"error":"You have been temporarily blocked!!!"});
  }
  else if(labTechDetail.password === password){
    const jwttoken = jwt.sign({userType:"labtech",mobile},"SUITS");
    res.status(200)
    res.send({"jwt_token":jwttoken});
  } 
  else{
    res.status(400);
    res.send({"error":"Invalid Password"});
  }
})

app.post("/doctorlogin",async (req,res)=>{
  const {mobile,password} = req.body;
  const doctorDetails = await getDoctorDetails(mobile);
  const doctorDetail = doctorDetails[0];
  if(doctorDetail === undefined){
    res.status(400);
    res.send({"error":"Invalid user"});
  }
  else if(doctorDetail.blocked==="YES"){
    res.status(400);
    res.send({"error":"You have been temporarily blocked!!!"});
  }
  else if(doctorDetail.password === password){
    res.status(200);
    const jwttoken = jwt.sign({userType:"doctor",mobile},"SUITS");
    res.send({"jwt_token":jwttoken});
  }
  else{
    res.status(400);
    res.send({"error":"Invalid password"});
  }
});

app.post("/userregister" , async (req, res)=>{
  const {memberid,name,mobile, password} = req.body;
  const userDetails = await getUserDetails(memberid)
  const userDetail = userDetails[0]
  if(userDetail !== undefined){
    res.status(400);
    res.send({"message":"User already exists"});
  }
  else{
    try{
      const sql = `INSERT INTO users (memberid,mobile,name,password) VALUES("${memberid}","${name}","${password}")`;
      connection.query(sql,(err,result)=>{
        if(err)
          console.log(err);
        else{
          console.log(result);
          res.status(200);
          res.send({"message":"Success!!!"});
          const update_sql = `UPDATE user_memberid SET current_memberid = current_memberid+1;`;
          // update the memberid to next memberid
          connection.query(update_sql, (err,result)=>{
            if(err)
              console.log(err);
            else
              console.log(result);
          })
        }
      })
    }
    catch(err){
      console.log(err);
      res.status(400);
      res.send({"message":"Registration failed!"});
    }
  }
});

app.post("/checkvaliduser",async (req,res)=>{
  const {memberid} = req.body;
  try{
    const userDetails = await getUserDetails(memberid);
    const userDetail = userDetails[0];
    if(userDetail===undefined)
    {
      res.status(400)
      res.send({"message":"No such user"})
    }
    else{
      res.status(200)
      res.send({"message":"Valid user"})
    }
  }
  catch(err){
    console.log(err);
    res.status(400);
    res.send({"errmessage":"Failed to check database!"})
  }
});

app.post("/labtechregister",async(req,res)=>{
  const {name,mobile,password}=req.body;
  const labtechDetails = await getLabtechDetails(mobile);
  const labTechDetail = labtechDetails[0];
  if(labTechDetail !== undefined){
    res.status(400);
    res.send("Mobile already in use");
  }
  else{
    try{
      const sql = `INSERT INTO labtech (name,mobile,password) VALUES ("${name}","${mobile}","${password}");`;
      connection.query(sql,(err,res)=>{
        if(err)
          console.log(err);
        else
          console.log("Added new labtech to database");
      });
      res.status(200);
      res.send("Registration success!!!");
    }
    catch(err){
      console.log(err);
      res.status(400);
      res.send("Registration failed!");
    }
  }
});

app.post("/doctorregister",async (req,res)=>{
  const {name,mobile,password} = req.body;
  const doctorDetails = await getDoctorDetails(mobile);
  const doctorDetail = doctorDetails[0];
  if(doctorDetail===undefined){
    res.status(400);
    res.send({"error" : "Mobile already in user"});
  }
  else{
    try{
      const sql = `INSERT INTO doctor (name,mobile,password) VALUES ("${name}","${mobile}","${password}");`;
      connection.query(sql,(err,res)=>{
        if(err)
          console.log(err);
        else
          console.log("Added new doctor to database");
      });
      res.status(200);
      res.send({"data":"Registration Success!!"});
    }
    catch(err){
      console.log(err);
      res.status(400);
      res.send({"data":"Registration failed!!"});
    }
  }
})

app.post("/getusermemberid",authenticateUser,async(req,res)=>{
  const {memberid} = req.body;
  console.log(memberid)
  res.send({memberid});
})

app.post("/getlabtechmobile",authenticateUser,async(req,res)=>{
  const {mobile} = req.body;
  res.send({mobile});
});

app.post("/getdoctormobile",authenticateUser,async(req,res)=>{
  const {mobile} = req.body;
  res.send({mobile});
})

app.post("/newuserrecord",authenticateUser, async (req,res)=>{
  let sql = `INSERT INTO records (`
  for(let vals in req.body){
    sql+=`${vals},`;
  }
  sql = sql.slice(0,-1)
  sql+=`) VALUES (`
  for(let vals in req.body){
    sql+=`"${req.body[vals]}",`;
  }
  sql = sql.slice(0,-1)
  sql+=`);`;
  console.log(sql);
  connection.query(sql,(err,result)=>{
    if(err){
      console.log(err);
      res.status(400);
      res.send({"error":"Unable to save data into database!"});
    }
    else{
      res.status(200);
      res.send({"data":"Data added successfully!"});
    }
  })
});

app.post("/newlabtechrecord",authenticateUser,async(req,res)=>{
  // const {memberid,hemoglobin, PCV, RCB, MCV, MCHC, platelet, WBC, neutrophils,lymphocytes, eosinophils, basophils,rhTyping, monocytes, FBS, PPBS, urea, creatinine, BUN, sodium, potassium, chloride, T3, T4, TSH, totalCholesterol,triglycerides, HDL, LDL, VLDL, totalCholesterolByHDLRatio,LDLByHDLRatio, bilirubinTotal, bilirubinDirect, bilirubinIndirect, SGOTByASL, SGPTByALT, phosphatase, totalProtein, albumin, globulin, agRatio, colour, PH, specificGravity, protein, glucose, ketone, nitrite, bilirubin, blood, urobilinogen, pusCells, epithelialCells, RBC, casts, crystals, others, bileSalt, bilePigments} = req.body;
  // const sql = `INSERT INTO records values ("${memberid}","${hemoglobin}","${PCV}", "${RCB}", "${MCV}", "${MCHC}", "${platelet}", "${WBC}", "${neutrophils}","${lymphocytes}", "${eosinophils}", "${basophils}","${rhTyping}", "${monocytes}", "${FBS}", "${PPBS}", "${urea}", "${creatinine}", "${BUN}", "${sodium}", "${potassium}", "${chloride}", "${T3}", "${T4}", "${TSH}", "${totalCholesterol}","${triglycerides}", "${HDL}", "${LDL}", "${VLDL}", "${totalCholesterolByHDLRatio}","${LDLByHDLRatio}", "${bilirubinTotal}", "${bilirubinDirect}", "${bilirubinIndirect}", "${SGOTByASL}", "${SGPTByALT}", "${phosphatase}", "${totalProtein}", "${albumin}", "${globulin}", "${agRatio}", "${colour}", "${PH}", "${specificGravity}", "${protein}", "${glucose}", "${ketone}", "${nitrite}", "${bilirubin}", "${blood}", "${urobilinogen}", "${pusCells}", "${epithelialCells}", "${RBC}", "${casts}", "${crystals}", "${others}", "${bileSalt}", "${bilePigments}");`;
  let sql = `INSERT INTO records (`
  for(let vals in req.body){
    sql+=`${vals},`;
  }
  sql = sql.slice(0,-1)
  sql+=`) VALUES (`
  for(let vals in req.body){
    sql+=`"${req.body[vals]}",`;
  }
  sql = sql.slice(0,-1)
  sql+=`);`;
  console.log(sql);
  connection.query(sql,(err,result)=>{
    if(err){
      console.log(err);
      res.status(400);
      res.send({"error":"Unable to save data into database!"});
    }
    else{
      res.status(200);
      res.send({"data":"Data added successfully!"});
    }
  })
});

app.get("/showuserrecord",authenticateUser ,async (req, res)=>{
  const {memberid} = req.body;
  const sql = `SELECT * FROM records WHERE memberid="${memberid}";`;
  connection.query(sql,(err,result)=>{
    if(err){
      console.log(err);
      res.status(400);
      res.send({"error":"Unable to fetch data from database!"});
    }
    else{
      res.status(200);
      if(result.length===0)
        res.send({"data":"No data to show"});
      else
        res.send(result);
      console.log(records)
    }
  })
});

app.get("/showuserrecord/:memberid",authenticateUser ,async (req, res)=>{
  const {memberid} = req.params;
  const sql = `SELECT * FROM records WHERE memberid="${memberid}";`;
  connection.query(sql,(err,result)=>{
    if(err){
      console.log(err);
      res.status(400);
      res.send({"error":"Unable to fetch data from database!"});
    }
    else{
      res.status(200);
      if(result.length===0)
        res.send({"data":"No data to show"});
      else
        res.send(result);
      console.log(records)
    }
  })
});

const port = process.env.PORT || 3005;

app.listen(port,()=>{console.log(`Server running on port : ${port}`)})
