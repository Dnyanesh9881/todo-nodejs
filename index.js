require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Schema=mongoose.Schema
const userModel = require("./models/userModel");
const bcrypt = require("bcryptjs");
const { userDataValidation, isEmailRgex } = require("./utils/authUtils");
const session = require("express-session");
const mongoDbSession = require("connect-mongodb-session")(session);
const isAuth = require("./middlewares/isAuthMiddleware");
const todoModel = require("./models/todoModel");

// constants
const app = express();
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT;
const store = new mongoDbSession({
  uri: process.env.MONGO_URI,
  collection:"sessions",
});

//middlewares
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store,
  })
);
// connect DataBase
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("connected dataBase");
  })
  .catch((err) => {
    console.log(err);
  });

//API's
app.get("/", (req, res) => {
  return res.send("Todo server is working");
});

app.get("/login", (req, res) => {
  return res.render("loginPage");
});

app.post("/login", async (req, res) => {
  const { loginId, password } = req.body;

  if (!loginId || !password)
    return res.status(400).json("All fields are required");

  try {
    let userDb;
    if (isEmailRgex({ email: loginId })) {
      userDb = await userModel.findOne({ email: loginId });
    } else {
      userDb = await userModel.findOne({ username: loginId });
    }

    if (!userDb) return res.status(400).json("User Not Found");

    //passwod match
    const passwodMatch = await bcrypt.compare(password, userDb.password);
    if (!passwodMatch) return res.status(400).json("Password does not match");

    req.session.isAuth = true; // storing the session in dataBase
    req.session.user = {
      userId: userDb._id,
      username: userDb.username,
      email: userDb.email,
    };
    console.log(req.session);

    return res.redirect("/dashboard");
  } catch (error) {
    console.log(error);
    return res.send({
      status: 500,
      message: "Internal server Error",
      error: error,
    });
  }
});

app.get("/register", (req, res) => {
  return res.render("registerPage");
});

app.post("/register", async (req, res) => {
  //   console.log(req.body);
  const { name, email, username, password } = req.body;

  try {
    await userDataValidation({ name, email, username, password });
  } catch (error) {
    return res.status(400).json(error);
  }

  const isEmailExist = await userModel.findOne({ email: email });
  if (isEmailExist) {
    return res.send({
      status: 400,
      message: "Email already exist",
    });
  }

  const isUsernameExist = await userModel.findOne({ username: username });
  if (isUsernameExist) {
    return res.send({
      status: 400,
      message: "Username already exist",
    });
  }
  const hashPassword = await bcrypt.hash(password, parseInt(process.env.SALT));

  const userObj = new userModel({
    name,
    email,
    username,
    password: hashPassword,
  });
  console.log(userObj);

  try {
    const userdb = await userObj.save();
    // return res.send({
    //   status: 201,
    //   meassage: "register successfully",
    //   data: userdb,
    // });
    return res.redirect("/login");
  } catch (error) {
    return res.send({
      status: 500,
      message: "internal server error",
      error: error,
    });
  }
});

app.get("/dashboard", isAuth, (req, res) => {
  return res.render("dashboardPage.ejs");
});
app.post("/logout", isAuth, (req, res)=>{

  req.session.destroy((err)=>{
      if(err) return res.send({
        status:500,
        message:"Internal server Error",
        error:err
      })
  })
  return res.redirect("/login");
})

app.post("/logout_from_all_devices", isAuth, async(req, res)=>{
  
  const username=req.session.user.username;

  const sessionSchema=new Schema({_id:String}, {strict:false});
  const sessionModel=mongoose.model("session",sessionSchema);
 
  try {
    const deleteDb=await sessionModel.deleteMany({
      "session.user.username":username
    })
    console.log(deleteDb);
    return res.redirect("/login");
  } catch (error) {
    return res.status(500).json(error);
  }

});

app.post ("/create-item", async(req, res)=>{
      console.log(req.body);
     const username=req.session.user.username;
     const {todo}=req.body;

     if(!todo) return  res.status(400).json("Missing Todo Text");
     if(typeof todo!=="string")return res.send({ status: 400, message: "Todo is not a text" });
    //  if(todo.length>=3 && todo.length<=100) return res.send({status:400, message:"Text length should be in between 3-100"});

     const todoObj=new todoModel({
      todo,
      username
     });
     console.log(todoObj);
     try {
        let todoDb=await todoObj.save();
        console.log(todoDb);
        return res.status(201).json("Todo created successfully");
     } catch (error) {
       return res.status(500).json("Internal server error");
     }
});

app.get("/read-todo", async(req, res)=>{
  const username=req.session.user.username;

     try {
      const todoDb= await todoModel.find({username});
      console.log(todoDb);
      return res.send({
        status:200,
        message:"Read Success",
        data:todoDb
      })
     } catch (error) {
      return res.send({
        status:500,
        Message:"Internal Server Error",
        error:error
      })
     }
    })

    app.post("/edit-todo", async(req, res)=>{
      const username=req.session.user.username;
     const {todoId, todoText}=req.body;

     try {
      const todoDb=await todoModel.findOne({_id:todoId});

      console.log(todoDb);
      if(username!==todoDb.username){
        return res.send("Authorisation failed");
      }
      const updatedTodoDb=await todoModel.updateOne({_id:todoId}, {$set: {todo:todoText}});
      console.log(updatedTodoDb);
      return res.status(201).json("Updated Successfully");
     } catch (error) {
      return res.status(500).json("Internal Server Error");
     }
    })

app.listen(PORT, () => {
  console.log(`server is running on PORT ${PORT}`);
});
