const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const mysql = require("mysql");
const { rejects } = require("assert");
const { resolve } = require("path");

const app = express();
app.use(express.json());

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
    const sql = "CREATE TABLE IF NOT EXISTS users (memberid VARCHAR(255), name VARCHAR(255), password VARCHAR(255));";
    connection.query(sql,(err,res)=>{
      if(err)
        console.log(err)
      else
        console.log("user table created or it already exists!!!");
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
  return new Promise((res,rej)=>{
    connection.query(SQL, (err,result)=>{
      if(err)
        return rejects(err)
      return resolve(result)
    })
  })
}

app.get("/",(req,res)=>{res.send('SUITS')})

// POST REQUEST TO LOGIN
app.post("/userlogin", async (req, res) => {
  const {memberid, password} = req.body;
  // fetch the user details from IDC database 
  const userDetails = await getUserDetails(memberid)
  res.send(userDetails)
  // if(userDetail===undefined){
  //   res.status(400);
  //   res.send({"error":"Invalid user"});
  // }
  // else if(userDetail.password===password){
  //   res.status(200);
  //   const jwttoken = jwt.sign({userType:"general",memberid},"SUITS");
  //   res.send({"jwt_token":jwttoken});
  // }
  // else{
  //   res.status(400);
  //   res.send({"error":"Invalid Password"});
  // }
});

app.post("/techlogin",async (req,res)=>{
  const {mobile,password} = req.body;
  const labTechSnapShot = await labtech.get()
  const labtechList = labTechSnapShot.docs.map(doc=>doc.data())
  const labTechDetail = labtechList.filter((data)=>data.mobile===mobile)[0]
  if(labTechDetail === undefined){
    res.status(400);
    res.send({"error":"Invalid user"});
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
  const doctorSnapShot = await doctor.get()
  const doctorList = doctorSnapShot.docs.map(doc=>doc.data())
  const doctorDetail = doctorList.filter(data=>data.mobile===mobile)[0]
  if(doctorDetail === undefined){
    res.status(400);
    res.send({"error":"Invalid user"});
  }
  if(doctorDetail.password === password){
    res.status(200);
    const jwttoken = jwt.sign({userType:"doctor",mobile},"SUITS");
    res.send({"jwt_token":jwttoken});
  }
  else{
    res.status(400);
    res.send({"error":"Invalid password"});
  }
})

app.post("/userregister" , async (req, res)=>{
  const {memberid,name, password} = req.body;
  const sql = `SELECT * FROM users WHERE memberid = "${memberid}";`;
  const userDetail = await connection.query(sql)[0]
  if(userDetail !== undefined){
    res.status(400);
    res.send({"message":"User already exists"});
  }
  else{
    try{
      const sql = `INSERT INTO users VALUES("${memberid}","${name}","${password}")`
      connection.query(sql,(err,result)=>{
        if(err)
          console.log(err);
        else{
          console.log(result);
        }
      })
      res.status(200);
      res.send("Success!!!");
    }
    catch(err){
      console.log(err);
      res.status(400);
      res.send("Registration failed!");
    }
  }
});

app.post("/checkvaliduser",async (req,res)=>{
  const {memberid} = req.body;
  try{
    const snapshot = await user.get()
    const userList = snapshot.docs.map((doc)=>doc.data)
    const userDetail = userList.filter(data=>data.memberid===memberid)[0]
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
  const {name,mobile,address,password}=req.body;
  const snapshot = await labtech.get()
  const labTechList = snapshot.docs.map((doc)=>doc.data)
  const labTechDetail = labTechList.filter(data=>data.mobile===mobile)[0]
  if(labTechDetail !== undefined){
    res.status(400);
    res.send("Mobile already in use");
  }
  else{
    try{
      await labtech.add({name,mobile,password})
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
  const snapshot = await doctor.get()
  const doctorList = snapshot.docs.map((doc)=>doc.data)
  const doctorDetail = doctorList.filter(data=>data.mobile===mobile)[0]
  if(doctorDetail===undefined){
    res.status(400);
    res.send({"error":"Mobile already in user"});
  }
  else{
    try{
      await doctor.add({name,mobile,password})
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
  const {memberid,name,date,mobileNo,BP,FBS,PPBS,RBS,HbA1C,Urea,Creatinine,Microalbuminuria,Complaints,OtherSignificantNotes} = req.body;
  try{
    await labrecord.add({
      memberid,name,date,mobileNo,BP,FBS,PPBS,RBS,HbA1C,Urea,Creatinine,Microalbuminuria,Complaints,OtherSignificantNotes
    });
    res.status(200);
    res.send({"Data":"Data added successfully!"});
  }
  catch(err){
    console.log(err);
    res.status(400);
    res.send({"error":"Unable to save data into database!"});
  }
});

app.post("/newlabtechrecord",authenticateUser,async(req,res)=>{
  const {memberid,hemoglobin, PCV, RCB, MCV, MCHC, platelet, WBC, neutrophils,lymphocytes, eosinophils, basophils,rhTyping, monocytes, FBS, PPBS, urea, creatinine, BUN, sodium, potassium, chloride, T3, T4, TSH, xray, totalCholesterol,triglycerides, HDL, LDL, VLDL, totalCholesterolByHDLRatio,LDLByHDLRatio, bilirubinTotal, bilirubinDirect, bilirubinIndirect, SGOTByASL, SGPTByALT, phosphatase, totalProtein, albumin, globulin, agRatio, colour, PH, specificGravity, protein, glucose, ketone, nitrite, bilirubin, blood, urobilinogen, pusCells, epithelialCells, RBC, casts, crystals, others, bileSalt, bilePigments} = req.body;
  try{
    await labrecord.add({
      memberid,hemoglobin,PCV,RCB,MCV,MCHC,platelet,WBC,neutrophils,lymphocytes,eosinophils,basophils,rhTyping,monocytes,FBS,PPBS,urea,creatinine,BUN,sodium,potassium,chloride,T3,T4,TSH,totalCholesterol,triglycerides,HDL,LDL,VLDL,totalCholesterolByHDLRatio,LDLByHDLRatio,bilirubinTotal,bilirubinDirect,bilirubinIndirect,SGOTByASL,SGPTByALT,phosphatase,totalProtein,albumin,globulin,agRatio,colour,PH,specificGravity,protein,glucose,ketone,nitrite,bilirubin,blood,urobilinogen,pusCells,epithelialCells,RCB,casts,crystals,others,bileSalt,bilePigments
    });
    res.status(200);
    res.send({"data":"Data added successfully!"});
  }
  catch(err){
    console.log(err);
    res.status(400);
    res.send({"error":"Unable to save data into database!"});
  }
});

app.get("/showuserrecord",authenticateUser ,async (req, res)=>{
  const {memberid} = req.body;
  try{
    const snapshot = await labrecord.get()
    const recordList = snapshot.docs.map((doc) => doc.data)
    const records = recordList.filter(data => data.memberid===memberid)
    res.status(200);
    if(records.length===0)
      res.send({"data":"No data to show"});
    else
      res.send(records);
    console.log(records)
  }
  catch(err){
    console.log(err);
    res.status(400);
    res.send({"error":"Unable to fetch data!"});
  }
});

app.get("/showuserrecord/:memberid",authenticateUser ,async (req, res)=>{
  const {memberid} = req.body;
  try{
    const snapshot = await labrecord.get()
    const recordList = snapshot.docs.map((doc) => doc.data)
    const records = recordList.filter(data => data.memberid===memberid)
    res.status(200);
    if(records.length===0)
      res.send({"data":"No data to show"});
    else
      res.send(records);
    console.log(records)
  }
  catch(err){
    console.log(err);
    res.status(400);
    res.send({"error":"Unable to fetch data!"});
  }
});

const port = process.env.PORT || 3005;

app.listen(port,()=>{console.log(`Server running on http://localhost:${port}/`)})
